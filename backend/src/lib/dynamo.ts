import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

export const TABLE = process.env.TABLE_NAME as string;
export const GSI1 = "GSI1";

export const SLA_TABLE = process.env.SLA_TABLE_NAME as string;
export const SLA_PROYECTO_INDEX = "ProyectoIndex";
