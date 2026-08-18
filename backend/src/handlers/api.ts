import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { getPrincipal } from "../lib/auth.js";
import { HttpError, badRequest, noContent, notFound, ok, serverError } from "../lib/response.js";
import type { Process } from "../shared/types.js";
import * as projects from "./projects.js";
import * as surveys from "./surveys.js";
import * as overview from "./overview.js";
import * as exec from "./exec.js";
import * as schedule from "./schedule.js";
import * as audit from "./audit.js";
import { seed } from "./seed.js";

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  const method = event.requestContext.http.method;
  if (method === "OPTIONS") return noContent();

  try {
    const principal = getPrincipal(event);
    const path = event.rawPath.replace(/\/$/, "") || "/";
    const parts = path.split("/").filter(Boolean);
    const q = event.queryStringParameters ?? {};
    const body = parseBody(event.body);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const month = q.month ?? currentMonth;
    const processFilter = (q.process ?? "ALL") as Process | "ALL";

    // ------------------------------ health ------------------------------
    if (path === "/" || path === "/health") {
      return ok({ status: "ok", user: principal.email, role: principal.role });
    }
    if (path === "/me") {
      return ok({
        sub: principal.sub,
        email: principal.email,
        name: principal.name,
        role: principal.role,
        groups: principal.groups,
        allowedProcesses: principal.allowedProcesses,
      });
    }

    // --------------------------- projects -------------------------------
    if (parts[0] === "projects") {
      // /projects
      if (parts.length === 1) {
        if (method === "GET") return ok(await projects.list(principal));
        if (method === "POST") return ok(await projects.create(principal, body), 201);
      }
      // /projects/{id}
      if (parts.length === 2) {
        const id = parts[1];
        if (method === "GET") return ok(await projects.getOne(principal, id));
        if (method === "PUT") return ok(await projects.update(principal, id, body));
        if (method === "DELETE") {
          await projects.remove(principal, id);
          return noContent();
        }
      }
      // /projects/{id}/updates
      if (parts.length === 3 && parts[2] === "updates") {
        const id = parts[1];
        if (method === "GET") return ok(await projects.listUpdates(principal, id));
        if (method === "POST") return ok(await projects.addUpdate(principal, id, body), 201);
      }
      // /projects/{id}/schedule
      if (parts.length === 3 && parts[2] === "schedule") {
        const id = parts[1];
        if (method === "GET") return ok(await schedule.getSchedule(principal, id));
      }
      // /projects/{id}/schedule/template
      if (parts.length === 4 && parts[2] === "schedule" && parts[3] === "template" && method === "POST") {
        return ok(await schedule.applyTemplate(principal, parts[1]));
      }
      // /projects/{id}/schedule/phases
      if (parts.length === 4 && parts[2] === "schedule" && parts[3] === "phases") {
        const id = parts[1];
        if (method === "POST") return ok(await schedule.createPhase(principal, id, body), 201);
      }
      // /projects/{id}/schedule/phases/{phaseId}
      if (parts.length === 5 && parts[2] === "schedule" && parts[3] === "phases") {
        const id = parts[1];
        const phaseId = parts[4];
        if (method === "PUT") return ok(await schedule.updatePhase(principal, id, phaseId, body));
        if (method === "DELETE") {
          await schedule.removePhase(principal, id, phaseId);
          return noContent();
        }
      }
      // /projects/{id}/schedule/tasks
      if (parts.length === 4 && parts[2] === "schedule" && parts[3] === "tasks") {
        const id = parts[1];
        if (method === "POST") return ok(await schedule.createTask(principal, id, body), 201);
      }
      // /projects/{id}/schedule/tasks/{taskId}
      if (parts.length === 5 && parts[2] === "schedule" && parts[3] === "tasks") {
        const id = parts[1];
        const taskId = parts[4];
        if (method === "PUT") return ok(await schedule.updateTask(principal, id, taskId, body));
        if (method === "DELETE") {
          await schedule.removeTask(principal, id, taskId);
          return noContent();
        }
      }
      // /projects/{id}/evolutivos
      if (parts.length === 3 && parts[2] === "evolutivos" && method === "POST") {
        return ok(await schedule.createEvolutivo(principal, parts[1], body), 201);
      }
    }

    // ---------------------------- overview ------------------------------
    if (parts[0] === "overview" && method === "GET") {
      return ok(await overview.overview(principal, processFilter, month));
    }

    // ----------------------------- audit --------------------------------
    if (parts[0] === "audit" && method === "GET") {
      const limit = q.limit ? Number(q.limit) : 200;
      return ok(await audit.list(principal, Number.isFinite(limit) ? limit : 200));
    }

    // ---------------------------- surveys -------------------------------
    if (parts[0] === "surveys") {
      if (parts.length === 1) {
        if (method === "GET") return ok(await surveys.list(principal));
        if (method === "POST") return ok(await surveys.upsert(principal, body), 201);
      }
      if (parts.length === 2 && parts[1] === "sync" && method === "POST") {
        return ok(await surveys.syncFromSupabase(principal));
      }
    }

    // ------------------------------ exec --------------------------------
    if (parts[0] === "exec") {
      if (parts[1] === "panel" && method === "GET") {
        return ok(await exec.getPanel(principal, month, processFilter));
      }
      if (parts[1] === "kpis") {
        if (method === "POST" || method === "PUT") return ok(await exec.upsertKpi(principal, body));
        if (method === "DELETE" && parts[2]) {
          await exec.deleteKpi(principal, month, parts[2]);
          return noContent();
        }
      }
      if (parts[1] === "alerts") {
        if (method === "POST" || method === "PUT") return ok(await exec.upsertAlert(principal, body));
        if (method === "DELETE" && parts[2]) {
          await exec.deleteAlert(principal, month, parts[2]);
          return noContent();
        }
      }
      if (parts[1] === "tasks") {
        if (method === "POST" || method === "PUT") return ok(await exec.upsertTask(principal, body));
        if (method === "DELETE" && parts[2]) {
          await exec.deleteTask(principal, month, parts[2]);
          return noContent();
        }
      }
      if (parts[1] === "controls") {
        if (method === "POST" || method === "PUT") return ok(await exec.upsertControl(principal, body));
        if (method === "DELETE" && parts[2]) {
          await exec.deleteControl(principal, month, parts[2]);
          return noContent();
        }
      }
      if (parts[1] === "modules") {
        if (method === "POST" || method === "PUT") return ok(await exec.upsertModule(principal, body));
      }
    }

    // ------------------------------ seed --------------------------------
    if (path === "/seed" && method === "POST") {
      return ok(await seed(principal));
    }

    return notFound(`Ruta no encontrada: ${method} ${path}`);
  } catch (err) {
    if (err instanceof HttpError) {
      return ok({ error: err.message }, err.statusCode);
    }
    if (err instanceof SyntaxError) return badRequest("JSON invalido");
    console.error("Error no controlado", err);
    return serverError(err instanceof Error ? err.message : "Error interno");
  }
}

function parseBody(raw: string | undefined): Record<string, any> {
  if (!raw) return {};
  return JSON.parse(raw);
}
