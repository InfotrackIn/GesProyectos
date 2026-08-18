import { newId } from "../lib/id.js";
import type { Principal } from "../lib/auth.js";
import { actorFields, actorName, assertCanAccessProcess, visibleProcesses } from "../lib/auth.js";
import { recordAudit } from "../lib/audit.js";
import { HttpError } from "../lib/response.js";
import * as repo from "../lib/repo.js";
import { computeCost } from "../domain/costs.js";
import { computeDateSlip } from "../domain/dates.js";
import { computeProgress, scheduleProgress } from "../domain/progress.js";
import type {
  Process,
  Project,
  ProjectPhase,
  ProjectStatus,
  ProgressMode,
  WeeklyUpdate,
} from "../shared/types.js";

const PROCESSES: Process[] = ["PMO", "IMPL", "CSM"];
const STATUSES: ProjectStatus[] = ["control", "riesgo", "critico"];
const PHASES: ProjectPhase[] = ["sin_iniciar", "en_progreso", "standby", "completado"];

/** Proyecto enriquecido con avance, costos y desfase de fechas (para el frontend). */
export function decorate(p: Project) {
  const normalized = normalizeProject(p);
  return {
    ...normalized,
    computed: {
      ...computeProgress(normalized),
      cost: computeCost(normalized),
      dates: computeDateSlip(normalized),
    },
  };
}

/** Compatibilidad con proyectos creados antes de phase/owner/kind/endDateDeal. */
function normalizeProject(p: Project): Project {
  const endDatePlanned = p.endDatePlanned;
  const endDateDeal = p.endDateDeal?.trim() || endDatePlanned;
  const wasAuto = p.progressMode !== "manual";
  const manualProgress = wasAuto
    ? scheduleProgress(p.startDate, endDatePlanned)
    : p.manualProgress ?? 0;
  return {
    ...p,
    phase: p.phase && PHASES.includes(p.phase) ? p.phase : "en_progreso",
    owner: p.owner ?? "",
    kind: p.kind === "evolutivo" ? "evolutivo" : "proyecto",
    endDateDeal,
    progressMode: "manual",
    manualProgress,
  };
}

export async function list(principal: Principal) {
  const all = await repo.listProjects();
  const allowed = visibleProcesses(principal);
  const visible = all.filter((p) => allowed.includes(p.process));
  return visible.map(decorate);
}

export async function getOne(principal: Principal, id: string) {
  const p = await repo.getProject(id);
  if (!p) throw new HttpError(404, "Proyecto no encontrado");
  assertCanAccessProcess(principal, p.process);
  const updates = await repo.listUpdates(id);
  return { ...decorate(p), updates };
}

export async function create(principal: Principal, body: Partial<Project>) {
  const process = normalizeProcess(body.process);
  assertCanAccessProcess(principal, process);

  const now = new Date().toISOString();
  const startDate = body.startDate ?? isoDate(new Date());
  const endDatePlanned = body.endDatePlanned ?? isoDate(addDays(new Date(), 90));
  const endDateDeal = body.endDateDeal?.trim() || endDatePlanned;
  assertDateOrder(startDate, endDatePlanned, "tentativa");
  assertDateOrder(startDate, endDateDeal, "deal");

  const project: Project = {
    id: newId(),
    name: (body.name ?? "Nuevo proyecto").trim(),
    category: body.category ?? "General",
    process,
    status: normalizeStatus(body.status),
    phase: normalizePhase(body.phase),
    owner: (body.owner ?? "").trim(),
    kind: "proyecto",
    startDate,
    endDatePlanned,
    endDateDeal,
    progressMode: "manual",
    manualProgress: clampPct(body.manualProgress, 0),
    plannedSetupCost: clampMoney(body.plannedSetupCost, 0),
    plannedRecurringCost: clampMoney(body.plannedRecurringCost, 0),
    realCost: clampMoney(body.realCost, 0),
    monthlyRevenue: clampMoney(body.monthlyRevenue, 0),
    totalValue: clampMoney(body.totalValue, 0),
    createdAt: now,
    updatedAt: now,
    createdById: principal.sub,
    createdByName: actorName(principal),
    updatedById: principal.sub,
    updatedByName: actorName(principal),
  };
  await repo.putProject(project);
  await recordAudit(principal, {
    action: "create",
    entityType: "project",
    entityId: project.id,
    entityName: project.name,
    projectId: project.id,
    projectName: project.name,
    process: project.process,
    summary: `Creo el proyecto "${project.name}"`,
  });
  return decorate(project);
}

