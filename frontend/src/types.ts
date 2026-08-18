export type Process = "PMO" | "IMPL" | "CSM";
export type ProcessFilter = Process | "ALL";
export type ProjectStatus = "control" | "riesgo" | "critico";
export type ProjectPhase = "sin_iniciar" | "en_progreso" | "standby" | "completado";
/** Conservado por compatibilidad; el avance del proyecto siempre es manual. */
export type ProgressMode = "auto" | "manual";
export type ProjectKind = "proyecto" | "evolutivo";
export type Role = "Administrador" | "Implementador";
export type Severity = "critico" | "alto" | "medio";
export type Cumplimiento = "cumple" | "cerca" | "no_cumple";
export type ControlStatus = "alDia" | "pendiente";
export type ModuleUpdateStatus = "alDia" | "pendiente" | "enConstruccion";

export const SURVEY_PROCESSES: Process[] = ["PMO", "CSM"];

export interface Project {
  id: string;
  name: string;
  category: string;
  process: Process;
  status: ProjectStatus;
  phase: ProjectPhase;
  owner: string;
  kind?: ProjectKind;
  parentProjectId?: string;
  evolutivoSeq?: number;
  startDate: string;
  /** Fecha tentativa de fin (plan interno). */
  endDatePlanned: string;
  /** Fecha deal / compromiso. */
  endDateDeal: string;
  progressMode: ProgressMode;
  manualProgress: number;
  plannedSetupCost: number;
  plannedRecurringCost: number;
  realCost: number;
  monthlyRevenue: number;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
  computed?: {
    progress: number;
    scheduled: number;
    variance: number | null;
    cost: {
      planned: number;
      real: number;
      varianceAmount: number;
      variancePct: number;
      overBudget: boolean;
    };
    dates: {
      endDateDeal: string;
      durationPlannedDays: number;
      durationDealDays: number;
      slipDays: number;
      behindDeal: boolean;
    };
  };
}

export interface WeeklyUpdate {
  projectId: string;
  date: string;
  status: ProjectStatus;
  phase?: ProjectPhase;
  currentStatus: string;
  nextSteps: string;
  progress: number;
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
export type ScheduleTaskStatus = ScheduleItemStatus;
export type TaskCompliance = "a_tiempo" | "atrasada" | "pendiente" | "completada_tarde" | "cancelada";

export interface ScheduleTask {
  id: string;
  projectId: string;
  phaseId: string;
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
  plannedBusinessDays: number;
  elapsedBusinessDays: number;
  expectedProgress: number;
  compliance: TaskCompliance;
  onTime: boolean | null;
}

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
  plannedBusinessDays: number;
  elapsedBusinessDays: number;
  expectedProgress: number;
  compliance: TaskCompliance;
  onTime: boolean | null;
  progressPct: number;
  completionPct: number;
  tasks: ScheduleTask[];
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
  phases: SchedulePhase[];
  tasks: ScheduleTask[];
}

export interface ProjectSchedule {
  project: {
    id: string;
    name: string;
    process: Process;
    owner: string;
    phase: ProjectPhase;
    kind: ProjectKind;
    parentProjectId?: string;
    evolutivoSeq?: number;
    startDate: string;
    endDatePlanned: string;
    endDateDeal: string;
    plannedBusinessDays: number;
    canCreateEvolutivo: boolean;
  };
  evolutivos: {
    id: string;
    name: string;
    evolutivoSeq?: number;
    phase: ProjectPhase;
    status: ProjectStatus;
  }[];
  asOf: string;
  summary: ScheduleSummary;
}

export interface Survey {
  process: Process;
  period: string;
  nps: number;
  responses: number;
  csat: number;
  promoters: number;
  passives: number;
  detractors: number;
  source: "manual" | "supabase";
  updatedAt: string;
}

export interface Overview {
  counts: { total: number; control: number; riesgo: number; critico: number };
  avgProgress: number;
  cost: { plannedTotal: number; realTotal: number; varianceAmount: number; variancePct: number };
  surveyApplies: boolean;
  surveySummary: {
    nps: number;
    csat: number;
    promoters: number;
    passives: number;
    detractors: number;
    responses: number;
  } | null;
  alerts: Alert[];
}

export interface ExecKpi {
  id: string;
  process: Process;
  month: string;
  name: string;
  value: number;
  goal: number;
  pct?: number;
  label?: Cumplimiento;
}

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
  month: string;
  title: string;
  moduleLabel: string;
  dueDate?: string;
}

export interface WeeklyControl {
  id: string;
  month: string;
  week: string;
  process: Process;
  team: string;
  responsibles: string[];
  status: ControlStatus;
}

export interface ModuleSummary {
  process: Process;
  month: string;
  totalProjects: number;
  breakdown: { label: string; count: number }[];
  metrics: { label: string; value: string }[];
  updateStatus: ModuleUpdateStatus;
}

export interface ExecPanel {
  summary: { month: string; process: ProcessFilter; kpisMet: number; kpisTotal: number };
  kpis: ExecKpi[];
  alerts: Alert[];
  tasks: Task[];
  controls: WeeklyControl[];
  modules: ModuleSummary[];
}

export interface Me {
  sub: string;
  email?: string;
  name?: string;
  role: Role;
  groups: string[];
  allowedProcesses: Process[] | "ALL";
}
