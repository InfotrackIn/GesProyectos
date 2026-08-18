#!/usr/bin/env node
// Sube el build del frontend a S3 e invalida CloudFront usando los outputs del stack.
import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const distDir = join(root, "frontend", "dist");
const outputsFile = join(__dirname, "..", "cdk-outputs.json");

if (!existsSync(distDir)) {
  console.error("No existe frontend/dist. Ejecuta primero: npm run build --workspace frontend");
  process.exit(1);
}
if (!existsSync(outputsFile)) {
  console.error("No existe infra/cdk-outputs.json. Despliega primero con: npm run deploy (usa --outputs-file)");
  process.exit(1);
}

const outputs = JSON.parse(readFileSync(outputsFile, "utf8")).GesProyectos;
const region = outputs.Region;
const bucket = outputs.SiteBucketName;
const distributionId = outputs.DistributionId;

const s3 = new S3Client({ region });
const cf = new CloudFrontClient({ region });

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const files = walk(distDir);
console.log(`Subiendo ${files.length} archivos a s3://${bucket} ...`);
for (const file of files) {
  const key = relative(distDir, file).split("\\").join("/");
  const ext = key.slice(key.lastIndexOf("."));
  const isImmutable = key.startsWith("assets/");
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: readFileSync(file),
      ContentType: MIME[ext] ?? "application/octet-stream",
      CacheControl: isImmutable ? "public,max-age=31536000,immutable" : "no-cache",
    })
  );
}

// Genera y sube config.js en runtime con los valores reales del stack.
const runtimeConfig = `window.APP_CONFIG = ${JSON.stringify(
  {
    apiUrl: outputs.ApiUrl,
    region: outputs.Region,
  },
  null,
  2
)};\n`;
await s3.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: "config.js",
    Body: runtimeConfig,
    ContentType: "application/javascript",
    CacheControl: "no-cache",
  })
);
console.log("config.js generado con los outputs del stack.");

console.log(`Invalidando CloudFront ${distributionId} ...`);
await cf.send(
  new CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `deploy-${Date.now()}`,
      Paths: { Quantity: 1, Items: ["/*"] },
    },
  })
);

console.log(`Frontend desplegado: ${outputs.CloudFrontUrl}`);
