import type { Principal } from "../lib/auth.js";
import { visibleProcesses } from "../lib/auth.js";
import { recordAudit } from "../lib/audit.js";
import { HttpError } from "../lib/response.js";
import * as repo from "../lib/repo.js";
import { getSupabaseConfig } from "../lib/ssm.js";
import { SURVEY_PROCESSES, type Process, type Survey } from "../shared/types.js";

const PROCESSES: Process[] = ["PMO", "IMPL", "CSM"];

export async function list(principal: Principal) {
  const all = await repo.listSurveys();
  const allowed = visibleProcesses(principal);
  return all.filter((s) => allowed.includes(s.process) && SURVEY_PROCESSES.includes(s.process));
}

export async function upsert(principal: Principal, body: Partial<Survey>) {
  const process = normalizeProcess(body.process);
  if (!SURVEY_PROCESSES.includes(process)) {
    throw new HttpError(400, "Implementacion Interna no maneja indicadores de satisfaccion");
  }
  if (!body.period) throw new HttpError(400, "El periodo (yyyy-mm) es obligatorio");

  const survey: Survey = {
    process,
    period: body.period,
    nps: num(body.nps),
    responses: num(body.responses),
    csat: num(body.csat),
    promoters: num(body.promoters),
    passives: num(body.passives),
    detractors: num(body.detractors),
    source: "manual",
    updatedAt: new Date().toISOString(),
  };
  await repo.putSurvey(survey);
  await recordAudit(principal, {
    action: "update",
    entityType: "survey",
    entityId: `${survey.process}#${survey.period}`,
    entityName: `${survey.process} ${survey.period}`,
    process: survey.process,
    summary: `Actualizo encuestas de ${survey.process} (${survey.period})`,
  });
  return survey;
}

/**
 * Epica 6: sincroniza encuestas desde el Supabase externo (solo lectura).
 * Si no hay credenciales configuradas devuelve configured=false.
 */
export async function syncFromSupabase(_principal: Principal) {
  const config = await getSupabaseConfig();
  if (!config) {
    return { configured: false, imported: 0, message: "Supabase no configurado (modo manual)" };
  }

  const endpoint = `${config.url}/rest/v1/${config.table}?select=*`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
  });
  if (!res.ok) {
    throw new HttpError(502, `Supabase respondio ${res.status}`);
  }
  const rows = (await res.json()) as Record<string, unknown>[];

  let imported = 0;
  for (const row of rows) {
    const process = mapProcess(row.process ?? row.proceso);
    if (!process || !SURVEY_PROCESSES.includes(process)) continue;
    const period = String(row.period ?? row.periodo ?? "");
    if (!period) continue;

    const survey: Survey = {
      process,
      period,
      nps: num(row.nps),
      responses: num(row.responses ?? row.respuestas),
      csat: num(row.csat),
      promoters: num(row.promoters ?? row.promotores),
      passives: num(row.passives ?? row.pasivos),
      detractors: num(row.detractors ?? row.detractores),
      source: "supabase",
      updatedAt: new Date().toISOString(),
    };
    await repo.putSurvey(survey);
    imported++;
  }
  return { configured: true, imported };
}

function normalizeProcess(value: unknown): Process {
  if (typeof value === "string" && PROCESSES.includes(value as Process)) {
    return value as Process;
  }
  throw new HttpError(400, `Proceso invalido. Use uno de: ${PROCESSES.join(", ")}`);
}

function mapProcess(value: unknown): Process | null {
  if (typeof value !== "string") return null;
  const v = value.toUpperCase();
  if (v.includes("PMO")) return "PMO";
  if (v.includes("CSM")) return "CSM";
  if (v.includes("IMPL")) return "IMPL";
  return null;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
