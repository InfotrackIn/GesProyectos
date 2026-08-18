import type { Project } from "../shared/types.js";

/**
 * Epica 4: calcula el % de avance por cronograma.
 * 0% antes de iniciar, 100% al llegar o superar la fecha fin.
 */
export function scheduleProgress(
  startDate: string,
  endDatePlanned: string,
  now: Date = new Date()
): number {
  const start = new Date(startDate + "T00:00:00Z").getTime();
  const end = new Date(endDatePlanned + "T00:00:00Z").getTime();
  const current = now.getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  if (current <= start) return 0;
  if (current >= end) return 100;

  const pct = ((current - start) / (end - start)) * 100;
  return Math.round(pct * 10) / 10;
}

export interface ProgressResult {
  /** % de avance efectivo (siempre manual). */
  progress: number;
  /** % planificado segun cronograma (siempre calculado, para medir variacion). */
  scheduled: number;
  /** Variacion del avance vs lo planificado por fechas. */
  variance: number | null;
}

export function computeProgress(project: Project, now: Date = new Date()): ProgressResult {
  const scheduled = scheduleProgress(project.startDate, project.endDatePlanned, now);
  const manual = clampPct(project.manualProgress);
  return { progress: manual, scheduled, variance: round1(manual - scheduled) };
}

function clampPct(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