export async function update(principal: Principal, id: string, body: Partial<Project>) {
  const existing = await repo.getProject(id);
  if (!existing) throw new HttpError(404, "Proyecto no encontrado");
  assertCanAccessProcess(principal, existing.process);

  const nextProcess = body.process ? normalizeProcess(body.process) : existing.process;
  assertCanAccessProcess(principal, nextProcess);
  const base = normalizeProject(existing);

  const startDate = body.startDate ?? base.startDate;
  const endDatePlanned = body.endDatePlanned ?? base.endDatePlanned;
  const endDateDeal =
    body.endDateDeal !== undefined
      ? String(body.endDateDeal).trim() || endDatePlanned
      : base.endDateDeal || endDatePlanned;
  assertDateOrder(startDate, endDatePlanned, "tentativa");
  assertDateOrder(startDate, endDateDeal, "deal");

  const merged: Project = {
    ...base,
    name: body.name?.trim() ?? base.name,
    category: body.category ?? base.category,
    process: nextProcess,
    status: body.status ? normalizeStatus(body.status) : base.status,
    phase: body.phase ? normalizePhase(body.phase) : base.phase,
    owner: body.owner !== undefined ? String(body.owner).trim() : base.owner,
    startDate,
    endDatePlanned,
    endDateDeal,
    progressMode: "manual",
    manualProgress:
      body.manualProgress != null ? clampPct(body.manualProgress, base.manualProgress) : base.manualProgress,
    plannedSetupCost:
      body.plannedSetupCost != null ? clampMoney(body.plannedSetupCost, base.plannedSetupCost) : base.plannedSetupCost,
    plannedRecurringCost:
      body.plannedRecurringCost != null
        ? clampMoney(body.plannedRecurringCost, base.plannedRecurringCost)
        : base.plannedRecurringCost,
    realCost: body.realCost != null ? clampMoney(body.realCost, base.realCost) : base.realCost,
    monthlyRevenue:
      body.monthlyRevenue != null ? clampMoney(body.monthlyRevenue, base.monthlyRevenue) : base.monthlyRevenue,
    totalValue: body.totalValue != null ? clampMoney(body.totalValue, base.totalValue) : base.totalValue,
    updatedAt: new Date().toISOString(),
    updatedById: principal.sub,
    updatedByName: actorName(principal),
  };
  await repo.putProject(merged);
  await recordAudit(principal, {
    action: "update",
    entityType: "project",
    entityId: merged.id,
    entityName: merged.name,
    projectId: merged.id,
    projectName: merged.name,
    process: merged.process,
    summary: `Actualizo el proyecto "${merged.name}"${diffSummary(base, merged)}`,
  });
  return decorate(merged);
}

export async function remove(principal: Principal, id: string) {
  const existing = await repo.getProject(id);
  if (!existing) throw new HttpError(404, "Proyecto no encontrado");
  assertCanAccessProcess(principal, existing.process);
  await repo.deleteProject(id);
  await recordAudit(principal, {
    action: "delete",
    entityType: "project",
    entityId: existing.id,
    entityName: existing.name,
    projectId: existing.id,
    projectName: existing.name,
    process: existing.process,
    summary: `Elimino el proyecto "${existing.name}"`,
  });
}

// --------------------------- Weekly updates ---------------------------

export interface WeeklyUpdateInput extends Partial<WeeklyUpdate> {
  progressMode?: ProgressMode;
  manualProgress?: number;
  owner?: string;
}

export async function listUpdates(principal: Principal, projectId: string) {
  const p = await repo.getProject(projectId);
  if (!p) throw new HttpError(404, "Proyecto no encontrado");
  assertCanAccessProcess(principal, p.process);
  return repo.listUpdates(projectId);
}

