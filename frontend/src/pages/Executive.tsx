import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Check, CalendarClock } from "lucide-react";
import clsx from "clsx";
import { api } from "../api/client";
import { useApp } from "../state/AppContext";
import { useAuth } from "../auth/AuthContext";
import type {
  Alert,
  ExecKpi,
  ExecPanel,
  ModuleSummary,
  Process,
  ProcessFilter,
  Severity,
  Task,
  WeeklyControl,
} from "../types";
import { Badge, Card, EmptyState, Field, Modal, Spinner } from "../components/ui";
import {
  CONTROL_LABEL,
  CUMPLIMIENTO_COLOR,
  CUMPLIMIENTO_LABEL,
  MODULE_STATUS_COLOR,
  MODULE_STATUS_LABEL,
  PROCESS_COLOR,
  PROCESS_FILTERS,
  PROCESS_LABEL,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
} from "../lib/labels";
import { fmtDate, fmtMoney } from "../lib/format";
import { matchesText } from "../lib/search";

export default function Executive() {
  const { month } = useApp();
  const { user } = useAuth();
  const isAdmin = user?.role === "Administrador";

  // Filtro de proceso independiente del resto de pestanas (Epica 8).
  const [proc, setProc] = useState<ProcessFilter>("ALL");
  const [panel, setPanel] = useState<ExecPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    api
      .execPanel(proc, month)
      .then(setPanel)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [proc, month]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Panel Ejecutivo</h2>
        <select
          className="input w-auto py-1.5"
          value={proc}
          onChange={(e) => setProc(e.target.value as ProcessFilter)}
        >
          {PROCESS_FILTERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {isAdmin && (
          <button
            onClick={() => setEditMode((v) => !v)}
            className={clsx("ml-auto", editMode ? "btn-primary" : "btn-secondary")}
          >
            {editMode ? <Check size={16} /> : <Pencil size={16} />}
            {editMode ? "Finalizar edicion" : "Modo edicion"}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading || !panel ? (
        <Spinner />
      ) : (
        <>
          <SummaryBar panel={panel} month={month} proc={proc} />
          <KpiSection panel={panel} month={month} edit={editMode} onChange={reload} />
          <ModulesSection panel={panel} month={month} edit={editMode} onChange={reload} />
          <div className="grid gap-5 lg:grid-cols-2">
            <AlertsSection panel={panel} month={month} edit={editMode} onChange={reload} />
            <TasksSection panel={panel} month={month} edit={editMode} onChange={reload} />
          </div>
          <ControlsSection panel={panel} month={month} edit={editMode} onChange={reload} />
        </>
      )}
    </div>
  );
}

function SummaryBar({ panel, month, proc }: { panel: ExecPanel; month: string; proc: ProcessFilter }) {
  return (
    <Card className="flex flex-wrap items-center gap-4">
      <div>
        <div className="text-xs uppercase text-slate-500">Periodo</div>
        <div className="font-semibold text-slate-900">{month}</div>
      </div>
      <div>
        <div className="text-xs uppercase text-slate-500">Equipo evaluado</div>
        <div className="font-semibold text-slate-900">
          {proc === "ALL" ? "Todos los procesos" : PROCESS_LABEL[proc]}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase text-slate-500">Indicadores cumplidos</div>
        <div className="font-semibold text-slate-900">
          {panel.summary.kpisMet} / {panel.summary.kpisTotal}
        </div>
      </div>
    </Card>
  );
}

// ------------------------------- KPIs --------------------------------

const emptyKpi = (month: string): Partial<ExecKpi> => ({
  process: "PMO",
  month,
  name: "",
  value: 0,
  goal: 0,
});

function KpiSection({
  panel,
  month,
  edit,
  onChange,
}: {
  panel: ExecPanel;
  month: string;
  edit: boolean;
  onChange: () => void;
}) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<ExecKpi>>(emptyKpi(month));

  async function save() {
    await api.upsertKpi({ ...form, month });
    setModal(false);
    onChange();
  }

  return (
    <section>
      <SectionHeader title="Metas mensuales por indicador" edit={edit} onAdd={() => { setForm(emptyKpi(month)); setModal(true); }} />
      {panel.kpis.length === 0 ? (
        <EmptyState message="Sin indicadores para este periodo." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {panel.kpis.map((k) => (
            <Card key={k.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-slate-900">{k.name}</div>
                  <Badge className={PROCESS_COLOR[k.process]}>{PROCESS_LABEL[k.process]}</Badge>
                </div>
                {edit && (
                  <div className="flex gap-1">
                    <button className="btn-secondary px-2 py-1" onClick={() => { setForm(k); setModal(true); }}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn-danger px-2 py-1" onClick={async () => { await api.deleteKpi(k.id, month); onChange(); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-semibold text-slate-900">{k.value}</div>
                  <div className="text-xs text-slate-500">Meta: {k.goal}</div>
                </div>
                {k.label && (
                  <Badge className={CUMPLIMIENTO_COLOR[k.label]}>
                    {CUMPLIMIENTO_LABEL[k.label]} · {k.pct}%
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal title="Indicador" open={modal} onClose={() => setModal(false)}>
        <div className="space-y-3">
          <Field label="Nombre">
            <input className="input" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Proceso">
              <select className="input" value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value as Process })}>
                <option value="PMO">PMO</option>
                <option value="IMPL">Implementacion</option>
                <option value="CSM">CSM</option>
              </select>
            </Field>
            <Field label="Valor">
              <input className="input" type="number" step="any" value={form.value ?? 0} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            </Field>
            <Field label="Meta">
              <input className="input" type="number" step="any" value={form.goal ?? 0} onChange={(e) => setForm({ ...form, goal: Number(e.target.value) })} />
            </Field>
          </div>
          <ModalActions onCancel={() => setModal(false)} onSave={save} />
        </div>
      </Modal>
    </section>
  );
}

// ------------------------------ Modules ------------------------------

function ModulesSection({
  panel,
  month,
  edit,
  onChange,
}: {
  panel: ExecPanel;
  month: string;
  edit: boolean;
  onChange: () => void;
}) {
  return (
    <section>
      <SectionHeader title="Resumen operativo por modulo" edit={false} onAdd={() => {}} />
      {panel.modules.length === 0 ? (
        <EmptyState message="Sin modulos configurados para este periodo." />
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {panel.modules.map((m) => (
            <ModuleCard key={m.process} mod={m} month={month} edit={edit} onChange={onChange} />
          ))}
        </div>
      )}
    </section>
  );
}

function ModuleCard({
  mod,
  month,
  edit,
  onChange,
}: {
  mod: ModuleSummary;
  month: string;
  edit: boolean;
  onChange: () => void;
}) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<ModuleSummary>(mod);

  async function save() {
    await api.upsertModule({ ...form, month });
    setModal(false);
    onChange();
  }

  return (
    <Card className={clsx("space-y-3 border-t-4", borderColor(mod.process))}>
      <div className="flex items-center justify-between">
        <Badge className={PROCESS_COLOR[mod.process]}>{PROCESS_LABEL[mod.process]}</Badge>
        <Badge className={MODULE_STATUS_COLOR[mod.updateStatus]}>
          {MODULE_STATUS_LABEL[mod.updateStatus]}
        </Badge>
      </div>
      <div>
        <div className="text-3xl font-semibold text-slate-900">{mod.totalProjects}</div>
        <div className="text-xs text-slate-500">proyectos administrados</div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {mod.breakdown.map((b) => (
          <div key={b.label} className="rounded-lg bg-slate-50 p-2">
            <div className="text-lg font-semibold text-slate-900">{b.count}</div>
            <div className="text-[11px] text-slate-500">{b.label}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {mod.metrics.map((m) => (
          <Badge key={m.label} className="border-slate-200 bg-slate-100 text-slate-600">
            {m.label}: {m.value}
          </Badge>
        ))}
      </div>
      <a
        href={`/semanal`}
        className="block text-sm font-medium text-brand-600 hover:underline"
      >
        Ver seguimiento semanal →
      </a>
      {edit && (
        <button className="btn-secondary w-full" onClick={() => { setForm(mod); setModal(true); }}>
          <Pencil size={14} /> Editar modulo
        </button>
      )}

      <Modal title={`Modulo ${PROCESS_LABEL[mod.process]}`} open={modal} onClose={() => setModal(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total proyectos">
              <input className="input" type="number" value={form.totalProjects} onChange={(e) => setForm({ ...form, totalProjects: Number(e.target.value) })} />
            </Field>
            <Field label="Estado de actualizacion">
              <select className="input" value={form.updateStatus} onChange={(e) => setForm({ ...form, updateStatus: e.target.value as ModuleSummary["updateStatus"] })}>
                <option value="alDia">Al dia</option>
                <option value="pendiente">Pendiente</option>
                <option value="enConstruccion">En construccion</option>
              </select>
            </Field>
          </div>
          <div className="text-xs font-medium text-slate-600">Desglose (3 categorias)</div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input
                className="input"
                placeholder="Categoria"
                value={form.breakdown[i]?.label ?? ""}
                onChange={(e) => updateArr(form, setForm, "breakdown", i, { label: e.target.value, count: form.breakdown[i]?.count ?? 0 })}
              />
              <input
                className="input"
                type="number"
                placeholder="Conteo"
                value={form.breakdown[i]?.count ?? 0}
                onChange={(e) => updateArr(form, setForm, "breakdown", i, { label: form.breakdown[i]?.label ?? "", count: Number(e.target.value) })}
              />
            </div>
          ))}
          <ModalActions onCancel={() => setModal(false)} onSave={save} />
        </div>
      </Modal>
    </Card>
  );
}

// ------------------------------ Alerts -------------------------------

const emptyAlert = (): Partial<Alert> & { month: string } => ({
  process: "PMO",
  severity: "medio",
  title: "",
  description: "",
  month: "",
});

function AlertsSection({
  panel,
  month,
  edit,
  onChange,
}: {
  panel: ExecPanel;
  month: string;
  edit: boolean;
  onChange: () => void;
}) {
  const { projectQuery } = useApp();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Alert> & { month: string }>(emptyAlert());
  const alerts = panel.alerts.filter((a) =>
    matchesText(`${a.title} ${a.description ?? ""}`, projectQuery)
  );

  async function save() {
    await api.upsertAlert({ ...form, month });
    setModal(false);
    onChange();
  }

  return (
    <section>
      <SectionHeader title="Alertas activas" edit={edit} onAdd={() => { setForm(emptyAlert()); setModal(true); }} />
      {alerts.length === 0 ? (
        <EmptyState message={projectQuery.trim() ? "Sin alertas para la busqueda." : "Sin alertas activas."} />
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={SEVERITY_COLOR[a.severity]}>{SEVERITY_LABEL[a.severity]}</Badge>
                <Badge className={PROCESS_COLOR[a.process]}>{PROCESS_LABEL[a.process]}</Badge>
                <span className="font-medium text-slate-800">{a.title}</span>
                {a.valueAtRisk != null && a.valueAtRisk > 0 && (
                  <span className="text-sm font-semibold text-rose-600">{fmtMoney(a.valueAtRisk)}</span>
                )}
                {edit && (
                  <span className="ml-auto flex gap-1">
                    <button className="btn-secondary px-2 py-1" onClick={() => { setForm({ ...a, month }); setModal(true); }}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn-danger px-2 py-1" onClick={async () => { await api.deleteAlert(a.id, month); onChange(); }}>
                      <Trash2 size={14} />
                    </button>
                  </span>
                )}
              </div>
              {a.description && <p className="mt-1 text-sm text-slate-600">{a.description}</p>}
            </li>
          ))}
        </ul>
      )}

      <Modal title="Alerta" open={modal} onClose={() => setModal(false)}>
        <div className="space-y-3">
          <Field label="Titulo (cliente o proyecto)">
            <input className="input" value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Proceso">
              <select className="input" value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value as Process })}>
                <option value="PMO">PMO</option>
                <option value="IMPL">Implementacion</option>
                <option value="CSM">CSM</option>
              </select>
            </Field>
            <Field label="Severidad">
              <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}>
                <option value="critico">Critico</option>
                <option value="alto">Alto</option>
                <option value="medio">Medio</option>
              </select>
            </Field>
          </div>
          <Field label="Descripcion del riesgo">
            <textarea className="input" rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Valor en riesgo (opcional)">
            <input className="input" type="number" step="any" value={form.valueAtRisk ?? 0} onChange={(e) => setForm({ ...form, valueAtRisk: Number(e.target.value) })} />
          </Field>
          <ModalActions onCancel={() => setModal(false)} onSave={save} />
        </div>
      </Modal>
    </section>
  );
}

// ------------------------------- Tasks -------------------------------

const emptyTask = (month: string): Partial<Task> => ({ month, title: "", moduleLabel: "", dueDate: "" });

function TasksSection({
  panel,
  month,
  edit,
  onChange,
}: {
  panel: ExecPanel;
  month: string;
  edit: boolean;
  onChange: () => void;
}) {
  const { projectQuery } = useApp();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Task>>(emptyTask(month));
  const tasks = panel.tasks.filter((t) =>
    matchesText(`${t.title} ${t.moduleLabel ?? ""}`, projectQuery)
  );

  async function save() {
    await api.upsertTask({ ...form, month });
    setModal(false);
    onChange();
  }

  return (
    <section>
      <SectionHeader title="Tareas urgentes y proximas" edit={edit} onAdd={() => { setForm(emptyTask(month)); setModal(true); }} />
      {tasks.length === 0 ? (
        <EmptyState message={projectQuery.trim() ? "Sin tareas para la busqueda." : "Sin tareas registradas."} />
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="card flex items-center gap-3 p-3">
              <CalendarClock size={18} className="text-slate-400" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-800">{t.title}</div>
                <div className="text-xs text-slate-500">
                  <Badge className="border-slate-200 bg-slate-100 text-slate-600">{t.moduleLabel}</Badge>
                  <span className="ml-2">{fmtDate(t.dueDate)}</span>
                </div>
              </div>
              {edit && (
                <span className="flex gap-1">
                  <button className="btn-secondary px-2 py-1" onClick={() => { setForm(t); setModal(true); }}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn-danger px-2 py-1" onClick={async () => { await api.deleteTask(t.id, month); onChange(); }}>
                    <Trash2 size={14} />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal title="Tarea" open={modal} onClose={() => setModal(false)}>
        <div className="space-y-3">
          <Field label="Titulo">
            <input className="input" value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modulo / responsable">
              <input className="input" value={form.moduleLabel ?? ""} onChange={(e) => setForm({ ...form, moduleLabel: e.target.value })} />
            </Field>
            <Field label="Vencimiento (opcional)">
              <input className="input" type="date" value={form.dueDate ?? ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
          </div>
          <ModalActions onCancel={() => setModal(false)} onSave={save} />
        </div>
      </Modal>
    </section>
  );
}

// -------------------------- Weekly controls --------------------------

const emptyControl = (month: string): Partial<WeeklyControl> => ({
  month,
  week: "S1",
  process: "PMO",
  team: "",
  responsibles: [],
  status: "pendiente",
});

function ControlsSection({
  panel,
  month,
  edit,
  onChange,
}: {
  panel: ExecPanel;
  month: string;
  edit: boolean;
  onChange: () => void;
}) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<WeeklyControl>>(emptyControl(month));
  const [responsiblesText, setResponsiblesText] = useState("");

  async function save() {
    await api.upsertControl({
      ...form,
      month,
      responsibles: responsiblesText.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setModal(false);
    onChange();
  }

  return (
    <section>
      <SectionHeader
        title="Control de actualizacion semanal"
        edit={edit}
        onAdd={() => { setForm(emptyControl(month)); setResponsiblesText(""); setModal(true); }}
      />
      {panel.controls.length === 0 ? (
        <EmptyState message="Sin control semanal registrado." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="p-2">Semana</th>
                <th className="p-2">Proceso</th>
                <th className="p-2">Equipo</th>
                <th className="p-2">Responsables</th>
                <th className="p-2">Estado</th>
                {edit && <th className="p-2"></th>}
              </tr>
            </thead>
            <tbody>
              {panel.controls.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="p-2 font-medium">{c.week}</td>
                  <td className="p-2">
                    <Badge className={PROCESS_COLOR[c.process]}>{PROCESS_LABEL[c.process]}</Badge>
                  </td>
                  <td className="p-2">{c.team}</td>
                  <td className="p-2 text-slate-600">{c.responsibles.join(", ")}</td>
                  <td className="p-2">
                    <Badge
                      className={
                        c.status === "alDia"
                          ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                          : "border-amber-200 bg-amber-100 text-amber-700"
                      }
                    >
                      {CONTROL_LABEL[c.status]}
                    </Badge>
                  </td>
                  {edit && (
                    <td className="p-2">
                      <span className="flex gap-1">
                        <button
                          className="btn-secondary px-2 py-1"
                          onClick={() => {
                            setForm(c);
                            setResponsiblesText(c.responsibles.join(", "));
                            setModal(true);
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button className="btn-danger px-2 py-1" onClick={async () => { await api.deleteControl(c.id, month); onChange(); }}>
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Control semanal" open={modal} onClose={() => setModal(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Semana">
              <input className="input" value={form.week ?? ""} onChange={(e) => setForm({ ...form, week: e.target.value })} placeholder="S1" />
            </Field>
            <Field label="Proceso">
              <select className="input" value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value as Process })}>
                <option value="PMO">PMO</option>
                <option value="IMPL">Implementacion</option>
                <option value="CSM">CSM</option>
              </select>
            </Field>
          </div>
          <Field label="Equipo">
            <input className="input" value={form.team ?? ""} onChange={(e) => setForm({ ...form, team: e.target.value })} />
          </Field>
          <Field label="Responsables (separados por coma)">
            <input className="input" value={responsiblesText} onChange={(e) => setResponsiblesText(e.target.value)} />
          </Field>
          <Field label="Estado">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WeeklyControl["status"] })}>
              <option value="alDia">Al dia</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </Field>
          <ModalActions onCancel={() => setModal(false)} onSave={save} />
        </div>
      </Modal>
    </section>
  );
}

// ------------------------------ helpers ------------------------------

function SectionHeader({ title, edit, onAdd }: { title: string; edit: boolean; onAdd: () => void }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {edit && (
        <button className="btn-secondary ml-auto px-2 py-1 text-xs" onClick={onAdd}>
          <Plus size={14} /> Agregar
        </button>
      )}
    </div>
  );
}

function ModalActions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button className="btn-secondary" onClick={onCancel}>
        Cancelar
      </button>
      <button className="btn-primary" onClick={onSave}>
        Guardar
      </button>
    </div>
  );
}

function borderColor(p: Process): string {
  return p === "PMO" ? "border-t-violet-400" : p === "IMPL" ? "border-t-cyan-400" : "border-t-pink-400";
}

function updateArr(
  form: ModuleSummary,
  setForm: (m: ModuleSummary) => void,
  key: "breakdown",
  index: number,
  value: { label: string; count: number }
) {
  const arr = [...form[key]];
  arr[index] = value;
  setForm({ ...form, [key]: arr });
}
