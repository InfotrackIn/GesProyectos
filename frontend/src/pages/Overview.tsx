import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { api } from "../api/client";
import { useApp } from "../state/AppContext";
import type { Overview as OverviewData, Project } from "../types";
import { Badge, Card, Spinner, Stat } from "../components/ui";
import AlertsPanel from "../components/AlertsPanel";
import { fmtMoney, fmtPct } from "../lib/format";
import { matchesProjectSearch } from "../lib/search";
import { PROCESS_COLOR, PROCESS_LABEL, STATUS_COLOR, STATUS_LABEL } from "../lib/labels";

export default function Overview() {
  const { process, month, projectQuery } = useApp();
  const [data, setData] = useState<OverviewData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.overview(process, month), api.listProjects()])
      .then(([overview, list]) => {
        setData(overview);
        setProjects(list);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [process, month]);

  const matching = useMemo(
    () =>
      projects.filter(
        (p) => (process === "ALL" || p.process === process) && matchesProjectSearch(p, projectQuery)
      ),
    [projects, process, projectQuery]
  );

  if (loading) return <Spinner />;
  if (error) return <Card className="text-rose-600">{error}</Card>;
  if (!data) return null;

  const overOrUnder = data.cost.varianceAmount <= 0;
  const statusData = [
    { name: "En control", value: data.counts.control, color: "#10b981" },
    { name: "En riesgo", value: data.counts.riesgo, color: "#f59e0b" },
    { name: "Critico", value: data.counts.critico, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Proyectos" value={data.counts.total} />
        <Stat label="En control" value={data.counts.control} accent="text-emerald-600" />
        <Stat label="En riesgo" value={data.counts.riesgo} accent="text-amber-600" />
        <Stat label="Criticos" value={data.counts.critico} accent="text-rose-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Stat
          label="Avance promedio"
          value={fmtPct(data.avgProgress)}
          hint="Promedio de los proyectos visibles"
        />
        <Stat
          label="Presupuesto planificado"
          value={fmtMoney(data.cost.plannedTotal)}
          hint={`Real: ${fmtMoney(data.cost.realTotal)}`}
        />
        <Stat
          label="Variacion de costo"
          value={fmtMoney(data.cost.varianceAmount)}
          hint={fmtPct(data.cost.variancePct)}
          accent={overOrUnder ? "text-emerald-600" : "text-rose-600"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">Distribucion por estado</h3>
          {data.counts.total === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">Sin proyectos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {statusData.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {data.surveyApplies ? (
          <Card>
            <h3 className="mb-3 font-semibold text-slate-900">Resumen de encuestas</h3>
            {data.surveySummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">NPS</div>
                    <div className="text-2xl font-semibold text-slate-900">
                      {data.surveySummary.nps}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">CSAT</div>
                    <div className="text-2xl font-semibold text-slate-900">
                      {data.surveySummary.csat}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <div className="font-semibold text-emerald-700">{data.surveySummary.promoters}</div>
                    <div className="text-xs text-emerald-600">Promotores</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2">
                    <div className="font-semibold text-amber-700">{data.surveySummary.passives}</div>
                    <div className="text-xs text-amber-600">Pasivos</div>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-2">
                    <div className="font-semibold text-rose-700">{data.surveySummary.detractors}</div>
                    <div className="text-xs text-rose-600">Detractores</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {data.surveySummary.responses} respuestas totales
                </p>
              </div>
            ) : (
              <p className="p-6 text-center text-sm text-slate-500">Sin encuestas registradas.</p>
            )}
          </Card>
        ) : (
          <Card>
            <h3 className="mb-3 font-semibold text-slate-900">Resumen de encuestas</h3>
            <p className="p-6 text-center text-sm text-slate-500">
              Implementacion Interna e I+D+I no manejan indicadores de satisfaccion.
            </p>
          </Card>
        )}
      </div>

      <AlertsPanel alerts={data.alerts} />

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900">Proyectos</h3>
          <span className="text-xs text-slate-500">
            {matching.length} de {projects.filter((p) => process === "ALL" || p.process === process).length}
          </span>
        </div>
        {matching.length === 0 ? (
          <p className="p-4 text-center text-sm text-slate-500">
            {projectQuery.trim()
              ? `No hay proyectos que coincidan con "${projectQuery}".`
              : "Sin proyectos."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {matching.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                <Link
                  to={`/semanal`}
                  className="min-w-0 flex-1 font-medium text-slate-800 hover:text-brand-700"
                >
                  {p.name}
                </Link>
                <Badge className={PROCESS_COLOR[p.process]}>{PROCESS_LABEL[p.process]}</Badge>
                <Badge className={STATUS_COLOR[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                <span className="text-xs text-slate-500">{fmtPct(p.computed?.progress ?? 0)}</span>
                <Link to={`/cronograma/${p.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                  Cronograma
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