export async function addUpdate(principal: Principal, projectId: string, body: WeeklyUpdateInput) {
  const existing = await repo.getProject(projectId);
  if (!existing) throw new HttpError(404, "Proyecto no encontrado");
  assertCanAccessProcess(principal, existing.process);
  const p = normalizeProject(existing);

  const status = body.status ? normalizeStatus(body.status) : p.status;
  const phase = body.phase ? normalizePhase(body.phase) : p.phase;
  const owner = body.owner !== undefined ? String(body.owner).trim() : p.owner;

  let manualProgress = p.manualProgress;
  if (body.manualProgress != null) {
    manualProgress = clampPct(body.manualProgress, p.manualProgress);
  } else if (body.progress != null) {
    manualProgress = clampPct(body.progress, p.manualProgress);
  }

  const patched: Project = {
    ...p,
    status,
    phase,
    owner,
    progressMode: "manual",
    manualProgress,
    updatedAt: new Date().toISOString(),
    updatedById: principal.sub,
    updatedByName: actorName(principal),
  };

  const progress =
    body.progress != null
      ? clampPct(body.progress, computeProgress(patched).progress)
      : computeProgress(patched).progress;

  const actor = actorFields(principal);
  const update: WeeklyUpdate = {
    projectId,
    date: new Date().toISOString(),
    status,
    phase,
    currentStatus: body.currentStatus ?? "",
    nextSteps: body.nextSteps ?? "",
    progress,
    note: body.note ?? "",
    authorId: actor.actorId,
    authorName: actor.actorName,
    authorEmail: actor.actorEmail,
  };
  await repo.putUpdate(update);
  await repo.putProject({ ...patched, updatedAt: update.date });
  const hasComment = Boolean(update.note || update.currentStatus);
  await recordAudit(principal, {
    action: hasComment ? "comment" : "update",
    entityType: "weekly_update",
    entityId: `${projectId}#${update.date}`,
    entityName: p.name,
    projectId,
    projectName: p.name,
    process: p.process,
    summary: hasComment
      ? `Comento en "${p.name}": ${snippet(update.note || update.currentStatus)}`
      : `Actualizo seguimiento de "${p.name}" (avance ${progress}%)`,
  });
  return update;
}

// ------------------------------ helpers ------------------------------

function normalizeProcess(value: unknown): Process {
  if (typeof value === "string" && PROCESSES.includes(value as Process)) {
    return value as Process;
  }
  throw new HttpError(400, `Proceso invalido. Use uno de: ${PROCESSES.join(", ")}`);
}

function normalizeStatus(value: unknown): ProjectStatus {
  if (typeof value === "string" && STATUSES.includes(value as ProjectStatus)) {
    return value as ProjectStatus;
  }
  return "control";
}

function normalizePhase(value: unknown): ProjectPhase {
  if (typeof value === "string" && PHASES.includes(value as ProjectPhase)) {
    return value as ProjectPhase;
  }
  return "en_progreso";
}

function assertDateOrder(start: string, end: string, label: string) {
  if (end < start) {
    throw new HttpError(400, `La fecha ${label} no puede ser anterior a la fecha de inicio`);
  }
}

/** Avance / porcentajes: 0–100, permite decimales. */
function clampPct(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

/** Costos / montos: >= 0, hasta 2 decimales (sin tope artificial). */
function clampMoney(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.max(0, n) * 100) / 100;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function snippet(text: string, max = 80): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function diffSummary(before: Project, after: Project): string {
  const fields: { key: keyof Project; label: string }[] = [
    { key: "name", label: "nombre" },
    { key: "status", label: "salud" },
    { key: "phase", label: "estado" },
    { key: "owner", label: "responsable" },
    { key: "manualProgress", label: "avance" },
    { key: "endDatePlanned", label: "tentativa" },
    { key: "endDateDeal", label: "deal" },
    { key: "realCost", label: "costo real" },
  ];
  const changes = fields
    .filter((f) => String(before[f.key] ?? "") !== String(after[f.key] ?? ""))
    .map((f) => f.label);
  return changes.length ? ` (${changes.join(", ")})` : "";
}
