import type { Principal } from "./auth.js";
import { actorFields } from "./auth.js";
import { newId } from "./id.js";
import * as repo from "./repo.js";
import type { AuditAction, AuditEntityType, AuditEvent, Process } from "../shared/types.js";

export interface AuditInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  projectId?: string;
  projectName?: string;
  process?: Process;
  summary: string;
}

export async function recordAudit(principal: Principal, input: AuditInput): Promise<void> {
  const at = new Date().toISOString();
  const event: AuditEvent = {
    id: newId(),
    at,
    ...actorFields(principal),
    ...input,
  };
  try {
    await repo.putAudit(event);
  } catch (err) {
    console.error("No se pudo registrar auditoria", err);
  }
}
