import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search, User } from "lucide-react";
import { api } from "../api/client";
import { useApp } from "../state/AppContext";
import type { AuditAction, AuditEntityType, AuditEvent } from "../types";
import { Badge, Card, EmptyState, Spinner } from "../components/ui";
import {
  AUDIT_ACTION_COLOR,
  AUDIT_ACTION_LABEL,
  AUDIT_ENTITY_LABEL,
  PROCESS_COLOR,
  PROCESS_LABEL,
} from "../lib/labels";
import { fmtDateTime } from "../lib/format";
import { matchesText } from "../lib/search";

const ACTION_FILTERS: { value: AuditAction | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "create", label: "Altas" },
  { value: "update", label: "Cambios" },
  { value: "delete", label: "Bajas" },
  { value: "comment", label: "Comentarios" },
];

const ENTITY_FILTERS: { value: AuditEntityType | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "project", label: "Proyectos" },
  { value: "weekly_update", label: "Seguimiento" },
  { value: "schedule_phase", label: "Fases" },
  { value: "schedule_task", label: "Tareas" },
  { value: "evolutivo", label: "Evolutivos" },
];

export default function Audit() {
  const { projectQuery } = useApp();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [action, setAction] = useState<AuditAction | "ALL">("ALL");
  const [entity, setEntity] = useState<AuditEntityType | "ALL">("ALL");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.listAudit(200);
        if (!cancelled) setEvents(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return events.filter((e) => {
      if (action !== "ALL" && e.action !== action) return false;
      if (entity !== "ALL" && e.entityType !== entity) return false;
      if (projectQuery.trim()) {
        const projectHit = matchesText(
          [e.projectName, e.entityName, e.summary].filter(Boolean).join(" "),
          projectQuery
        );
        if (!projectHit) return false;
      }
      if (!term) return true;
      return [e.actorName, e.actorEmail, e.summary, e.projectName, e.entityName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [events, q, action, entity, projectQuery]);

  if (loading) return <Spinner />;
  if (error) return <Card className="text-rose-600">{error}</Card>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardList size={18} className="text-brand-600" />
        <h2 className="text-lg font-semibold text-slate-900">Auditoria</h2>
        <span className="text-sm text-slate-500">{visible.length} eventos</span>
      </div>
      <p className="text-sm text-slate-600">
        Registro de quien creo, actualizo, elimino o comento en la plataforma, usando la sesion del
        portal Impactia.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
          <input
            className="input pl-8"
            placeholder="Buscar por persona, proyecto o texto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={action}
          onChange={(e) => setAction(e.target.value as AuditAction | "ALL")}
        >
          {ACTION_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={entity}
          onChange={(e) => setEntity(e.target.value as AuditEntityType | "ALL")}
        >
          {ENTITY_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState message="Aun no hay eventos de auditoria para los filtros seleccionados." />
      ) : (
        <ul className="space-y-2">
          {visible.map((e) => (
            <li key={e.id}>
              <Card className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={AUDIT_ACTION_COLOR[e.action] ?? ""}>
                      {AUDIT_ACTION_LABEL[e.action] ?? e.action}
                    </Badge>
                    <Badge className="border-slate-200 bg-slate-100 text-slate-600">
                      {AUDIT_ENTITY_LABEL[e.entityType] ?? e.entityType}
                    </Badge>
                    {e.process && (
                      <Badge className={PROCESS_COLOR[e.process]}>{PROCESS_LABEL[e.process]}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-800">{e.summary}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <User size={12} />
                    <span className="font-medium text-slate-700">{e.actorName || "Usuario"}</span>
                    {e.actorEmail && <span>· {e.actorEmail}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-slate-500 sm:text-right">{fmtDateTime(e.at)}</div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
