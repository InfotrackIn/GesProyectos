import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Lock,
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import clsx from "clsx";
import { api } from "../api/client";
import type {
  Project,
  ProjectSchedule,
  ScheduleItemStatus,
  SchedulePhase,
  ScheduleTask,
} from "../types";
import { Badge, Card, EmptyState, Field, Modal, ProgressBar, Spinner, Stat } from "../components/ui";
import { PROCESS_COLOR, PROCESS_LABEL } from "../lib/labels";
import { fmtDate, fmtPct } from "../lib/format";
import { useApp } from "../state/AppContext";
import { matchesProjectSearch } from "../lib/search";

const STATUS_OPTIONS: { value: ScheduleItemStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En progreso" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
];

const STATUS_COLOR: Record<ScheduleItemStatus, string> = {
  pendiente: "bg-slate-100 text-slate-600 border-slate-200",
  en_progreso: "bg-sky-100 text-sky-700 border-sky-200",
  completada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelada: "bg-slate-100 text-slate-400 border-slate-200",
};

const COMPLIANCE_COLOR: Record<string, string> = {
  a_tiempo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completada_tarde: "bg-amber-100 text-amber-700 border-amber-200",
  atrasada: "bg-rose-100 text-rose-700 border-rose-200",
  pendiente: "bg-slate-100 text-slate-600 border-slate-200",
  cancelada: "bg-slate-100 text-slate-400 border-slate-200",
};

const COMPLIANCE_LABEL: Record<string, string> = {
  a_tiempo: "A tiempo",
  completada_tarde: "Completada tarde",
  atrasada: "Atrasada",
  pendiente: "En plazo",
  cancelada: "Cancelada",
};

type PhaseForm = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ScheduleItemStatus;
  weight: number;
};

type TaskForm = PhaseForm & { phaseId: string };

const emptyPhase = (): PhaseForm => ({
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  status: "pendiente",
  weight: 1,
});

