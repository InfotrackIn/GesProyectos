import {
  businessDaysBetween,
  businessDaysElapsed,
  todayIso,
} from "./businessDays.js";
import type { SchedulePhase, ScheduleTask } from "../shared/types.js";

export type TaskCompliance = "a_tiempo" | "atrasada" | "pendiente" | "completada_tarde" | "cancelada";

export interface ScheduleTaskView extends ScheduleTask {
  plannedBusinessDays: number;
  elapsedBusinessDays: number;
  expectedProgress: number;
  compliance: TaskCompliance;
  onTime: boolean | null;
}

export interface SchedulePhaseView extends SchedulePhase {
  plannedBusinessDays: number;
  elapsedBusinessDays: number;
  expectedProgress: number;
  compliance: TaskCompliance;
  onTime: boolean | null;
  /** Avance ponderado de las tareas de la fase (0-100). */
  progressPct: number;
  /** % de tareas completadas en la fase. */
  completionPct: number;
  tasks: ScheduleTaskView[];
  /** Si la fase anterior esta cerrada (gate). */
  gateOpen: boolean;
}

export interface ScheduleSummary {
  totalPhases: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  cancelledTasks: number;
  completionPct: number;
  progressPct: number;
  expectedPct: number;
  scheduleCompliancePct: number;
  scheduleComplianceLabel: "cumple" | "cerca" | "atrasado" | "sin_tareas";
  plannedBusinessDays: number;
  elapsedBusinessDays: number;
  phases: SchedulePhaseView[];
  /** Flat list for compat / exports. */
  tasks: ScheduleTaskView[];
}

export function evaluateTask(task: ScheduleTask, asOf: string = todayIso()): ScheduleTaskView {
  const plannedBusinessDays = Math.max(1, businessDaysBetween(task.startDate, task.endDate));
  const elapsedBusinessDays = businessDaysElapsed(task.startDate, task.endDate, asOf);
  const expectedProgress = Math.min(100, Math.round((elapsedBusinessDays / plannedBusinessDays) * 1000) / 10);

  let compliance: TaskCompliance = "pendiente";
  let onTime: boolean | null = null;

  if (task.status === "cancelada") {
    compliance = "cancelada";
    onTime = null;
  } else if (task.status === "completada") {
    const done = task.completedAt ?? asOf;
    onTime = done <= task.endDate;
    compliance = onTime ? "a_tiempo" : "completada_tarde";
  } else if (asOf > task.endDate) {
    compliance = "atrasada";
    onTime = false;
  } else {
    compliance = "pendiente";
    onTime = true;
  }

  return {
    ...task,
    plannedBusinessDays,
    elapsedBusinessDays,
    expectedProgress,
    compliance,
    onTime,
  };
}

function weightedProgress(items: { status: string; weight: number; plannedBusinessDays: number; expectedProgress: number }[]): number {
  let totalWeight = 0;
  let doneWeight = 0;
  for (const t of items) {
    if (t.status === "cancelada") continue;
    const w = (t.weight ?? 1) * t.plannedBusinessDays;
    totalWeight += w;
    if (t.status === "completada") doneWeight += w;
    else if (t.status === "en_progreso") doneWeight += w * (t.expectedProgress / 100) * 0.5;
  }
  return totalWeight === 0 ? 0 : Math.round((doneWeight / totalWeight) * 1000) / 10;
}

/**
 * Resume el cronograma jerarquico: fases con sus tareas.
 * Gate: una fase solo esta "abierta" si la anterior esta completada/cancelada
 * (o es la primera). Buena practica de phase-gate.
 */
