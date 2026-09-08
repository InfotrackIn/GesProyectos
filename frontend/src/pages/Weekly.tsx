import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, History, Save, User, CalendarRange } from "lucide-react";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useApp } from "../state/AppContext";
import type {
  Project,
  ProjectPhase,
  ProjectStatus,
  WeeklyUpdate,
} from "../types";
import { Badge, Card, EmptyState, Field, ProgressBar, Spinner } from "../components/ui";
import {
  PHASE_COLOR,
  PHASE_LABEL,
  PROCESS_COLOR,
  PROCESS_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
} from "../lib/labels";
import { fmtDate, fmtDateTime, fmtDays, fmtMoney, fmtPct } from "../lib/format";
import { matchesProjectSearch } from "../lib/search";

const PHASE_FILTERS: { value: ProjectPhase | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "sin_iniciar", label: "Sin iniciar" },
  { value: "en_progreso", label: "En progreso" },
  { value: "standby", label: "Standby" },
  { value: "completado", label: "Completado" },
];

const HEALTH_FILTERS: { value: ProjectStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "control", label: "En Control" },
  { value: "riesgo", label: "En Riesgo" },
  { value: "critico", label: "Critico" },
];

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

function yearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 1; y >= current - 5; y--) years.push(y);
  return years;
}

/** True si el proyecto esta activo en el mes/año seleccionado (solapa con el cronograma). */
function overlapsPeriod(p: Project, year: number | "ALL", month: number | "ALL"): boolean {
  if (year === "ALL" && month === "ALL") return true;
  const start = new Date(p.startDate + "T00:00:00");
  const planned = new Date(p.endDatePlanned + "T00:00:00");
  const deal = new Date((p.endDateDeal || p.endDatePlanned) + "T00:00:00");
  const end = planned > deal ? planned : deal;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;

  const y = year === "ALL" ? start.getFullYear() : year;
  const mStart = month === "ALL" ? 1 : month;
  const mEnd = month === "ALL" ? 12 : month;
  const periodStart = new Date(y, mStart - 1, 1);
  const periodEnd = new Date(y, mEnd, 0, 23, 59, 59);
  return start <= periodEnd && end >= periodStart;
}

