import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ProcessFilter } from "../types";
import { currentMonth } from "../lib/format";

interface AppState {
  process: ProcessFilter;
  setProcess: (p: ProcessFilter) => void;
  month: string;
  setMonth: (m: string) => void;
  projectQuery: string;
  setProjectQuery: (q: string) => void;
}

const AppCtx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [process, setProcess] = useState<ProcessFilter>("ALL");
  const [month, setMonth] = useState<string>(currentMonth());
  const [projectQuery, setProjectQuery] = useState("");

  const value = useMemo(
    () => ({ process, setProcess, month, setMonth, projectQuery, setProjectQuery }),
    [process, month, projectQuery]
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppProvider");
  return ctx;
}
