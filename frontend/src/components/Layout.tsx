import { NavLink, useLocation } from "react-router-dom";
import { LogOut, HelpCircle, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { useApp } from "../state/AppContext";
import { PROCESS_FILTERS } from "../lib/labels";
import { monthOptions } from "../lib/format";
import clsx from "clsx";

const TABS = [
  { to: "/", label: "Vista General", end: true },
  { to: "/semanal", label: "Seguimiento Semanal" },
  { to: "/encuestas", label: "Encuestas" },
  { to: "/ejecutivo", label: "Panel Ejecutivo" },
  { to: "/admin", label: "Panel Admin" },
  { to: "/auditoria", label: "Auditoria" },
  { to: "/ayuda", label: "Ayuda" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { process, setProcess, month, setMonth, projectQuery, setProjectQuery } = useApp();
  const location = useLocation();
  const isExec = location.pathname.startsWith("/ejecutivo");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              SP
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">Seguimiento de Proyectos</div>
              <div className="text-xs text-slate-500">PMO · Implementacion · CSM · I+D+I</div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-700">{user?.name || user?.email}</div>
              <div className="text-xs text-slate-500">
                {user?.email && user?.name ? `${user.email} · ` : ""}
                {user?.role}
              </div>
            </div>
            <NavLink
              to="/ayuda"
              className={({ isActive }) =>
                clsx(
                  "btn-secondary px-2.5",
                  isActive && "border-brand-300 bg-brand-50 text-brand-700"
                )
              }
              title="Centro de ayuda"
            >
              <HelpCircle size={16} />
            </NavLink>
            <button onClick={signOut} className="btn-secondary" title="Cerrar sesion">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 pb-2">
          <nav className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  clsx(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                    isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  )
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative w-full min-w-[200px] sm:w-64">
              <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
              <input
                className="input py-1.5 pl-8 pr-8"
                value={projectQuery}
                onChange={(e) => setProjectQuery(e.target.value)}
                placeholder="Buscar proyecto..."
                title="Filtra por nombre, responsable o categoria en todas las vistas"
              />
              {projectQuery && (
                <button
                  type="button"
                  className="absolute right-2 top-1.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => setProjectQuery("")}
                  title="Limpiar busqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {isExec && (
              <select
                className="input w-auto py-1.5"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                title="Mes"
              >
                {monthOptions().map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
            {!isExec && (
              <select
                className="input w-auto py-1.5"
                value={process}
                onChange={(e) => setProcess(e.target.value as typeof process)}
                title="Filtrar por proceso"
              >
                {PROCESS_FILTERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
