import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../api/client";
import type { Sla } from "../types";
import { Badge, Card, EmptyState, Field, Modal, Spinner } from "../components/ui";

type SlaForm = Omit<Sla, "id">;

const emptyForm = (): SlaForm => ({
  proyecto: "",
  codigo_cliente_ssc_atencion_whatsapp: "",
  csm_pm: "",
  coordinador_de_convenio: "",
  comercial: "",
  tipo_convenio: "",
  aliado: "",
  equipos_del_cliente: "",
  disponibilidad: "",
  horario_de_atencion: "",
  mdm_primera_atencion: "",
  mdm_resolucion: "",
  hardware_primera_atencion: "",
  hardware_intervencion: "",
  software_absoluto: "",
  software_urgente: "",
  software_no_urgente: "",
});

function displayValue(value: string | undefined | null): string {
  if (value == null) return "—";
  const trimmed = value.trim();
  return trimmed === "" ? "—" : value;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{displayValue(value)}</div>
    </div>
  );
}

function groupByProyecto(items: Sla[]): { proyecto: string; items: Sla[] }[] {
  const map = new Map<string, Sla[]>();
  for (const item of items) {
    const key = item.proyecto?.trim() || "(Sin proyecto)";
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([proyecto, groupItems]) => ({
      proyecto,
      items: [...groupItems].sort((a, b) =>
        (a.tipo_convenio || "").localeCompare(b.tipo_convenio || "", "es")
      ),
    }));
}

