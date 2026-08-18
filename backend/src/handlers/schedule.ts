import { newId } from "../lib/id.js";
import type { Principal } from "../lib/auth.js";
import { actorName, assertCanAccessProcess } from "../lib/auth.js";
import { recordAudit } from "../lib/audit.js";
import { HttpError } from "../lib/response.js";
import * as repo from "../lib/repo.js";
import { summarizeSchedule } from "../domain/schedule.js";
import { businessDaysBetween, todayIso } from "../domain/businessDays.js";
import type {
  Project,
  ScheduleItemStatus,
  SchedulePhase,
  ScheduleTask,
} from "../shared/types.js";
import { STANDARD_PHASE_TEMPLATE as PHASE_TEMPLATE } from "../shared/types.js";

const STATUSES: ScheduleItemStatus[] = ["pendiente", "en_progreso", "completada", "cancelada"];

async function loadSummary(projectId: string) {
  const project = await repo.getProject(projectId);
  if (!project) throw new HttpError(404, "Proyecto no encontrado");
  const phases = await repo.listSchedulePhases(projectId);
  let tasks = await repo.listScheduleTasks(projectId);

  // Migracion: tareas sin fase se agrupan en "General"
  const orphans = tasks.filter((t) => !t.phaseId);
  if (orphans.length > 0) {
    let general = phases.find((p) => p.name === "General");
    if (!general) {
      const now = new Date().toISOString();
      general = {
        id: newId(),
        projectId,
        name: "General",
        description: "Fase creada automaticamente para tareas existentes",
        startDate: project.startDate,
        endDate: project.endDatePlanned,
        status: "en_progreso",
        weight: 1,
        order: 0,
        createdAt: now,
        updatedAt: now,
      };
      await repo.putSchedulePhase(general);
      phases.push(general);
    }
    for (const t of orphans) {
      const fixed = { ...t, phaseId: general.id };
      await repo.putScheduleTask(fixed);
    }
    tasks = await repo.listScheduleTasks(projectId);
  }

  const summary = summarizeSchedule(phases, tasks, project.startDate, project.endDatePlanned);
  return { project, summary };
}

function projectDto(project: Project) {
  return {
    id: project.id,
    name: project.name,
    process: project.process,
    owner: project.owner ?? "",
    phase: project.phase,
    kind: project.kind ?? "proyecto",
    parentProjectId: project.parentProjectId,
    evolutivoSeq: project.evolutivoSeq,
    startDate: project.startDate,
    endDatePlanned: project.endDatePlanned,
    endDateDeal: project.endDateDeal || project.endDatePlanned,
    plannedBusinessDays: businessDaysBetween(project.startDate, project.endDatePlanned),
    canCreateEvolutivo: (project.phase ?? "") === "completado" && (project.kind ?? "proyecto") !== undefined,
  };
}

export async function getSchedule(principal: Principal, projectId: string) {
  const project = await repo.getProject(projectId);
  if (!project) throw new HttpError(404, "Proyecto no encontrado");
  assertCanAccessProcess(principal, project.process);

  const { summary } = await loadSummary(projectId);
  const evolutivos = (await repo.listProjects()).filter((p) => p.parentProjectId === projectId);

  return {
    project: {
      ...projectDto(project),
      canCreateEvolutivo: project.phase === "completado",
    },
    evolutivos: evolutivos.map((e) => ({
      id: e.id,
      name: e.name,
      evolutivoSeq: e.evolutivoSeq,
      phase: e.phase,
      status: e.status,
    })),
    asOf: todayIso(),
    summary,
  };
}

// ------------------------------ Phases --------------------------------

