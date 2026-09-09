import { config } from "../config";
import { getIdToken, notifyAuthRequired } from "../auth/portal";
import type {
  Alert,
  ExecKpi,
  ExecPanel,
  ModuleSummary,
  Overview,
  Project,
  ProcessFilter,
  ProjectSchedule,
  ScheduleTask,
  Survey,
  Task,
  WeeklyControl,
  WeeklyUpdate,
  Sla,
} from "../types";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getIdToken();
  if (!token) {
    notifyAuthRequired();
    throw new Error("Sesion expirada. Vuelve a abrir la aplicacion desde el portal ImpactIA.");
  }
  const res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    notifyAuthRequired();
    throw new Error("Sesion expirada o no valida. Vuelve a abrir la aplicacion desde el portal ImpactIA.");
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Error ${res.status}`);
  }
  return data as T;
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== "");
  return entries.length ? "?" + new URLSearchParams(entries as [string, string][]).toString() : "";
}

export const api = {
  me: () => request<import("../types").Me>("GET", "/me"),

  // Proyectos
  listProjects: () => request<Project[]>("GET", "/projects"),
  getProject: (id: string) => request<Project & { updates: WeeklyUpdate[] }>("GET", `/projects/${id}`),
  createProject: (p: Partial<Project>) => request<Project>("POST", "/projects", p),
  updateProject: (id: string, p: Partial<Project>) => request<Project>("PUT", `/projects/${id}`, p),
  deleteProject: (id: string) => request<void>("DELETE", `/projects/${id}`),

  // Seguimiento semanal
  listUpdates: (id: string) => request<WeeklyUpdate[]>("GET", `/projects/${id}/updates`),
  addUpdate: (
    id: string,
    u: Partial<WeeklyUpdate> & {
      progressMode?: import("../types").ProgressMode;
      manualProgress?: number;
      owner?: string;
    }
  ) => request<WeeklyUpdate>("POST", `/projects/${id}/updates`, u),

  // Cronograma por proyecto (fases + tareas)
  getSchedule: (projectId: string) => request<ProjectSchedule>("GET", `/projects/${projectId}/schedule`),
  applyScheduleTemplate: (projectId: string) =>
    request<{ created: number; summary: ProjectSchedule["summary"] }>(
      "POST",
      `/projects/${projectId}/schedule/template`
    ),
  createSchedulePhase: (projectId: string, p: Partial<import("../types").SchedulePhase>) =>
    request<{ phase: import("../types").SchedulePhase; summary: ProjectSchedule["summary"] }>(
      "POST",
      `/projects/${projectId}/schedule/phases`,
      p
    ),
  updateSchedulePhase: (
    projectId: string,
    phaseId: string,
    p: Partial<import("../types").SchedulePhase>
  ) =>
    request<{ phase: import("../types").SchedulePhase; summary: ProjectSchedule["summary"] }>(
      "PUT",
      `/projects/${projectId}/schedule/phases/${phaseId}`,
      p
    ),
  deleteSchedulePhase: (projectId: string, phaseId: string) =>
    request<void>("DELETE", `/projects/${projectId}/schedule/phases/${phaseId}`),
  createScheduleTask: (projectId: string, t: Partial<ScheduleTask>) =>
    request<{ task: ScheduleTask; summary: ProjectSchedule["summary"] }>(
      "POST",
      `/projects/${projectId}/schedule/tasks`,
      t
    ),
  updateScheduleTask: (projectId: string, taskId: string, t: Partial<ScheduleTask>) =>
    request<{ task: ScheduleTask; summary: ProjectSchedule["summary"] }>(
      "PUT",
      `/projects/${projectId}/schedule/tasks/${taskId}`,
      t
    ),
  deleteScheduleTask: (projectId: string, taskId: string) =>
    request<void>("DELETE", `/projects/${projectId}/schedule/tasks/${taskId}`),
  createEvolutivo: (projectId: string, body?: { name?: string; endDatePlanned?: string }) =>
    request<{
      evolutivo: { id: string; name: string; evolutivoSeq?: number };
      message: string;
    }>("POST", `/projects/${projectId}/evolutivos`, body ?? {}),

  // Vista general
  overview: (process: ProcessFilter, month: string) =>
    request<Overview>("GET", `/overview${qs({ process, month })}`),

  // Encuestas
  listSurveys: () => request<Survey[]>("GET", "/surveys"),
  upsertSurvey: (s: Partial<Survey>) => request<Survey>("POST", "/surveys", s),
  syncSurveys: () => request<{ configured: boolean; imported: number; message?: string }>("POST", "/surveys/sync"),

  // ANS (backend: /sla)
  listSlas: () => request<Sla[]>("GET", "/sla"),
  getSla: (id: string) => request<Sla>("GET", `/sla/${id}`),
  createSla: (s: Omit<Sla, "id"> | Partial<Sla>) => request<Sla>("POST", "/sla", s),
  updateSla: (id: string, s: Partial<Sla>) => request<Sla>("PUT", `/sla/${id}`, s),
  deleteSla: (id: string) => request<void>("DELETE", `/sla/${id}`),
  listSlasByProyecto: (proyecto: string) =>
    request<Sla[]>("GET", `/sla/proyecto/${encodeURIComponent(proyecto)}`),

  // Panel ejecutivo
  execPanel: (process: ProcessFilter, month: string) =>
    request<ExecPanel>("GET", `/exec/panel${qs({ process, month })}`),
  upsertKpi: (k: Partial<ExecKpi>) => request<ExecKpi>("POST", "/exec/kpis", k),
  deleteKpi: (id: string, month: string) => request<void>("DELETE", `/exec/kpis/${id}${qs({ month })}`),
  upsertAlert: (a: Partial<Alert> & { month: string }) => request<Alert>("POST", "/exec/alerts", a),
  deleteAlert: (id: string, month: string) => request<void>("DELETE", `/exec/alerts/${id}${qs({ month })}`),
  upsertTask: (t: Partial<Task>) => request<Task>("POST", "/exec/tasks", t),
  deleteTask: (id: string, month: string) => request<void>("DELETE", `/exec/tasks/${id}${qs({ month })}`),
  upsertControl: (c: Partial<WeeklyControl>) => request<WeeklyControl>("POST", "/exec/controls", c),
  deleteControl: (id: string, month: string) =>
    request<void>("DELETE", `/exec/controls/${id}${qs({ month })}`),
  upsertModule: (m: Partial<ModuleSummary>) => request<ModuleSummary>("POST", "/exec/modules", m),

  seed: () => request<{ seeded: boolean; projects: number }>("POST", "/seed"),

  listAudit: (limit?: number) =>
    request<import("../types").AuditEvent[]>("GET", `/audit${qs({ limit: limit != null ? String(limit) : undefined })}`),
};
