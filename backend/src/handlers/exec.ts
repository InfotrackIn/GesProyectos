import { newId } from "../lib/id.js";
import type { Principal } from "../lib/auth.js";
import { assertAdmin, assertCanAccessProcess } from "../lib/auth.js";
import { recordAudit } from "../lib/audit.js";
import { HttpError } from "../lib/response.js";
import * as repo from "../lib/repo.js";
import type {
  Alert,
  Cumplimiento,
  ExecKpi,
  ModuleSummary,
  Process,
  Severity,
  Task,
  WeeklyControl,
} from "../shared/types.js";

const PROCESSES: Process[] = ["PMO", "IMPL", "CSM", "IDI"];
const SEVERITIES: Severity[] = ["critico", "alto", "medio"];

/** Epica 8: etiqueta de cumplimiento a partir de valor y meta. */
export function cumplimiento(value: number, goal: number): { pct: number; label: Cumplimiento } {
  if (goal <= 0) return { pct: 0, label: "no_cumple" };
  const pct = Math.round((value / goal) * 1000) / 10;
  let label: Cumplimiento = "no_cumple";
  if (pct >= 100) label = "cumple";
  else if (pct >= 90) label = "cerca";
  return { pct, label };
}

export async function getPanel(_principal: Principal, month: string, processFilter: Process | "ALL") {
  const data = await repo.getExecPanel(month);

  const filterByProcess = <T extends { process: Process }>(arr: T[]) =>
    processFilter === "ALL" ? arr : arr.filter((x) => x.process === processFilter);

  const kpis = filterByProcess(data.kpis).map((k) => ({ ...k, ...cumplimiento(k.value, k.goal) }));
  const alerts = filterByProcess(data.alerts);
  const modules = filterByProcess(data.modules);
  const controls = filterByProcess(data.controls);
  const tasks = data.tasks;

  const met = kpis.filter((k) => k.label === "cumple").length;
  const summary = { month, process: processFilter, kpisMet: met, kpisTotal: kpis.length };

  return { summary, kpis, alerts, tasks, controls, modules };
}

// -------------------------------- KPIs --------------------------------

export async function upsertKpi(principal: Principal, body: Partial<ExecKpi>) {
  assertAdmin(principal);
  const process = normalizeProcess(body.process);
  if (!body.month) throw new HttpError(400, "El mes (yyyy-mm) es obligatorio");
  const kpi: ExecKpi = {
    id: body.id ?? newId(),
    process,
    month: body.month,
    name: body.name ?? "Indicador",
    value: num(body.value),
    goal: num(body.goal),
  };
  await repo.putKpi(kpi);
  await recordAudit(principal, {
    action: body.id ? "update" : "create",
    entityType: "kpi",
    entityId: kpi.id,
    entityName: kpi.name,
    process: kpi.process,
    summary: `${body.id ? "Actualizo" : "Creo"} el KPI "${kpi.name}" (${kpi.month})`,
  });
  return { ...kpi, ...cumplimiento(kpi.value, kpi.goal) };
}

export async function deleteKpi(principal: Principal, month: string, id: string) {
  assertAdmin(principal);
  await repo.deleteExecItem(month, `KPI#${id}`);
  await recordAudit(principal, {
    action: "delete",
    entityType: "kpi",
    entityId: id,
    summary: `Elimino un KPI del mes ${month}`,
  });
}

// ------------------------------- Alerts -------------------------------

export async function upsertAlert(principal: Principal, body: Partial<Alert> & { month?: string }) {
  const process = normalizeProcess(body.process);
  assertCanAccessProcess(principal, process);
  const month = requireMonth(body);
  const alert: Alert = {
    id: body.id ?? newId(),
    process,
    severity: normalizeSeverity(body.severity),
    title: body.title ?? "Alerta",
    description: body.description ?? "",
    valueAtRisk: body.valueAtRisk != null ? num(body.valueAtRisk) : undefined,
  };
  await repo.putAlert(alert, month);
  await recordAudit(principal, {
    action: body.id ? "update" : "create",
    entityType: "alert",
    entityId: alert.id,
    entityName: alert.title,
    process: alert.process,
    summary: `${body.id ? "Actualizo" : "Creo"} la alerta "${alert.title}"`,
  });
  return alert;
}