export async function createPhase(principal: Principal, projectId: string, body: Partial<SchedulePhase>) {
  const project = await requireProject(principal, projectId);
  if (!body.name?.trim()) throw new HttpError(400, "El nombre de la fase es obligatorio");

  const existing = await repo.listSchedulePhases(projectId);
  const startDate = body.startDate || project.startDate;
  const endDate = body.endDate || project.endDatePlanned;
  if (endDate < startDate) throw new HttpError(400, "La fecha fin no puede ser anterior a la fecha inicio");

  const now = new Date().toISOString();
  const status = normalizeStatus(body.status);
  const phase: SchedulePhase = {
    id: newId(),
    projectId,
    name: body.name.trim(),
    description: body.description?.trim() ?? "",
    startDate,
    endDate,
    status,
    completedAt: status === "completada" ? body.completedAt || todayIso() : undefined,
    weight: clampWeight(body.weight),
    order: body.order ?? existing.length + 1,
    createdAt: now,
    updatedAt: now,
  };
  await repo.putSchedulePhase(phase);
  await recordAudit(principal, {
    action: "create",
    entityType: "schedule_phase",
    entityId: phase.id,
    entityName: phase.name,
    projectId,
    projectName: project.name,
    process: project.process,
    summary: `Creo la fase "${phase.name}" en "${project.name}"`,
  });
  const { summary } = await loadSummary(projectId);
  return { phase: summary.phases.find((p) => p.id === phase.id), summary };
}

export async function updatePhase(
  principal: Principal,
  projectId: string,
  phaseId: string,
  body: Partial<SchedulePhase>
) {
  const project = await requireProject(principal, projectId);
  const existing = await repo.getSchedulePhase(projectId, phaseId);
  if (!existing) throw new HttpError(404, "Fase no encontrada");

  // Gate: no iniciar una fase si la anterior no esta cerrada
  if (body.status === "en_progreso" || body.status === "completada") {
    const all = (await repo.listSchedulePhases(projectId)).sort((a, b) => a.order - b.order);
    const idx = all.findIndex((p) => p.id === phaseId);
    if (idx > 0) {
      const prev = all[idx - 1];
      const prevTasks = (await repo.listScheduleTasks(projectId)).filter((t) => t.phaseId === prev.id);
      const prevDone =
        prev.status === "completada" ||
        prev.status === "cancelada" ||
        (prevTasks.length > 0 &&
          prevTasks.every((t) => t.status === "completada" || t.status === "cancelada"));
      if (!prevDone) {
        throw new HttpError(
          400,
          `No se puede avanzar la fase "${existing.name}": la fase anterior "${prev.name}" no esta cerrada (phase-gate).`
        );
      }
    }
  }

  const startDate = body.startDate ?? existing.startDate;
  const endDate = body.endDate ?? existing.endDate;
  if (endDate < startDate) throw new HttpError(400, "La fecha fin no puede ser anterior a la fecha inicio");

  const status = body.status ? normalizeStatus(body.status) : existing.status;
  const phase: SchedulePhase = {
    ...existing,
    name: body.name?.trim() ?? existing.name,
    description: body.description !== undefined ? String(body.description).trim() : existing.description,
    startDate,
    endDate,
    status,
    completedAt: status === "completada" ? body.completedAt || existing.completedAt || todayIso() : undefined,
    weight: body.weight != null ? clampWeight(body.weight) : existing.weight,
    order: body.order ?? existing.order,
    updatedAt: new Date().toISOString(),
  };
  await repo.putSchedulePhase(phase);
  await recordAudit(principal, {
    action: "update",
    entityType: "schedule_phase",
    entityId: phase.id,
    entityName: phase.name,
    projectId,
    projectName: project.name,
    process: project.process,
    summary: `Actualizo la fase "${phase.name}" en "${project.name}"`,
  });
  const { summary } = await loadSummary(projectId);
  return { phase: summary.phases.find((p) => p.id === phase.id), summary };
}