export function summarizeSchedule(
  phases: SchedulePhase[],
  tasks: ScheduleTask[],
  projectStart: string,
  projectEnd: string,
  asOf: string = todayIso()
): ScheduleSummary {
  const sortedPhases = [...phases].sort((a, b) => a.order - b.order || a.startDate.localeCompare(b.startDate));
  const taskViews = tasks.map((t) => evaluateTask(t, asOf));

  const phaseViews: SchedulePhaseView[] = sortedPhases.map((phase, index) => {
    const phaseTasks = taskViews
      .filter((t) => t.phaseId === phase.id)
      .sort((a, b) => a.order - b.order || a.startDate.localeCompare(b.startDate));

    const plannedBusinessDays = Math.max(1, businessDaysBetween(phase.startDate, phase.endDate));
    const elapsedBusinessDays = businessDaysElapsed(phase.startDate, phase.endDate, asOf);
    const expectedProgress = Math.min(100, Math.round((elapsedBusinessDays / plannedBusinessDays) * 1000) / 10);

    // Si la fase tiene tareas, el estado efectivo se deriva de ellas; si no, del propio status.
    let compliance: TaskCompliance = "pendiente";
    let onTime: boolean | null = true;
    if (phase.status === "cancelada") {
      compliance = "cancelada";
      onTime = null;
    } else if (phaseTasks.length > 0) {
      const overdue = phaseTasks.some((t) => t.compliance === "atrasada");
      const allDone = phaseTasks.every((t) => t.status === "completada" || t.status === "cancelada");
      const anyLate = phaseTasks.some((t) => t.compliance === "completada_tarde");
      if (overdue) {
        compliance = "atrasada";
        onTime = false;
      } else if (allDone) {
        compliance = anyLate ? "completada_tarde" : "a_tiempo";
        onTime = !anyLate;
      } else {
        compliance = "pendiente";
        onTime = true;
      }
    } else if (phase.status === "completada") {
      const done = phase.completedAt ?? asOf;
      onTime = done <= phase.endDate;
      compliance = onTime ? "a_tiempo" : "completada_tarde";
    } else if (asOf > phase.endDate) {
      compliance = "atrasada";
      onTime = false;
    }

    const countable = phaseTasks.filter((t) => t.status !== "cancelada");
    const completed = countable.filter((t) => t.status === "completada");
    const completionPct =
      countable.length === 0
        ? phase.status === "completada"
          ? 100
          : 0
        : Math.round((completed.length / countable.length) * 1000) / 10;

    const progressPct =
      phaseTasks.length === 0
        ? phase.status === "completada"
          ? 100
          : phase.status === "en_progreso"
            ? expectedProgress * 0.5
            : 0
        : weightedProgress(phaseTasks);

    const prev = index > 0 ? sortedPhases[index - 1] : null;
    const gateOpen =
      !prev ||
      prev.status === "completada" ||
      prev.status === "cancelada" ||
      // Si la fase anterior tiene todas las tareas hechas, el gate se considera abierto
      (() => {
        const prevTasks = taskViews.filter((t) => t.phaseId === prev.id && t.status !== "cancelada");
        return prevTasks.length > 0 && prevTasks.every((t) => t.status === "completada");
      })();

    return {
      ...phase,
      plannedBusinessDays,
      elapsedBusinessDays,
      expectedProgress,
      compliance,
      onTime,
      progressPct,
      completionPct,
      tasks: phaseTasks,
      gateOpen,
    };
  });

  // Tareas huerfanas (sin fase / migracion) se agrupan al final
  const knownPhaseIds = new Set(sortedPhases.map((p) => p.id));
  const orphans = taskViews.filter((t) => !t.phaseId || !knownPhaseIds.has(t.phaseId));

  const allTasks = [...taskViews];
  const cancelled = allTasks.filter((t) => t.status === "cancelada");
  const completed = allTasks.filter((t) => t.status === "completada");
  const active = allTasks.filter((t) => t.status !== "cancelada" && t.status !== "completada");
  const overdue = allTasks.filter((t) => t.compliance === "atrasada");
  const countable = allTasks.filter((t) => t.status !== "cancelada");

  const completionPct =
    countable.length === 0
      ? 0
      : Math.round((completed.length / countable.length) * 1000) / 10;

  // Avance del proyecto: ponderado por fases (peso de fase * progreso de fase)
  let phaseTotal = 0;
  let phaseDone = 0;
  for (const ph of phaseViews) {
    if (ph.status === "cancelada") continue;
    const w = (ph.weight ?? 1) * ph.plannedBusinessDays;
    phaseTotal += w;
    phaseDone += w * (ph.progressPct / 100);
  }
  // Si no hay fases, usar tareas planas
  const progressPct =
    phaseViews.length > 0
      ? phaseTotal === 0
        ? 0
        : Math.round((phaseDone / phaseTotal) * 1000) / 10
      : weightedProgress(allTasks);

  const plannedBusinessDays = Math.max(1, businessDaysBetween(projectStart, projectEnd));
  const elapsedBusinessDays = businessDaysElapsed(projectStart, projectEnd, asOf);
  const expectedPct = Math.min(100, Math.round((elapsedBusinessDays / plannedBusinessDays) * 1000) / 10);

  let scheduleCompliancePct = 100;
  let scheduleComplianceLabel: ScheduleSummary["scheduleComplianceLabel"] = "sin_tareas";
  const hasWork = phaseViews.length > 0 || countable.length > 0;
  if (hasWork) {
    scheduleCompliancePct =
      expectedPct <= 0 ? 100 : Math.round((progressPct / expectedPct) * 1000) / 10;
    if (scheduleCompliancePct >= 100) scheduleComplianceLabel = "cumple";
    else if (scheduleCompliancePct >= 90) scheduleComplianceLabel = "cerca";
    else scheduleComplianceLabel = "atrasado";
  }

  // Incluir huerfanas en una fase sintetica solo en la lista plana
  void orphans;

  return {
    totalPhases: phaseViews.length,
    totalTasks: allTasks.length,
    activeTasks: active.length,
    completedTasks: completed.length,
    overdueTasks: overdue.length,
    cancelledTasks: cancelled.length,
    completionPct,
    progressPct,
    expectedPct,
    scheduleCompliancePct,
    scheduleComplianceLabel,
    plannedBusinessDays,
    elapsedBusinessDays,
    phases: phaseViews,
    tasks: allTasks,
  };
}
