import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, Database, CalendarRange } from "lucide-react";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useApp } from "../state/AppContext";
import type { Process, Project, ProjectPhase, ProjectStatus } from "../types";
import { Badge, Card, EmptyState, Field, Modal, Spinner } from "../components/ui";
import {
  PHASE_COLOR,
  PHASE_LABEL,
  PROCESS_COLOR,
  PROCESS_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
} from "../lib/labels";
import { fmtDate, fmtDays, fmtMoney } from "../lib/format";
import { matchesProjectSearch } from "../lib/search";

type FormState = Omit<Project, "createdAt" | "updatedAt" | "computed">;

function emptyProject(defaultProcess: Process): FormState {
  const today = new Date().toISOString().slice(0, 10);
  const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  return {
    id: "",
    name: "",
    category: "General",
    process: defaultProcess,
    status: "control",
    phase: "en_progreso",
    owner: "",
    kind: "proyecto",
    startDate: today,
    endDatePlanned: in90,
    endDateDeal: in90,
    progressMode: "manual",
    manualProgress: 0,
    plannedSetupCost: 0,
    plannedRecurringCost: 0,
    realCost: 0,
    monthlyRevenue: 0,
    totalValue: 0,
  };
}

export default function Admin() {
  const { user } = useAuth();
  const { process, projectQuery } = useApp();
  const isAdmin = user?.role === "Administrador";
  const defaultProcess: Process = isAdmin ? "PMO" : "IMPL";

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyProject(defaultProcess));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

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

  const visible = useMemo(
    () =>
      projects.filter(
        (p) => (process === "ALL" || p.process === process) && matchesProjectSearch(p, projectQuery)
      ),
    [projects, process, projectQuery]
  );

  function openNew() {
    setForm(emptyProject(defaultProcess));
    setEditing(false);
    setModal(true);
  }

  function openEdit(p: Project) {
    const { computed, createdAt, updatedAt, ...rest } = p;
    void computed;
    void createdAt;
    void updatedAt;
    setForm({
      ...emptyProject(defaultProcess),
      ...rest,
      phase: rest.phase ?? "en_progreso",
      owner: rest.owner ?? "",
      endDateDeal: rest.endDateDeal || rest.endDatePlanned,
    });
    setEditing(true);
    setModal(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { id, ...payload } = form;
      if (editing) await api.updateProject(id, payload);
      else await api.createProject(payload);
      setModal(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function remove(p: Project) {
    if (!confirm(`Eliminar el proyecto "${p.name}"? Esta accion no se puede deshacer.`)) return;
    await api.deleteProject(p.id);
    await reload();
  }

  async function seed() {
    if (!confirm("Cargar datos de ejemplo en el tablero?")) return;
    setSeeding(true);
    try {
      await api.seed();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Panel Admin · Proyectos</h2>
        <div className="ml-auto flex gap-2">
          {isAdmin && (
            <button onClick={seed} className="btn-secondary" disabled={seeding}>
              <Database size={16} /> {seeding ? "Cargando..." : "Datos de ejemplo"}
            </button>
          )}
          <button onClick={openNew} className="btn-primary">
            <Plus size={16} /> Nuevo proyecto
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-700">
          Perfil Implementador: solo puedes crear y editar proyectos de Implementacion Interna.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState
          message={
            projectQuery.trim()
              ? `No hay proyectos que coincidan con "${projectQuery}".`
              : "No hay proyectos. Crea uno nuevo o carga datos de ejemplo."
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((p) => {
            const cost = p.computed?.cost;
            return (
              <Card key={p.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.category}</div>
                  </div>
                  <div className="flex gap-1">
                    <Link
                      to={`/cronograma/${p.id}`}
                      className="btn-secondary px-2 py-1"
                      title="Cronograma"
                    >
                      <CalendarRange size={14} />
                    </Link>
                    <button onClick={() => openEdit(p)} className="btn-secondary px-2 py-1" title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(p)} className="btn-danger px-2 py-1" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={PROCESS_COLOR[p.process]}>{PROCESS_LABEL[p.process]}</Badge>
                  <Badge className={PHASE_COLOR[p.phase ?? "en_progreso"]}>
                    {PHASE_LABEL[p.phase ?? "en_progreso"]}
                  </Badge>
                  <Badge className={STATUS_COLOR[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  <Badge className="border-slate-200 bg-slate-100 text-slate-600">
                    Avance {p.manualProgress ?? 0}%
                  </Badge>
                  {p.kind === "evolutivo" && (
                    <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
                      Evolutivo {p.evolutivoSeq ?? ""}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Responsable: {p.owner?.trim() ? p.owner : "Sin asignar"}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                  <div>
                    <div className="text-slate-400">Inicio</div>
                    <div className="font-medium">{fmtDate(p.startDate)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Tentativa</div>
                    <div className="font-medium">{fmtDate(p.endDatePlanned)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Deal</div>
                    <div className="font-medium">{fmtDate(p.endDateDeal || p.endDatePlanned)}</div>
                  </div>
                </div>
                {p.computed?.dates && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>Duracion plan: {p.computed.dates.durationPlannedDays} d</span>
                    <span>Duracion deal: {p.computed.dates.durationDealDays} d</span>
                    <span
                      className={clsx(
                        "font-medium",
                        p.computed.dates.behindDeal ? "text-rose-600" : "text-emerald-600"
                      )}
                    >
                      Desfase: {fmtDays(p.computed.dates.slipDays)}
                      {p.computed.dates.behindDeal ? " (vs deal)" : " (holgura)"}
                    </span>
                  </div>
                )}
                {cost && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Planificado</div>
                      <div className="font-medium">{fmtMoney(cost.planned)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Real</div>
                      <div
                        className={clsx(
                          "font-medium",
                          cost.overBudget ? "text-rose-600" : "text-emerald-600"
                        )}
                      >
                        {fmtMoney(cost.real)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Variacion</div>
                      <div
                        className={clsx(
                          "font-medium",
                          cost.overBudget ? "text-rose-600" : "text-emerald-600"
                        )}
                      >
                        {cost.variancePct}%
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span>Ingreso mensual: {fmtMoney(p.monthlyRevenue)}</span>
                  <span>Valor total: {fmtMoney(p.totalValue)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        title={editing ? "Editar proyecto" : "Nuevo proyecto"}
        open={modal}
        onClose={() => setModal(false)}
        wide
      >
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre">
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Categoria">
              <input
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Responsable">
            <input
              className="input"
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
              placeholder="Nombre del responsable"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Field label="Proceso">
              <select
                className="input"
                value={form.process}
                onChange={(e) => setForm({ ...form, process: e.target.value as Process })}
                disabled={!isAdmin}
              >
                <option value="PMO">PMO</option>
                <option value="IMPL">Implementacion Interna</option>
                <option value="CSM">CSM</option>
              </select>
            </Field>
            <Field label="Estado del proyecto">
              <select
                className="input"
                value={form.phase}
                onChange={(e) => setForm({ ...form, phase: e.target.value as ProjectPhase })}
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
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
              >
                <option value="control">En control</option>
                <option value="riesgo">En riesgo</option>
                <option value="critico">Critico</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Fecha inicio">
              <input
                className="input"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>
            <Field label="Fecha tentativa fin">
              <input
                className="input"
                type="date"
                value={form.endDatePlanned}
                onChange={(e) => setForm({ ...form, endDatePlanned: e.target.value })}
              />
            </Field>
            <Field label="Fecha deal">
              <input
                className="input"
                type="date"
                value={form.endDateDeal || form.endDatePlanned}
                onChange={(e) => setForm({ ...form, endDateDeal: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="% de avance">
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.manualProgress}
                onChange={(e) => setForm({ ...form, manualProgress: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <NumField
              label="Costo setup plan."
              value={form.plannedSetupCost}
              onChange={(v) => setForm({ ...form, plannedSetupCost: v })}
            />
            <NumField
              label="Costo recurrente plan."
              value={form.plannedRecurringCost}
              onChange={(v) => setForm({ ...form, plannedRecurringCost: v })}
            />
            <NumField
              label="Costo real"
              value={form.realCost}
              onChange={(v) => setForm({ ...form, realCost: v })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="Ingreso mensual"
              value={form.monthlyRevenue}
              onChange={(v) => setForm({ ...form, monthlyRevenue: v })}
            />
            <NumField
              label="Valor total del proyecto"
              value={form.totalValue}
              onChange={(v) => setForm({ ...form, totalValue: v })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {editing ? "Guardar cambios" : "Crear proyecto"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        className="input"
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          const n = Number(raw);
          onChange(Number.isFinite(n) ? Math.round(Math.max(0, n) * 100) / 100 : 0);
        }}
      />
    </Field>
  );
}