export async function removePhase(principal: Principal, projectId: string, phaseId: string) {
  const project = await requireProject(principal, projectId);
  const existing = await repo.getSchedulePhase(projectId, phaseId);
  if (!existing) throw new HttpError(404, "Fase no encontrada");
  const tasks = (await repo.listScheduleTasks(projectId)).filter((t) => t.phaseId === phaseId);
  if (tasks.length > 0) {
    throw new HttpError(400, "No se puede eliminar una fase con tareas. Mueve o elimina las tareas primero.");
  }
  await repo.deleteSchedulePhase(projectId, phaseId);
  await recordAudit(principal, {
    action: "delete",
    entityType: "schedule_phase",
    entityId: existing.id,
    entityName: existing.name,
    projectId,
    projectName: project.name,
    process: project.process,
    summary: `Elimino la fase "${existing.name}" de "${project.name}"`,
  });
}

/** Aplica plantilla estandar de fases (si el proyecto no tiene fases). */
export async function applyTemplate(principal: Principal, projectId: string) {
  const project = await requireProject(principal, projectId);
  const existing = await repo.listSchedulePhases(projectId);
  if (existing.length > 0) {
    throw new HttpError(400, "El proyecto ya tiene fases. Eliminalas antes de aplicar la plantilla.");
  }

  const now = new Date().toISOString();
  const total = PHASE_TEMPLATE.length;
  const start = new Date(project.startDate + "T12:00:00Z");
  const end = new Date(project.endDatePlanned + "T12:00:00Z");
  const span = Math.max(1, end.getTime() - start.getTime());

  const created: SchedulePhase[] = [];
  for (let i = 0; i < total; i++) {
    const tpl = PHASE_TEMPLATE[i];
    const segStart = new Date(start.getTime() + (span * i) / total);
    const segEnd = new Date(start.getTime() + (span * (i + 1)) / total - 86400000);
    if (segEnd < segStart) segEnd.setTime(segStart.getTime());
    const phase: SchedulePhase = {
      id: newId(),
      projectId,
      name: tpl.name,
      description: tpl.description,
      startDate: segStart.toISOString().slice(0, 10),
      endDate: i === total - 1 ? project.endDatePlanned : segEnd.toISOString().slice(0, 10),
      status: i === 0 ? "en_progreso" : "pendiente",
      weight: tpl.weight,
      order: i + 1,
      createdAt: now,
      updatedAt: now,
    };
    await repo.putSchedulePhase(phase);
    created.push(phase);
  }

  await recordAudit(principal, {
    action: "create",
    entityType: "schedule_phase",
    entityId: projectId,
    entityName: project.name,
    projectId,
    projectName: project.name,
    process: project.process,
    summary: `Aplico plantilla de fases en "${project.name}" (${created.length} fases)`,
  });
  const { summary } = await loadSummary(projectId);
  return { created: created.length, summary };
}

// ------------------------------ Tasks ---------------------------------

export async function createTask(principal: Principal, projectId: string, body: Partial<ScheduleTask>) {
  const project = await requireProject(principal, projectId);
  if (!body.name?.trim()) throw new HttpError(400, "El nombre de la tarea es obligatorio");
  if (!body.phaseId) throw new HttpError(400, "La tarea debe pertenecer a una fase");

  const phase = await repo.getSchedulePhase(projectId, body.phaseId);
  if (!phase) throw new HttpError(404, "Fase no encontrada");

  // Gate: no agregar trabajo activo a fase bloqueada
  const { summary: pre } = await loadSummary(projectId);
  const phaseView = pre.phases.find((p) => p.id === phase.id);
  if (phaseView && !phaseView.gateOpen && body.status !== "pendiente") {
    throw new HttpError(400, `La fase "${phase.name}" esta bloqueada por phase-gate (cierra la fase anterior primero).`);
  }

  const startDate = body.startDate || phase.startDate || project.startDate;
  const endDate = body.endDate || phase.endDate || project.endDatePlanned;
  if (endDate < startDate) throw new HttpError(400, "La fecha fin no puede ser anterior a la fecha inicio");

  const existing = (await repo.listScheduleTasks(projectId)).filter((t) => t.phaseId === body.phaseId);
  const now = new Date().toISOString();
  const status = normalizeStatus(body.status);
  const task: ScheduleTask = {
    id: newId(),
    projectId,
    phaseId: body.phaseId,
    name: body.name.trim(),
    description: body.description?.trim() ?? "",
    startDate,
    endDate,
    status,
    completedAt: status === "completada" ? body.completedAt || todayIso() : undefined,
    weight: clampWeight(body.weight),
    order: body.order ?? existing.length + 1,
    createdAt: now,
    updatedAt: now,
  };
  await repo.putScheduleTask(task);
  await recordAudit(principal, {
    action: "create",
    entityType: "schedule_task",
    entityId: task.id,
    entityName: task.name,
    projectId,
    projectName: project.name,
    process: project.process,
    summary: `Creo la tarea "${task.name}" en "${project.name}"`,
  });
  return evaluateOne(projectId, task.id);
}