export default function Ans() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [items, setItems] = useState<Sla[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SlaForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Sla | null>(null);

  async function load(proyectoFilter?: string) {
    setLoading(true);
    setError(null);
    try {
      const filter = (proyectoFilter ?? activeQuery).trim();
      const data = filter
        ? await api.listSlasByProyecto(filter)
        : await api.listSlas();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al consultar ANS");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => groupByProyecto(items), [items]);

  function search(e?: FormEvent) {
    e?.preventDefault();
    const next = query.trim();
    setActiveQuery(next);
    setMsg(null);
    void load(next);
  }

  function openNew(prefillProyecto?: string) {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      proyecto: prefillProyecto ?? (activeQuery || ""),
    });
    setFormOpen(true);
    setError(null);
  }

  function openEdit(sla: Sla) {
    const { id, ...rest } = sla;
    void id;
    setEditingId(sla.id);
    setForm({ ...emptyForm(), ...rest });
    setFormOpen(true);
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      if (editingId) {
        await api.updateSla(editingId, form);
        setMsg("ANS actualizado correctamente.");
      } else {
        await api.createSla(form);
        setMsg("ANS creado correctamente.");
      }
      setFormOpen(false);
      await load(activeQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar ANS");
    } finally {
      setSaving(false);
    }
  }

  async function remove(sla: Sla) {
    if (!confirm("¿Está seguro de eliminar este ANS?")) return;
    setError(null);
    setMsg(null);
    try {
      await api.deleteSla(sla.id);
      setMsg("ANS eliminado correctamente.");
      if (detail?.id === sla.id) setDetail(null);
      await load(activeQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar ANS");
    }
  }

  function setField<K extends keyof SlaForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">ANS y Proyectos</h2>
        <div className="ml-auto">
          <button type="button" onClick={() => openNew()} className="btn-primary">
            <Plus size={16} /> Nuevo ANS
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Repositorio de consulta de proyectos y sus Acuerdos de Nivel de Servicio (ANS). Busca un
        proyecto para ver su informacion general y los tiempos asociados.
      </p>

      <Card>
        <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Buscar proyecto">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                <input
                  className="input pl-8"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Escriba el codigo o nombre del proyecto"
                />
              </div>
            </Field>
          </div>
          <button type="submit" className="btn-primary h-[38px] shrink-0">
            Buscar
          </button>
          {activeQuery && (
            <button
              type="button"
              className="btn-secondary h-[38px] shrink-0"
              onClick={() => {
                setQuery("");
                setActiveQuery("");
                setMsg(null);
                void load("");
              }}
            >
              Ver todos
            </button>
          )}
        </form>
      </Card>

      {msg && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
          {msg}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <Spinner label="Consultando ANS..." />
      ) : items.length === 0 ? (
        <EmptyState
          message={
            activeQuery
              ? "No se encontraron ANS para el proyecto consultado."
              : "No hay ANS registrados. Crea uno nuevo para comenzar."
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="text-sm font-medium text-slate-700">
            ANS encontrados: {items.length}
            {activeQuery ? (
              <span className="ml-2 font-normal text-slate-500">
                · Proyecto: <span className="font-medium text-slate-700">{activeQuery}</span>
              </span>
            ) : null}
          </div>

          {groups.map((group) => {
            return (
              <Card key={group.proyecto} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Informacion del proyecto</h3>
                    <div className="mt-1 text-lg font-semibold text-brand-700">{group.proyecto}</div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => openNew(group.proyecto === "(Sin proyecto)" ? "" : group.proyecto)}
                  >
                    <Plus size={14} /> Nuevo ANS
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    ANS
                  </h4>
                  <div className="space-y-3">
                    {group.items.map((sla) => (
                      <div
                        key={sla.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              Tipo de convenio: {displayValue(sla.tipo_convenio)}
                            </span>
                            <Badge className="border-slate-200 bg-white text-slate-600">
                              {displayValue(sla.disponibilidad)}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              className="btn-secondary px-2 py-1"
                              onClick={() => setDetail(sla)}
                              title="Ver detalle"
                            >
                              <Eye size={14} /> Ver detalle
                            </button>
                            <button
                              type="button"
                              className="btn-secondary px-2 py-1"
                              onClick={() => openEdit(sla)}
                              title="Editar"
                            >
                              <Pencil size={14} /> Editar
                            </button>
                            <button
                              type="button"
                              className="btn-danger px-2 py-1"
                              onClick={() => remove(sla)}
                              title="Eliminar"
                            >
                              <Trash2 size={14} /> Eliminar
                            </button>
                          </div>
                        </div>

                        <div className="mb-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                          <InfoItem label="Codigo cliente" value={sla.codigo_cliente_ssc_atencion_whatsapp} />
                          <InfoItem label="CSM / PM" value={sla.csm_pm} />
                          <InfoItem label="Coordinador" value={sla.coordinador_de_convenio} />
                          <InfoItem label="Comercial" value={sla.comercial} />
                          <InfoItem label="Aliado" value={sla.aliado} />
                          <InfoItem label="Disponibilidad" value={sla.disponibilidad} />
                          <InfoItem label="Horario de atencion" value={sla.horario_de_atencion} />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <InfoItem label="MDM 1a atencion" value={sla.mdm_primera_atencion} />
                          <InfoItem label="MDM resolucion" value={sla.mdm_resolucion} />
                          <InfoItem label="HW 1a atencion" value={sla.hardware_primera_atencion} />
                          <InfoItem label="HW intervencion" value={sla.hardware_intervencion} />
                          <InfoItem label="SW absoluto" value={sla.software_absoluto} />
                          <InfoItem label="SW urgente" value={sla.software_urgente} />
                          <InfoItem label="SW no urgente" value={sla.software_no_urgente} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        title={editingId ? "Editar ANS" : "Nuevo ANS"}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        wide
      >
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Proyecto *">
              <input
                className="input"
                value={form.proyecto}
                onChange={(e) => setField("proyecto", e.target.value)}
                required
              />
            </Field>
            <Field label="Tipo de convenio *">
              <input
                className="input"
                value={form.tipo_convenio}
                onChange={(e) => setField("tipo_convenio", e.target.value)}
                required
              />
            </Field>
            <Field label="Codigo cliente / SSC / WhatsApp">
              <input
                className="input"
                value={form.codigo_cliente_ssc_atencion_whatsapp}
                onChange={(e) => setField("codigo_cliente_ssc_atencion_whatsapp", e.target.value)}
              />
            </Field>
            <Field label="CSM / PM">
              <input
                className="input"
                value={form.csm_pm}
                onChange={(e) => setField("csm_pm", e.target.value)}
              />
            </Field>
            <Field label="Coordinador de convenio">
              <input
                className="input"
                value={form.coordinador_de_convenio}
                onChange={(e) => setField("coordinador_de_convenio", e.target.value)}
              />
            </Field>
            <Field label="Comercial">
              <input
                className="input"
                value={form.comercial}
                onChange={(e) => setField("comercial", e.target.value)}
              />
            </Field>
            <Field label="Aliado">
              <input
                className="input"
                value={form.aliado}
                onChange={(e) => setField("aliado", e.target.value)}
              />
            </Field>
            <Field label="Equipos del cliente">
              <input
                className="input"
                value={form.equipos_del_cliente}
                onChange={(e) => setField("equipos_del_cliente", e.target.value)}
              />
            </Field>
            <Field label="Disponibilidad">
              <input
                className="input"
                value={form.disponibilidad}
                onChange={(e) => setField("disponibilidad", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Horario de atencion">
            <textarea
              className="input min-h-[88px]"
              value={form.horario_de_atencion}
              onChange={(e) => setField("horario_de_atencion", e.target.value)}
            />
          </Field>

          <div className="border-t border-slate-100 pt-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tiempos ANS
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="MDM primera atencion">
                <input
                  className="input"
                  value={form.mdm_primera_atencion}
                  onChange={(e) => setField("mdm_primera_atencion", e.target.value)}
                />
              </Field>
              <Field label="MDM resolucion">
                <input
                  className="input"
                  value={form.mdm_resolucion}
                  onChange={(e) => setField("mdm_resolucion", e.target.value)}
                />
              </Field>
              <Field label="Hardware primera atencion">
                <input
                  className="input"
                  value={form.hardware_primera_atencion}
                  onChange={(e) => setField("hardware_primera_atencion", e.target.value)}
                />
              </Field>
              <Field label="Hardware intervencion">
                <input
                  className="input"
                  value={form.hardware_intervencion}
                  onChange={(e) => setField("hardware_intervencion", e.target.value)}
                />
              </Field>
              <Field label="Software absoluto">
                <input
                  className="input"
                  value={form.software_absoluto}
                  onChange={(e) => setField("software_absoluto", e.target.value)}
                />
              </Field>
              <Field label="Software urgente">
                <input
                  className="input"
                  value={form.software_urgente}
                  onChange={(e) => setField("software_urgente", e.target.value)}
                />
              </Field>
              <Field label="Software no urgente">
                <input
                  className="input"
                  value={form.software_no_urgente}
                  onChange={(e) => setField("software_no_urgente", e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear ANS"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal title="Detalle ANS" open={!!detail} onClose={() => setDetail(null)} wide>
        {detail && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Informacion general
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoItem label="Proyecto" value={detail.proyecto} />
                <InfoItem
                  label="Codigo cliente / SSC / WhatsApp"
                  value={detail.codigo_cliente_ssc_atencion_whatsapp}
                />
                <InfoItem label="CSM / PM" value={detail.csm_pm} />
                <InfoItem label="Coordinador de convenio" value={detail.coordinador_de_convenio} />
                <InfoItem label="Comercial" value={detail.comercial} />
                <InfoItem label="Tipo de convenio" value={detail.tipo_convenio} />
                <InfoItem label="Aliado" value={detail.aliado} />
                <InfoItem label="Equipos del cliente" value={detail.equipos_del_cliente} />
                <InfoItem label="Disponibilidad" value={detail.disponibilidad} />
                <InfoItem label="Horario de atencion" value={detail.horario_de_atencion} />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">ANS</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoItem label="MDM primera atencion" value={detail.mdm_primera_atencion} />
                <InfoItem label="MDM resolucion" value={detail.mdm_resolucion} />
                <InfoItem label="Hardware primera atencion" value={detail.hardware_primera_atencion} />
                <InfoItem label="Hardware intervencion" value={detail.hardware_intervencion} />
                <InfoItem label="Software absoluto" value={detail.software_absoluto} />
                <InfoItem label="Software urgente" value={detail.software_urgente} />
                <InfoItem label="Software no urgente" value={detail.software_no_urgente} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setDetail(null);
                  openEdit(detail);
                }}
              >
                <Pencil size={14} /> Editar
              </button>
              <button type="button" className="btn-primary" onClick={() => setDetail(null)}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