export async function deleteAlert(principal: Principal, month: string, id: string) {
  assertAdmin(principal);
  await repo.deleteExecItem(month, `ALERT#${id}`);
  await recordAudit(principal, {
    action: "delete",
    entityType: "alert",
    entityId: id,
    summary: `Elimino una alerta del mes ${month}`,
  });
}

// -------------------------------- Tasks -------------------------------

export async function upsertTask(principal: Principal, body: Partial<Task>) {
  assertAdmin(principal);
  if (!body.month) throw new HttpError(400, "El mes (yyyy-mm) es obligatorio");
  const task: Task = {
    id: body.id ?? newId(),
    month: body.month,
    title: body.title ?? "Tarea",
    moduleLabel: body.moduleLabel ?? "General",
    dueDate: body.dueDate || undefined,
  };
  await repo.putTask(task);
  await recordAudit(principal, {
    action: body.id ? "update" : "create",
    entityType: "exec_task",
    entityId: task.id,
    entityName: task.title,
    summary: `${body.id ? "Actualizo" : "Creo"} la tarea ejecutiva "${task.title}"`,
  });
  return task;
}

export async function deleteTask(principal: Principal, month: string, id: string) {
  assertAdmin(principal);
  await repo.deleteExecItem(month, `TASK#${id}`);
  await recordAudit(principal, {
    action: "delete",
    entityType: "exec_task",
    entityId: id,
    summary: `Elimino una tarea ejecutiva del mes ${month}`,
  });
}

// ---------------------------- Weekly control --------------------------

export async function upsertControl(principal: Principal, body: Partial<WeeklyControl>) {
  assertAdmin(principal);
  const process = normalizeProcess(body.process);
  if (!body.month || !body.week) throw new HttpError(400, "Mes y semana son obligatorios");
  const control: WeeklyControl = {
    id: body.id ?? newId(),
    month: body.month,
    week: body.week,
    process,
    team: body.team ?? "Equipo",
    responsibles: Array.isArray(body.responsibles) ? body.responsibles.map(String) : [],
    status: body.status === "alDia" ? "alDia" : "pendiente",
  };
  await repo.putControl(control);
  await recordAudit(principal, {
    action: body.id ? "update" : "create",
    entityType: "control",
    entityId: control.id,
    entityName: control.week,
    process: control.process,
    summary: `${body.id ? "Actualizo" : "Creo"} el control ${control.week} (${control.month})`,
  });
  return control;
}

export async function deleteControl(principal: Principal, month: string, id: string) {
  assertAdmin(principal);
  await repo.deleteExecItem(month, `CONTROL#${id}`);
  await recordAudit(principal, {
    action: "delete",
    entityType: "control",
    entityId: id,
    summary: `Elimino un control semanal del mes ${month}`,
  });
}

// ------------------------------ Modules -------------------------------

export async function upsertModule(principal: Principal, body: Partial<ModuleSummary>) {
  assertAdmin(principal);
  const process = normalizeProcess(body.process);
  if (!body.month) throw new HttpError(400, "El mes (yyyy-mm) es obligatorio");
  const mod: ModuleSummary = {
    process,
    month: body.month,
    totalProjects: num(body.totalProjects),
    breakdown: Array.isArray(body.breakdown) ? body.breakdown : [],
    metrics: Array.isArray(body.metrics) ? body.metrics : [],
    updateStatus:
      body.updateStatus === "alDia" || body.updateStatus === "enConstruccion"
        ? body.updateStatus
        : "pendiente",
  };
  await repo.putModule(mod);
  await recordAudit(principal, {
    action: "update",
    entityType: "module",
    entityId: `${mod.process}#${mod.month}`,
    entityName: mod.process,
    process: mod.process,
    summary: `Actualizo el modulo ${mod.process} (${mod.month})`,
  });
  return mod;
}

// ------------------------------ helpers -------------------------------

function normalizeProcess(value: unknown): Process {
  if (typeof value === "string" && PROCESSES.includes(value as Process)) return value as Process;
  throw new HttpError(400, `Proceso invalido. Use uno de: ${PROCESSES.join(", ")}`);
}

function normalizeSeverity(value: unknown): Severity {
  if (typeof value === "string" && SEVERITIES.includes(value as Severity)) return value as Severity;
  return "medio";
}

function requireMonth(body: { month?: string }): string {
  if (!body.month) throw new HttpError(400, "El mes (yyyy-mm) es obligatorio");
  return body.month;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