export async function updateTask(
  principal: Principal,
  projectId: string,
  taskId: string,
  body: Partial<ScheduleTask>
) {
  const project = await requireProject(principal, projectId);
  const existing = await repo.getScheduleTask(projectId, taskId);
  if (!existing) throw new HttpError(404, "Tarea no encontrada");

  const phaseId = body.phaseId ?? existing.phaseId;
  if (phaseId) {
    const phase = await repo.getSchedulePhase(projectId, phaseId);
    if (!phase) throw new HttpError(404, "Fase no encontrada");
  }

  const startDate = body.startDate ?? existing.startDate;
  const endDate = body.endDate ?? existing.endDate;
  if (endDate < startDate) throw new HttpError(400, "La fecha fin no puede ser anterior a la fecha inicio");

  const status = body.status ? normalizeStatus(body.status) : existing.status;
  const task: ScheduleTask = {
    ...existing,
    phaseId,
    name: body.name?.trim() ?? existing.name,
    description: body.description !== undefined ? String(body.description).trim() : existing.description,
    startDate,
    endDate,
    status,
    completedAt: status === "completada" ? body.completedAt || existing.completedAt || todayIso() : undefined,
    weight: body.weight != null ? clampWeight(body.weight) : existing.weight,
    order: body.order ?? existing.order,
    updatedAt: new Date().toISOString(),
  };
  await repo.putScheduleTask(task);
  await recordAudit(principal, {
    action: "update",
    entityType: "schedule_task",
    entityId: task.id,
    entityName: task.name,
    projectId,
    projectName: project.name,
    process: project.process,
    summary: `Actualizo la tarea "${task.name}" en "${project.name}"`,
  });

  // Si todas las tareas de la fase estan completadas, marcar la fase como completada
  if (status === "completada" && phaseId) {
    const siblings = (await repo.listScheduleTasks(projectId)).filter((t) => t.phaseId === phaseId);
    const allDone = siblings.every((t) => t.status === "completada" || t.status === "cancelada");
    if (allDone) {
      const phase = await repo.getSchedulePhase(projectId, phaseId);
      if (phase && phase.status !== "completada") {
        await repo.putSchedulePhase({
          ...phase,
          status: "completada",
          completedAt: todayIso(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return evaluateOne(projectId, task.id);
}

export async function removeTask(principal: Principal, projectId: string, taskId: string) {
  const project = await requireProject(principal, projectId);
  const existing = await repo.getScheduleTask(projectId, taskId);
  if (!existing) throw new HttpError(404, "Tarea no encontrada");
  await repo.deleteScheduleTask(projectId, taskId);
  await recordAudit(principal, {
    action: "delete",
    entityType: "schedule_task",
    entityId: existing.id,
    entityName: existing.name,
    projectId,
    projectName: project.name,
    process: project.process,
    summary: `Elimino la tarea "${existing.name}" de "${project.name}"`,
  });
}

// ---------------------------- Evolutivos ------------------------------

/**
 * Genera un evolutivo a partir de un proyecto cerrado (completado).
 * Buena practica: el proyecto padre queda como linea base; el evolutivo
 * hereda proceso/responsable y arranca con plantilla de fases.
 */
export async function createEvolutivo(
  principal: Principal,
  projectId: string,
  body: { name?: string; endDatePlanned?: string }
) {
  const parent = await requireProject(principal, projectId);
  if (parent.phase !== "completado") {
    throw new HttpError(400, "Solo se pueden generar evolutivos sobre proyectos cerrados (completados).");
  }

  const siblings = (await repo.listProjects()).filter((p) => p.parentProjectId === projectId);
  const seq = siblings.length + 1;
  const now = new Date().toISOString();
  const startDate = todayIso();
  const endDatePlanned =
    body.endDatePlanned ||
    new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

  const evolutivo: Project = {
    ...parent,
    id: newId(),
    name: body.name?.trim() || `${parent.name} — Evolutivo ${seq}`,
    category: parent.category || "Evolutivo",
    phase: "sin_iniciar",
    status: "control",
    kind: "evolutivo",
    parentProjectId: parent.id,
    evolutivoSeq: seq,
    startDate,
    endDatePlanned,
    endDateDeal: endDatePlanned,
    progressMode: "manual",
    manualProgress: 0,
    plannedSetupCost: 0,
    plannedRecurringCost: 0,
    realCost: 0,
    monthlyRevenue: parent.monthlyRevenue,
    totalValue: 0,
    createdAt: now,
    updatedAt: now,
    createdById: principal.sub,
    createdByName: actorName(principal),
    updatedById: principal.sub,
    updatedByName: actorName(principal),
  };
  await repo.putProject(evolutivo);
  await recordAudit(principal, {
    action: "create",
    entityType: "evolutivo",
    entityId: evolutivo.id,
    entityName: evolutivo.name,
    projectId: evolutivo.id,
    projectName: evolutivo.name,
    process: evolutivo.process,
    summary: `Genero el evolutivo "${evolutivo.name}" desde "${parent.name}"`,
  });

  // Plantilla de fases para el evolutivo
  const total = PHASE_TEMPLATE.length;
  const start = new Date(startDate + "T12:00:00Z");
  const end = new Date(endDatePlanned + "T12:00:00Z");
  const span = Math.max(1, end.getTime() - start.getTime());
  for (let i = 0; i < total; i++) {
    const tpl = PHASE_TEMPLATE[i];
    const segStart = new Date(start.getTime() + (span * i) / total);
    const segEnd = new Date(start.getTime() + (span * (i + 1)) / total - 86400000);
    if (segEnd < segStart) segEnd.setTime(segStart.getTime());
    await repo.putSchedulePhase({
      id: newId(),
      projectId: evolutivo.id,
      name: tpl.name,
      description: tpl.description,
      startDate: segStart.toISOString().slice(0, 10),
      endDate: i === total - 1 ? endDatePlanned : segEnd.toISOString().slice(0, 10),
      status: i === 0 ? "pendiente" : "pendiente",
      weight: tpl.weight,
      order: i + 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    evolutivo: projectDto(evolutivo),
    message: `Evolutivo ${seq} creado. Se aplico la plantilla estandar de fases.`,
  };
}

// ------------------------------ helpers -------------------------------

async function requireProject(principal: Principal, projectId: string): Promise<Project> {
  const project = await repo.getProject(projectId);
  if (!project) throw new HttpError(404, "Proyecto no encontrado");
  assertCanAccessProcess(principal, project.process);
  return project;
}

async function evaluateOne(projectId: string, taskId: string) {
  const { summary } = await loadSummary(projectId);
  const task = summary.tasks.find((t) => t.id === taskId);
  return { task, summary };
}

function normalizeStatus(value: unknown): ScheduleItemStatus {
  if (typeof value === "string" && STATUSES.includes(value as ScheduleItemStatus)) {
    return value as ScheduleItemStatus;
  }
  return "pendiente";
}

function clampWeight(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(100, n);
}