export default function Schedule() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { process, projectQuery } = useApp();
  const [data, setData] = useState<ProjectSchedule | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [phaseModal, setPhaseModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState<SchedulePhase | null>(null);
  const [phaseForm, setPhaseForm] = useState<PhaseForm>(emptyPhase());

  const [taskModal, setTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>({ ...emptyPhase(), phaseId: "" });

  const [evolutivoModal, setEvolutivoModal] = useState(false);
  const [evolutivoName, setEvolutivoName] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.getSchedule(projectId);
      setData(s);
      setExpanded((prev) => {
        const next = { ...prev };
        for (const ph of s.summary.phases) {
          if (next[ph.id] === undefined) next[ph.id] = ph.status === "en_progreso" || ph.gateOpen;
        }
        return next;
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    api.listProjects().then(setProjects).catch(() => undefined);
  }, []);

  const projectOptions = useMemo(() => {
    const filtered = projects.filter(
      (p) => (process === "ALL" || p.process === process) && matchesProjectSearch(p, projectQuery)
    );
    if (projectId && !filtered.some((p) => p.id === projectId)) {
      const current = projects.find((p) => p.id === projectId);
      if (current) return [current, ...filtered];
    }
    return filtered;
  }, [projects, process, projectQuery, projectId]);

  function openNewPhase() {
    setEditingPhase(null);
    setPhaseForm({
      ...emptyPhase(),
      startDate: data?.project.startDate ?? "",
      endDate: data?.project.endDatePlanned ?? "",
    });
    setPhaseModal(true);
  }

  function openEditPhase(ph: SchedulePhase) {
    setEditingPhase(ph);
    setPhaseForm({
      name: ph.name,
      description: ph.description,
      startDate: ph.startDate,
      endDate: ph.endDate,
      status: ph.status,
      weight: ph.weight,
    });
    setPhaseModal(true);
  }

  function openNewTask(phaseId: string) {
    const ph = data?.summary.phases.find((p) => p.id === phaseId);
    setEditingTask(null);
    setTaskForm({
      ...emptyPhase(),
      phaseId,
      startDate: ph?.startDate ?? data?.project.startDate ?? "",
      endDate: ph?.endDate ?? data?.project.endDatePlanned ?? "",
    });
    setTaskModal(true);
  }

  function openEditTask(t: ScheduleTask) {
    setEditingTask(t);
    setTaskForm({
      phaseId: t.phaseId,
      name: t.name,
      description: t.description,
      startDate: t.startDate,
      endDate: t.endDate,
      status: t.status,
      weight: t.weight,
    });
    setTaskModal(true);
  }

  async function submitPhase(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPhase) await api.updateSchedulePhase(projectId, editingPhase.id, phaseForm);
      else await api.createSchedulePhase(projectId, phaseForm);
      setPhaseModal(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function submitTask(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTask) await api.updateScheduleTask(projectId, editingTask.id, taskForm);
      else await api.createScheduleTask(projectId, taskForm);
      setTaskModal(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function applyTemplate() {
    if (!confirm("Aplicar plantilla estandar de fases (Iniciacion → Cierre)?")) return;
    setSaving(true);
    try {
      await api.applyScheduleTemplate(projectId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function createEvolutivo(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createEvolutivo(projectId, { name: evolutivoName || undefined });
      setEvolutivoModal(false);
      navigate(`/cronograma/${res.evolutivo.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Cargando cronograma..." />;
  if (error && !data) return <Card className="text-rose-600">{error}</Card>;
  if (!data) return null;

  const { project, summary, asOf, evolutivos } = data;
  const complianceAccent =
    summary.scheduleComplianceLabel === "cumple"
      ? "text-emerald-600"
      : summary.scheduleComplianceLabel === "cerca"
        ? "text-amber-600"
        : summary.scheduleComplianceLabel === "atrasado"
          ? "text-rose-600"
          : "text-slate-600";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <Link to="/semanal" className="btn-secondary px-2.5" title="Volver">
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarRange size={18} className="text-brand-600" />
            <h1 className="text-lg font-semibold text-slate-900">Cronograma</h1>
            <Badge className={PROCESS_COLOR[project.process]}>{PROCESS_LABEL[project.process]}</Badge>
            {project.kind === "evolutivo" && (
              <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
                Evolutivo {project.evolutivoSeq ?? ""}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-600">{project.name}</p>
          {projectOptions.length > 0 && (
            <select
              className="input mt-1 w-full max-w-md py-1.5"
              value={projectId}
              onChange={(e) => navigate(`/cronograma/${e.target.value}`)}
              title="Cambiar de proyecto"
            >
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-slate-500">
            Inicio {fmtDate(project.startDate)} · Tentativa {fmtDate(project.endDatePlanned)} · Deal{" "}
            {fmtDate(project.endDateDeal || project.endDatePlanned)} · {project.plannedBusinessDays}{" "}
            dias habiles · {fmtDate(asOf)}
            {project.parentProjectId && (
              <>
                {" "}
                ·{" "}
                <Link
                  to={`/cronograma/${project.parentProjectId}`}
                  className="text-brand-600 hover:underline"
                >
                  Ver proyecto padre
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {project.canCreateEvolutivo && (
            <button
              className="btn-secondary"
              onClick={() => {
                setEvolutivoName(`${project.name} — Evolutivo ${(evolutivos.length || 0) + 1}`);
                setEvolutivoModal(true);
              }}
            >
              <GitBranch size={16} /> Generar evolutivo
            </button>
          )}
          {summary.phases.length === 0 && (
            <button className="btn-secondary" onClick={applyTemplate} disabled={saving}>
              <Layers size={16} /> Plantilla estandar
            </button>
          )}
          <button onClick={openNewPhase} className="btn-primary">
            <Plus size={16} /> Nueva fase
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      )}

      {evolutivos.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Evolutivos derivados</h3>
          <ul className="space-y-1">
            {evolutivos.map((e) => (
              <li key={e.id}>
                <Link to={`/cronograma/${e.id}`} className="text-sm text-brand-600 hover:underline">
                  {e.name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Stat label="Fases" value={summary.totalPhases} />
        <Stat label="Tareas" value={summary.totalTasks} hint={`${summary.activeTasks} activas`} />
        <Stat label="Completadas" value={summary.completedTasks} accent="text-emerald-600" />
        <Stat label="Atrasadas" value={summary.overdueTasks} accent="text-rose-600" />
        <Stat label="% tareas" value={fmtPct(summary.completionPct)} />
        <Stat
          label="Avance"
          value={fmtPct(summary.progressPct)}
          hint={`Esperado: ${fmtPct(summary.expectedPct)}`}
        />
        <Stat
          label="Cumplimiento"
          value={fmtPct(summary.scheduleCompliancePct)}
          accent={complianceAccent}
          hint={
            summary.scheduleComplianceLabel === "cumple"
              ? "Cumple"
              : summary.scheduleComplianceLabel === "cerca"
                ? "Cerca"
                : summary.scheduleComplianceLabel === "atrasado"
                  ? "Atrasado"
                  : "Sin trabajo"
          }
        />
      </div>

      <Card>
        <div className="mb-3 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 text-brand-600" />
          <p className="text-sm text-slate-600">
            Estructura <strong>Proyecto → Fases → Tareas</strong>. Las fases usan{" "}
            <strong>phase-gate</strong>: no se puede avanzar una fase si la anterior no esta cerrada.
            Los calculos usan <strong>dias habiles</strong> (lun–vie + festivos Colombia).
          </p>
        </div>
        <ProgressBar value={summary.progressPct} />
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>Avance real {fmtPct(summary.progressPct)}</span>
          <span>
            Esperado {fmtPct(summary.expectedPct)} ({summary.elapsedBusinessDays}/
            {summary.plannedBusinessDays} dias)
          </span>
        </div>
      </Card>

      {summary.phases.length === 0 ? (
        <EmptyState message="Sin fases. Aplica la plantilla estandar o crea la primera fase." />
      ) : (
        <div className="space-y-3">
          {summary.phases.map((ph, idx) => {
            const open = expanded[ph.id] ?? false;
            return (
              <Card key={ph.id} className="space-y-3 p-0 overflow-hidden">
                <div className="flex items-start gap-2 p-4">
                  <button
                    className="mt-0.5 rounded p-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => setExpanded((e) => ({ ...e, [ph.id]: !open }))}
                  >
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">Fase {idx + 1}</span>
                      <span className="font-semibold text-slate-900">{ph.name}</span>
                      <Badge className={STATUS_COLOR[ph.status]}>
                        {STATUS_OPTIONS.find((s) => s.value === ph.status)?.label}
                      </Badge>
                      <Badge className={COMPLIANCE_COLOR[ph.compliance]}>
                        {COMPLIANCE_LABEL[ph.compliance]}
                      </Badge>
                      {!ph.gateOpen && (
                        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                          <Lock size={10} className="mr-1" /> Gate cerrado
                        </Badge>
                      )}
                    </div>
                    {ph.description && <p className="mt-1 text-sm text-slate-500">{ph.description}</p>}
                    <p className="mt-1 text-xs text-slate-500">
                      {fmtDate(ph.startDate)} → {fmtDate(ph.endDate)} · {ph.plannedBusinessDays} dias
                      habiles · {ph.tasks.length} tareas · Avance {fmtPct(ph.progressPct)}
                    </p>
                    <div className="mt-2 max-w-md">
                      <ProgressBar value={ph.progressPct} />
                    </div>
                    <div className="mt-2">
                      <GanttBar
                        start={ph.startDate}
                        end={ph.endDate}
                        timelineStart={project.startDate}
                        timelineEnd={project.endDatePlanned}
                        color={
                          ph.status === "completada"
                            ? "bg-emerald-500"
                            : ph.compliance === "atrasada"
                              ? "bg-rose-500"
                              : ph.status === "en_progreso"
                                ? "bg-sky-500"
                                : "bg-slate-400"
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="btn-secondary px-2 py-1"
                      title="Agregar tarea"
                      onClick={() => openNewTask(ph.id)}
                      disabled={!ph.gateOpen && ph.status === "pendiente"}
                    >
                      <Plus size={14} />
                    </button>
                    <button className="btn-secondary px-2 py-1" onClick={() => openEditPhase(ph)}>
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn-danger px-2 py-1"
                      onClick={async () => {
                        if (!confirm(`Eliminar fase "${ph.name}"?`)) return;
                        try {
                          await api.deleteSchedulePhase(projectId, ph.id);
                          await reload();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Error");
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3">
                    {ph.tasks.length === 0 ? (
                      <p className="text-sm text-slate-500">Sin tareas en esta fase.</p>
                    ) : (
                      <ul className="space-y-2">
                        {ph.tasks.map((t) => (
                          <li
                            key={t.id}
                            className="flex flex-wrap items-start gap-2 rounded-lg border border-slate-200 bg-white p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-800">{t.name}</span>
                                <Badge className={STATUS_COLOR[t.status]}>
                                  {STATUS_OPTIONS.find((s) => s.value === t.status)?.label}
                                </Badge>
                                <Badge className={COMPLIANCE_COLOR[t.compliance]}>
                                  {COMPLIANCE_LABEL[t.compliance]}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {fmtDate(t.startDate)} → {fmtDate(t.endDate)} · {t.plannedBusinessDays}{" "}
                                dias habiles · Peso {t.weight}
                              </p>
                              <div className="mt-2">
                                <GanttBar
                                  start={t.startDate}
                                  end={t.endDate}
                                  timelineStart={project.startDate}
                                  timelineEnd={project.endDatePlanned}
                                  color={
                                    t.status === "completada"
                                      ? "bg-emerald-400"
                                      : t.compliance === "atrasada"
                                        ? "bg-rose-400"
                                        : "bg-sky-400"
                                  }
                                />
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {t.status !== "completada" && t.status !== "cancelada" && (
                                <button
                                  className="btn-secondary px-2 py-1"
                                  title="Completar"
                                  onClick={async () => {
                                    await api.updateScheduleTask(projectId, t.id, {
                                      status: "completada",
                                    });
                                    await reload();
                                  }}
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              )}
                              <button className="btn-secondary px-2 py-1" onClick={() => openEditTask(t)}>
                                <Pencil size={14} />
                              </button>
                              <button
                                className="btn-danger px-2 py-1"
                                onClick={async () => {
                                  if (!confirm(`Eliminar tarea "${t.name}"?`)) return;
                                  await api.deleteScheduleTask(projectId, t.id);
                                  await reload();
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal fase */}
      <Modal
        title={editingPhase ? "Editar fase" : "Nueva fase"}
        open={phaseModal}
        onClose={() => setPhaseModal(false)}
        wide
      >
        <form onSubmit={submitPhase} className="space-y-3">
          <Field label="Nombre">
            <input
              className="input"
              value={phaseForm.name}
              onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Descripcion">
            <textarea
              className="input"
              rows={2}
              value={phaseForm.description}
              onChange={(e) => setPhaseForm({ ...phaseForm, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Inicio">
              <input
                className="input"
                type="date"
                value={phaseForm.startDate}
                onChange={(e) => setPhaseForm({ ...phaseForm, startDate: e.target.value })}
                required
              />
            </Field>
            <Field label="Fin">
              <input
                className="input"
                type="date"
                value={phaseForm.endDate}
                onChange={(e) => setPhaseForm({ ...phaseForm, endDate: e.target.value })}
                required
              />
            </Field>
            <Field label="Estado">
              <select
                className="input"
                value={phaseForm.status}
                onChange={(e) =>
                  setPhaseForm({ ...phaseForm, status: e.target.value as ScheduleItemStatus })
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Peso">
              <input
                className="input"
                type="number"
                min={0.1}
                step={0.1}
                value={phaseForm.weight}
                onChange={(e) => setPhaseForm({ ...phaseForm, weight: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setPhaseModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal tarea */}
      <Modal
        title={editingTask ? "Editar tarea" : "Nueva tarea"}
        open={taskModal}
        onClose={() => setTaskModal(false)}
        wide
      >
        <form onSubmit={submitTask} className="space-y-3">
          <Field label="Fase">
            <select
              className="input"
              value={taskForm.phaseId}
              onChange={(e) => setTaskForm({ ...taskForm, phaseId: e.target.value })}
              required
            >
              {summary.phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nombre">
            <input
              className="input"
              value={taskForm.name}
              onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Descripcion">
            <textarea
              className="input"
              rows={2}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Inicio">
              <input
                className="input"
                type="date"
                value={taskForm.startDate}
                onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                required
              />
            </Field>
            <Field label="Fin">
              <input
                className="input"
                type="date"
                value={taskForm.endDate}
                onChange={(e) => setTaskForm({ ...taskForm, endDate: e.target.value })}
                required
              />
            </Field>
            <Field label="Estado">
              <select
                className="input"
                value={taskForm.status}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, status: e.target.value as ScheduleItemStatus })
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Peso">
              <input
                className="input"
                type="number"
                min={0.1}
                step={0.1}
                value={taskForm.weight}
                onChange={(e) => setTaskForm({ ...taskForm, weight: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setTaskModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal evolutivo */}
      <Modal
        title="Generar evolutivo"
        open={evolutivoModal}
        onClose={() => setEvolutivoModal(false)}
      >
        <form onSubmit={createEvolutivo} className="space-y-3">
          <p className="text-sm text-slate-600">
            Se creara un nuevo proyecto tipo <strong>evolutivo</strong> vinculado a este proyecto
            cerrado, con la plantilla estandar de fases (Iniciacion → Cierre).
          </p>
          <Field label="Nombre del evolutivo">
            <input
              className="input"
              value={evolutivoName}
              onChange={(e) => setEvolutivoName(e.target.value)}
              required
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setEvolutivoModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Creando..." : "Crear evolutivo"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function GanttBar({
  start,
  end,
  timelineStart,
  timelineEnd,
  color,
}: {
  start: string;
  end: string;
  timelineStart: string;
  timelineEnd: string;
  color: string;
}) {
  const total = rangeDays(timelineStart, timelineEnd) || 1;
  const left = Math.max(0, rangeDays(timelineStart, start) - 1);
  const width = Math.max(1, rangeDays(start, end));
  const leftPct = (left / total) * 100;
  const widthPct = Math.min(100 - leftPct, (width / total) * 100);
  return (
    <div className="relative h-5 w-full overflow-hidden rounded-md bg-slate-100">
      <div
        className={clsx("absolute top-0 h-full rounded-md", color)}
        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      />
    </div>
  );
}

function rangeDays(from: string, to: string): number {
  const a = new Date(from + "T12:00:00Z").getTime();
  const b = new Date(to + "T12:00:00Z").getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.floor((b - a) / 86400000) + 1;
}
