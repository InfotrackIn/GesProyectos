import { useEffect, useState, type FormEvent } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { api } from "../api/client";
import type { Process, Survey } from "../types";
import { Badge, EmptyState, Field, Modal, Spinner } from "../components/ui";
import { PROCESS_LABEL } from "../lib/labels";
import { currentMonth } from "../lib/format";

const emptyForm = {
  process: "PMO" as Process,
  period: currentMonth(),
  nps: 0,
  responses: 0,
  csat: 0,
  promoters: 0,
  passives: 0,
  detractors: 0,
};

export default function Surveys() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      setSurveys(await api.listSurveys());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.upsertSurvey(form);
      setModal(false);
      setForm(emptyForm);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function sync() {
    setSyncing(true);
    setMsg(null);
    setError(null);
    try {
      const res = await api.syncSurveys();
      if (!res.configured) {
        setMsg(res.message ?? "Supabase no configurado. Modo manual activo.");
      } else {
        setMsg(`Sincronizacion completada: ${res.imported} periodos importados desde Supabase.`);
        await reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Encuestas de satisfaccion (NPS / CSAT)</h2>
        <div className="ml-auto flex gap-2">
          <button onClick={sync} className="btn-secondary" disabled={syncing}>
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            Sincronizar Supabase
          </button>
          <button onClick={() => setModal(true)} className="btn-primary">
            <Plus size={16} /> Registrar periodo
          </button>
        </div>
      </div>

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

      <p className="text-sm text-slate-500">
        Solo aplica a PMO y CSM. Implementacion Interna no maneja indicadores de satisfaccion.
      </p>

      {loading ? (
        <Spinner />
      ) : surveys.length === 0 ? (
        <EmptyState message="No hay encuestas registradas. Registra un periodo o sincroniza con Supabase." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="p-2">Proceso</th>
                <th className="p-2">Periodo</th>
                <th className="p-2">NPS</th>
                <th className="p-2">CSAT</th>
                <th className="p-2">Respuestas</th>
                <th className="p-2">Prom.</th>
                <th className="p-2">Pas.</th>
                <th className="p-2">Detr.</th>
                <th className="p-2">Origen</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((s) => (
                <tr key={`${s.process}-${s.period}`} className="border-b border-slate-100">
                  <td className="p-2">
                    <Badge className="border-slate-200 bg-slate-100 text-slate-600">
                      {PROCESS_LABEL[s.process]}
                    </Badge>
                  </td>
                  <td className="p-2 font-medium">{s.period}</td>
                  <td className="p-2">{s.nps}</td>
                  <td className="p-2">{s.csat}</td>
                  <td className="p-2">{s.responses}</td>
                  <td className="p-2 text-emerald-600">{s.promoters}</td>
                  <td className="p-2 text-amber-600">{s.passives}</td>
                  <td className="p-2 text-rose-600">{s.detractors}</td>
                  <td className="p-2">
                    <Badge
                      className={
                        s.source === "supabase"
                          ? "border-brand-200 bg-brand-50 text-brand-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }
                    >
                      {s.source}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Registrar periodo de encuesta" open={modal} onClose={() => setModal(false)}>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Proceso">
              <select
                className="input"
                value={form.process}
                onChange={(e) => setForm({ ...form, process: e.target.value as Process })}
              >
                <option value="PMO">PMO</option>
                <option value="CSM">CSM</option>
              </select>
            </Field>
            <Field label="Periodo (yyyy-mm)">
              <input
                className="input"
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                placeholder="2026-06"
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="NPS" value={form.nps} onChange={(v) => setForm({ ...form, nps: v })} />
            <NumberField label="CSAT" value={form.csat} onChange={(v) => setForm({ ...form, csat: v })} />
            <NumberField
              label="Respuestas"
              value={form.responses}
              onChange={(v) => setForm({ ...form, responses: v })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumberField
              label="Promotores"
              value={form.promoters}
              onChange={(v) => setForm({ ...form, promoters: v })}
            />
            <NumberField
              label="Pasivos"
              value={form.passives}
              onChange={(v) => setForm({ ...form, passives: v })}
            />
            <NumberField
              label="Detractores"
              value={form.detractors}
              onChange={(v) => setForm({ ...form, detractors: v })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function NumberField({
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
        step="any"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}
