import { randomUUID } from "node:crypto";

/** Identificador ordenable por tiempo: prefijo temporal + uuid corto. */
export function newId(): string {
  return `${Date.now().toString(36)}${randomUUID().slice(0, 12)}`;
}
