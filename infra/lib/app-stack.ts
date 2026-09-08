import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { HttpApi, CorsHttpMethod, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";

const BACKEND = path.resolve(__dirname, "../../backend");

const AZURE_TENANT_ID = "1a39273c-ac3c-41bb-b3ce-a05f0021b153";
const AZURE_CLIENT_ID = "83526f1b-9347-4213-a72c-65700464c817";
const AZURE_ADMIN_GROUP_ID = "5e362b7a-7539-4b0f-87ef-acb878e9deeb";
const AZURE_ACCESS_GROUP_ID = "090658b1-85fc-4026-a82c-1d549258d213";

export class GesProyectosStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ----------------------------- DynamoDB -----------------------------
    const table = new dynamodb.Table(this, "Table", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
    });

    // ------------------------------ Cognito -----------------------------
    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "gesproyectos-users",
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = userPool.addClient("WebClient", {
      userPoolClientName: "gesproyectos-web",
      authFlows: { userSrp: true, userPassword: true },
      accessTokenValidity: cdk.Duration.hours(8),
      idTokenValidity: cdk.Duration.hours(8),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
    });

    new cognito.CfnUserPoolGroup(this, "AdminGroup", {
      userPoolId: userPool.userPoolId,
      groupName: "Administrador",
      description: "Acceso completo a todos los procesos (PMO, Implementacion, CSM, I+D+I)",
    });
    new cognito.CfnUserPoolGroup(this, "ImplGroup", {
      userPoolId: userPool.userPoolId,
      groupName: "Implementador",
      description: "Solo visualiza y edita proyectos de Implementacion Interna",
    });

    // -------------------- SSM: config Supabase (Epica 6) ----------------
    const supabaseUrlParam = new ssm.StringParameter(this, "SupabaseUrl", {
      parameterName: "/gesproyectos/supabase/url",
      stringValue: "PENDIENTE",
      description: "URL del proyecto Supabase de encuestas (solo lectura)",
    });
    const supabaseKeyParam = new ssm.StringParameter(this, "SupabaseAnonKey", {
      parameterName: "/gesproyectos/supabase/anon_key",
      stringValue: "PENDIENTE",
      description: "Anon key publica del proyecto Supabase de encuestas",
    });
    const supabaseTableParam = new ssm.StringParameter(this, "SupabaseTable", {
      parameterName: "/gesproyectos/supabase/table",
      stringValue: "surveys",
      description: "Tabla/vista de Supabase con los datos de encuestas",
    });

    // ------------------------------ Lambda ------------------------------
    const apiFn = new NodejsFunction(this, "ApiFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(BACKEND, "src/handlers/api.ts"),
      handler: "handler",
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      environment: {
        TABLE_NAME: table.tableName,
        SUPABASE_URL_PARAM: supabaseUrlParam.parameterName,
        SUPABASE_ANON_KEY_PARAM: supabaseKeyParam.parameterName,
        SUPABASE_TABLE_PARAM: supabaseTableParam.parameterName,
        AZURE_ADMIN_GROUP_IDS: AZURE_ADMIN_GROUP_ID,
        AZURE_ACCESS_GROUP_IDS: AZURE_ACCESS_GROUP_ID,
      },
      bundling: {
        format: cdk.aws_lambda_nodejs.OutputFormat.ESM,
        target: "node20",
        minify: true,
      },
    });

    table.grantReadWriteData(apiFn);
    supabaseUrlParam.grantRead(apiFn);
    supabaseKeyParam.grantRead(apiFn);
    supabaseTableParam.grantRead(apiFn);

    // --------------------------- HTTP API -------------------------------
    const authorizer = new HttpJwtAuthorizer(
      "JwtAuthorizer",
      `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`,
      {
        jwtAudience: [AZURE_CLIENT_ID, `api://${AZURE_CLIENT_ID}`],
      }
    );

    const httpApi = new HttpApi(this, "HttpApi", {
      apiName: "gesproyectos-api",
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PUT,
          CorsHttpMethod.DELETE,
          CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const integration = new HttpLambdaIntegration("ApiIntegration", apiFn);
    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE],
      integration,
      authorizer,
    });

    // ---------------------- Hosting: S3 + CloudFront --------------------
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html" },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html" },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // ------------------------------ Outputs -----------------------------
    new cdk.CfnOutput(this, "Region", { value: this.region });
    new cdk.CfnOutput(this, "ApiUrl", { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "SiteBucketName", { value: siteBucket.bucketName });
    new cdk.CfnOutput(this, "DistributionId", { value: distribution.distributionId });
    new cdk.CfnOutput(this, "CloudFrontUrl", { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, "TableName", { value: table.tableName });
  }
}
