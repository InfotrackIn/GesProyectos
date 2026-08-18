import { AlertTriangle } from "lucide-react";
import type { Alert } from "../types";
import { Badge, Card, EmptyState } from "./ui";
import { PROCESS_LABEL, SEVERITY_COLOR, SEVERITY_LABEL } from "../lib/labels";
import { fmtMoney } from "../lib/format";

export default function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const sorted = [...alerts].sort((a, b) => rank(b.severity) - rank(a.severity));
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={18} className="text-rose-500" />
        <h3 className="font-semibold text-slate-900">Alertas activas</h3>
        <Badge className="ml-auto border-slate-200 bg-slate-100 text-slate-600">{alerts.length}</Badge>
      </div>
      {sorted.length === 0 ? (
        <EmptyState message="Sin alertas activas para el filtro seleccionado." />
      ) : (
        <ul className="space-y-2">
          {sorted.map((a) => (
            <li key={a.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={SEVERITY_COLOR[a.severity]}>{SEVERITY_LABEL[a.severity]}</Badge>
                <Badge className="border-slate-200 bg-slate-100 text-slate-600">
                  {PROCESS_LABEL[a.process]}
                </Badge>
                <span className="font-medium text-slate-800">{a.title}</span>
                {a.valueAtRisk != null && a.valueAtRisk > 0 && (
                  <span className="ml-auto text-sm font-semibold text-rose-600">
                    {fmtMoney(a.valueAtRisk)} en riesgo
                  </span>
                )}
              </div>
              {a.description && <p className="mt-1 text-sm text-slate-600">{a.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function rank(s: Alert["severity"]): number {
  return s === "critico" ? 3 : s === "alto" ? 2 : 1;
}
