export type Process = "PMO" | "IMPL" | "CSM";

export type ProjectStatus = "control" | "riesgo" | "critico";

/**
 * Ciclo de vida del proyecto (no confundir con las fases WBS del cronograma).
 * "completado" = proyecto cerrado; habilita generar evolutivos.
 */
export type ProjectPhase = "sin_iniciar" | "en_progreso" | "standby" | "completado";

/** Conservado por compatibilidad; el avance del proyecto siempre es manual. */
export type ProgressMode = "auto" | "manual";

/** Tipo de iniciativa: proyecto base o evolutivo post-cierre. */
export type ProjectKind = "proyecto" | "evolutivo";

export type Role = "Administrador" | "Implementador";

/** Procesos que muestran indicadores de satisfaccion (Epica 1 y 6). */
export const SURVEY_PROCESSES: Process[] = ["PMO", "CSM"];

export interface Project {
  id: string;
  name: string;
  category: string;
  process: Process;
  status: ProjectStatus;
  phase: ProjectPhase;
  owner: string; // responsable
  kind: ProjectKind;
  /** Proyecto padre cuando kind = evolutivo. */
  parentProjectId?: string;
  /** Numero secuencial del evolutivo (1, 2, ...). */
  evolutivoSeq?: number;
  startDate: string; // ISO yyyy-mm-dd
  /** Fecha tentativa de fin (plan interno). */
  endDatePlanned: string; // ISO yyyy-mm-dd
  /** Fecha deal / compromiso de entrega. Si falta, se asume igual a la tentativa. */
  endDateDeal: string; // ISO yyyy-mm-dd
  progressMode: ProgressMode;
  manualProgress: number; // 0-100, fuente de verdad del % de avance
  plannedSetupCost: number;
  plannedRecurringCost: number;
  realCost: number;
  monthlyRevenue: number;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
}

export interface WeeklyUpdate {
  projectId: string;
  date: string; // ISO datetime
  status: ProjectStatus;
  phase?: ProjectPhase;
  currentStatus: string; // status actual (texto)
  nextSteps: string;
  progress: number; // % de avance registrado en ese momento
  note: string;
  authorId?: string;
  authorName?: string;
  authorEmail?: string;
}

export type AuditAction = "create" | "update" | "delete" | "comment";

export type AuditEntityType =
  | "project"
  | "weekly_update"
  | "schedule_phase"
  | "schedule_task"
  | "evolutivo"
  | "survey"
  | "kpi"
  | "alert"
  | "exec_task"
  | "control"
  | "module";

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorEmail?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  projectId?: string;
  projectName?: string;
  process?: Process;
  summary: string;
}

export type ScheduleItemStatus = "pendiente" | "en_progreso" | "completada" | "cancelada";

/** @deprecated usar ScheduleItemStatus */
export type ScheduleTaskStatus = ScheduleItemStatus;

/**
 * Fase WBS del cronograma (Project -> Fases -> Tareas).
 * Buenas practicas: fases secuenciales tipo gate (Iniciacion, Planificacion, etc.).
 */
export interface SchedulePhase {
  id: string;
  projectId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ScheduleItemStatus;
  completedAt?: string;
  weight: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** Tarea perteneciente a una fase del cronograma. */
export interface ScheduleTask {
  id: string;
  projectId: string;
  phaseId: string;
  name: string;
  description: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  status: ScheduleItemStatus;
  completedAt?: string; // yyyy-mm-dd
  weight: number; // peso relativo (default 1)
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** Plantilla estandar de fases (ciclo de vida de implementacion). */
export const STANDARD_PHASE_TEMPLATE: { name: string; description: string; weight: number }[] = [
  { name: "Iniciacion", description: "Kickoff, alcance, stakeholders y criterios de exito", weight: 1 },
  { name: "Planificacion", description: "Cronograma, recursos, riesgos y plan de trabajo", weight: 1 },
  { name: "Ejecucion", description: "Construccion / configuracion / desarrollo", weight: 3 },
  { name: "Pruebas y UAT", description: "Pruebas, validacion con usuarios y correcciones", weight: 2 },
  { name: "Despliegue", description: "Go-live, corte y puesta en produccion", weight: 2 },
  { name: "Cierre", description: "Estabilizacion, lecciones aprendidas y cierre formal", weight: 1 },
];

export interface Survey {
  process: Process;
  period: string; // yyyy-mm
  nps: number;
  responses: number;
  csat: number;
  promoters: number;
  passives: number;
  detractors: number;
  source: "manual" | "supabase";
  updatedAt: string;
}

export type Cumplimiento = "cumple" | "cerca" | "no_cumple";

export interface ExecKpi {
  id: string;
  process: Process;
  month: string; // yyyy-mm
  name: string;
  value: number;
  goal: number;
}

export type Severity = "critico" | "alto" | "medio";

export interface Alert {
  id: string;
  process: Process;
  severity: Severity;
  title: string;
  description: string;
  valueAtRisk?: number;
}

export interface Task {
  id: string;
  month: string; // yyyy-mm
  title: string;
  moduleLabel: string;
  dueDate?: string; // ISO yyyy-mm-dd, ausente = "Sin fecha"
}

export type ControlStatus = "alDia" | "pendiente";

export interface WeeklyControl {
  id: string;
  month: string; // yyyy-mm
  week: string; // etiqueta de semana, ej. "S1"
  process: Process;
  team: string;
  responsibles: string[];
  status: ControlStatus;
}

export type ModuleUpdateStatus = "alDia" | "pendiente" | "enConstruccion";

export interface ModuleSummary {
  process: Process;
  month: string; // yyyy-mm
  totalProjects: number;
  breakdown: { label: string; count: number }[];
  metrics: { label: string; value: string }[];
  updateStatus: ModuleUpdateStatus;
}
