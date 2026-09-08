#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { GesProyectosStack } from "../lib/app-stack";

const app = new cdk.App();

new GesProyectosStack(app, "GesProyectos", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
  description: "Plataforma de Seguimiento de Proyectos (PMO / Implementacion / CSM / I+D+I)",
});
