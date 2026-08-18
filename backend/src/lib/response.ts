import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Content-Type": "application/json",
};

export function ok(body: unknown, statusCode = 200): APIGatewayProxyStructuredResultV2 {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

export function noContent(): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 204, headers: CORS, body: "" };
}

export function badRequest(message: string) {
  return ok({ error: message }, 400);
}

export function forbidden(message = "No autorizado") {
  return ok({ error: message }, 403);
}

export function notFound(message = "No encontrado") {
  return ok({ error: message }, 404);
}

export function serverError(message = "Error interno") {
  return ok({ error: message }, 500);
}

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}
