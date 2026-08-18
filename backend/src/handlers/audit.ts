import type { Principal } from "../lib/auth.js";
import { visibleProcesses } from "../lib/auth.js";
import * as repo from "../lib/repo.js";

export async function list(principal: Principal, limit?: number) {
  const items = await repo.listAudit(limit ?? 200);
  const allowed = visibleProcesses(principal);
  return items.filter((e) => !e.process || allowed.includes(e.process));
}