export default function Weekly() {
  const { process, projectQuery } = useApp();
  const now = new Date();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [phaseFilter, setPhaseFilter] = useState<ProjectPhase | "ALL">("ALL");
  const [healthFilter, setHealthFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [year, setYear] = useState<number | "ALL">(now.getFullYear());
  const [month, setMonth] = useState<number | "ALL">(now.getMonth() + 1);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      setProjects(await api.listProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const visible = useMemo(() => {
    return projects.filter((p) => {
      if (process !== "ALL" && p.process !== process) return false;
      const phase = p.phase ?? "en_progreso";
      if (phaseFilter !== "ALL" && phase !== phaseFilter) return false;
      if (healthFilter !== "ALL" && p.status !== healthFilter) return false;
      if (!overlapsPeriod(p, year, month)) return false;
      if (!matchesProjectSearch(p, projectQuery)) return false;
      return true;
    });
  }, [projects, process, phaseFilter, healthFilter, year, month, projectQuery]);

  if (loading) return <Spinner />;
  if (error) return <Card className="text-rose-600">{error}</Card>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Seguimiento Semanal</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            className="input w-auto py-1.5"
            value={year === "ALL" ? "ALL" : String(year)}
            onChange={(e) => setYear(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            title="Año"
          >
            <option value="ALL">Todos los años</option>
            {yearOptions().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="input w-auto py-1.5"
            value={month === "ALL" ? "ALL" : String(month)}
            onChange={(e) => setMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            title="Mes"
          >
            <option value="ALL">Todos los meses</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase text-slate-500">Estado</span>
        {PHASE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setPhaseFilter(f.value)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              phaseFilter === f.value
                ? "bg-brand-600 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase text-slate-500">Salud</span>
        {HEALTH_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setHealthFilter(f.value)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              healthFilter === f.value
                ? "bg-slate-800 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          message={
            projectQuery.trim()
              ? `No hay proyectos que coincidan con "${projectQuery}".`
              : "No hay proyectos para el filtro seleccionado."
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} onSaved={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const phase = project.phase ?? "en_progreso";
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [phaseValue, setPhaseValue] = useState<ProjectPhase>(phase);
  const [owner, setOwner] = useState(project.owner ?? "");
  const [manualProgress, setManualProgress] = useState(project.manualProgress ?? 0);
  const [currentStatus, setCurrentStatus] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [note, setNote] = useState("");
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    setStatus(project.status);
    setPhaseValue(project.phase ?? "en_progreso");
    setOwner(project.owner ?? "");
    setManualProgress(project.manualProgress ?? 0);
  }, [project]);

  const progress = project.computed?.progress ?? 0;
  const cost = project.computed?.cost;
  const dates = project.computed?.dates;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && updates.length === 0) {
      setLoadingHistory(true);
      try {
        setUpdates(await api.listUpdates(project.id));
      } finally {
        setLoadingHistory(false);
      }
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api.addUpdate(project.id, {
        status,
        phase: phaseValue,
        owner,
        progressMode: "manual",
        manualProgress,
        progress: manualProgress,
        currentStatus,
        nextSteps,
        note,
      });
      setCurrentStatus("");
      setNextSteps("");
      setNote("");
      setUpdates(await api.listUpdates(project.id));
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-0">
      <div className="flex w-full items-center gap-3 p-4">
        <button onClick={toggle} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{project.name}</span>
            <Badge className={PROCESS_COLOR[project.process]}>{PROCESS_LABEL[project.process]}</Badge>
            <Badge className={PHASE_COLOR[phase]}>{PHASE_LABEL[phase]}</Badge>
            <Badge className={STATUS_COLOR[project.status]}>{STATUS_LABEL[project.status]}</Badge>
            {project.kind === "evolutivo" && (
              <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
                Evolutivo {project.evolutivoSeq ?? ""}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <User size={12} />
            <span>{project.owner?.trim() ? project.owner : "Sin responsable"}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
            <span>Inicio: {fmtDate(project.startDate)}</span>
            <span>Tentativa: {fmtDate(project.endDatePlanned)}</span>
            <span>Deal: {fmtDate(project.endDateDeal || project.endDatePlanned)}</span>
            {dates && (
              <span
                className={clsx(
                  "font-medium",
                  dates.behindDeal ? "text-rose-600" : "text-emerald-600"
                )}
              >
                Desfase {fmtDays(dates.slipDays)}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="w-40">
              <ProgressBar value={progress} />
            </div>
            <span className="text-sm text-slate-600">{fmtPct(progress)}</span>
            {project.computed?.variance != null && (
              <span
                className={clsx(
                  "text-xs",
                  project.computed.variance >= 0 ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {project.computed.variance >= 0 ? "+" : ""}
                {fmtPct(project.computed.variance)} vs plan
              </span>
            )}
          </div>
        </button>
        {cost && (
          <div className="hidden text-right md:block">
            <div className="text-xs text-slate-500">Costo real</div>
            <div className={clsx("font-semibold", cost.overBudget ? "text-rose-600" : "text-emerald-600")}>
              {fmtMoney(cost.real)}
            </div>
            <div className="text-xs text-slate-400">Plan: {fmtMoney(cost.planned)}</div>
          </div>
        )}
        <Link
          to={`/cronograma/${project.id}`}
          className="btn-secondary hidden px-2.5 py-1.5 text-xs sm:inline-flex"
          title="Ver cronograma"
        >
          <CalendarRange size={14} /> Cronograma
        </Link>
        <button onClick={toggle} className="rounded p-1 text-slate-500 hover:bg-slate-100">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Estado del proyecto">
                  <select
                    className="input"
                    value={phaseValue}
                    onChange={(e) => setPhaseValue(e.target.value as ProjectPhase)}
                  >
                    <option value="sin_iniciar">Sin iniciar</option>
                    <option value="en_progreso">En progreso</option>
                    <option value="standby">Standby</option>
                    <option value="completado">Completado</option>
                  </select>
                </Field>
                <Field label="Salud">
                  <select
                    className="input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  >
                    <option value="control">En control</option>
                    <option value="riesgo">En riesgo</option>
                    <option value="critico">Critico</option>
                  </select>
                </Field>
              </div>

              <Field label="Responsable">
                <input
                  className="input"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="Nombre del responsable"
                />
              </Field>

              <Field label="% de avance">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={manualProgress}
                    onChange={(e) => setManualProgress(Number(e.target.value))}
                    title="Ingresa el porcentaje de avance"
                  />
                </Field>

              <Field label="Status actual">
                <textarea
                  className="input"
                  rows={2}
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  placeholder="Como va el proyecto esta semana"
                />
              </Field>
              <Field label="Proximos pasos">
                <textarea
                  className="input"
                  rows={2}
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  placeholder="Acciones para la proxima semana"
                />
              </Field>
              <Field label="Nota (opcional)">
                <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <button onClick={save} className="btn-primary" disabled={saving}>
                <Save size={16} />
                {saving ? "Guardando..." : "Guardar actualizacion"}
              </button>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <History size={16} /> Historial de actualizaciones
              </div>
              {loadingHistory ? (
                <Spinner />
              ) : updates.length === 0 ? (
                <EmptyState message="Aun no hay actualizaciones registradas." />
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {updates.map((u) => (
                    <li key={u.date} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        {u.phase && (
                          <Badge className={PHASE_COLOR[u.phase]}>{PHASE_LABEL[u.phase]}</Badge>
                        )}
                        <Badge className={STATUS_COLOR[u.status]}>{STATUS_LABEL[u.status]}</Badge>
                        <span className="ml-auto text-xs text-slate-500">{fmtDateTime(u.date)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <User size={12} />
                        <span className="font-medium text-slate-700">
                          {u.authorName || u.authorEmail || "Usuario no registrado"}
                        </span>
                      </div>
                      <div className="mt-1 text-slate-600">Avance: {fmtPct(u.progress)}</div>
                      {u.currentStatus && <p className="mt-1 text-slate-700">{u.currentStatus}</p>}
                      {u.nextSteps && (
                        <p className="mt-1 text-slate-500">
                          <span className="font-medium">Proximos pasos:</span> {u.nextSteps}
                        </p>
                      )}
                      {u.note && <p className="mt-1 text-xs italic text-slate-400">{u.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
