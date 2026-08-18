import type {
  ControlStatus,
  Cumplimiento,
  ModuleUpdateStatus,
  Process,
  ProcessFilter,
  ProjectPhase,
  ProjectStatus,
  Severity,
} from "../types";

export const PROCESS_LABEL: Record<Process, string> = {
  PMO: "PMO",
  IMPL: "Implementacion Interna",
  CSM: "CSM",
};

export const PROCESS_FILTERS: { value: ProcessFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "PMO", label: "PMO" },
  { value: "IMPL", label: "Implementacion Interna" },
  { value: "CSM", label: "CSM" },
];

export const PROCESS_COLOR: Record<Process, string> = {
  PMO: "bg-violet-100 text-violet-700 border-violet-200",
  IMPL: "bg-cyan-100 text-cyan-700 border-cyan-200",
  CSM: "bg-pink-100 text-pink-700 border-pink-200",
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  control: "En control",
  riesgo: "En riesgo",
  critico: "Critico",
};

export const STATUS_COLOR: Record<ProjectStatus, string> = {
  control: "bg-emerald-100 text-emerald-700 border-emerald-200",
  riesgo: "bg-amber-100 text-amber-700 border-amber-200",
  critico: "bg-rose-100 text-rose-700 border-rose-200",
};

export const PHASE_LABEL: Record<ProjectPhase, string> = {
  sin_iniciar: "Sin iniciar",
  en_progreso: "En progreso",
  standby: "Standby",
  completado: "Completado",
};

export const PHASE_COLOR: Record<ProjectPhase, string> = {
  sin_iniciar: "bg-slate-100 text-slate-600 border-slate-200",
  en_progreso: "bg-sky-100 text-sky-700 border-sky-200",
  standby: "bg-orange-100 text-orange-700 border-orange-200",
  completado: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critico: "Critico",
  alto: "Alto",
  medio: "Medio",
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  critico: "bg-rose-100 text-rose-700 border-rose-200",
  alto: "bg-orange-100 text-orange-700 border-orange-200",
  medio: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export const CUMPLIMIENTO_LABEL: Record<Cumplimiento, string> = {
  cumple: "Cumple",
  cerca: "Cerca",
  no_cumple: "No cumple",
};

export const CUMPLIMIENTO_COLOR: Record<Cumplimiento, string> = {
  cumple: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cerca: "bg-amber-100 text-amber-700 border-amber-200",
  no_cumple: "bg-rose-100 text-rose-700 border-rose-200",
};

export const CONTROL_LABEL: Record<ControlStatus, string> = {
  alDia: "Al dia",
  pendiente: "Pendiente",
};

export const MODULE_STATUS_LABEL: Record<ModuleUpdateStatus, string> = {
  alDia: "Al dia",
  pendiente: "Pendiente",
  enConstruccion: "En construccion",
};

export const MODULE_STATUS_COLOR: Record<ModuleUpdateStatus, string> = {
  alDia: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pendiente: "bg-amber-100 text-amber-700 border-amber-200",
  enConstruccion: "bg-slate-100 text-slate-600 border-slate-200",
};

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  create: "Creo",
  update: "Actualizo",
  delete: "Elimino",
  comment: "Comento",
};

export const AUDIT_ACTION_COLOR: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 border-emerald-200",
  update: "bg-sky-100 text-sky-700 border-sky-200",
  delete: "bg-rose-100 text-rose-700 border-rose-200",
  comment: "bg-violet-100 text-violet-700 border-violet-200",
};

export const AUDIT_ENTITY_LABEL: Record<string, string> = {
  project: "Proyecto",
  weekly_update: "Seguimiento",
  schedule_phase: "Fase",
  schedule_task: "Tarea",
  evolutivo: "Evolutivo",
  survey: "Encuesta",
  kpi: "KPI",
  alert: "Alerta",
  exec_task: "Tarea ejecutiva",
  control: "Control",
  module: "Modulo",
};
