import type { Project } from "../shared/types.js";

/**
 * Desfase de fechas del proyecto:
 * - inicio → tentativa (plan interno)
 * - inicio → deal (compromiso comercial)
 * - desfase tentativa vs deal (positivo = la tentativa va despues del deal)
 */
export interface DateSlipResult {
  endDateDeal: string;
  /** Dias calendario desde inicio hasta fecha tentativa. */
  durationPlannedDays: number;
  /** Dias calendario desde inicio hasta fecha deal. */
  durationDealDays: number;
  /**
   * Diferencia tentativa − deal en dias.
   * Positivo: la fecha tentativa supera el deal (desfase / riesgo).
   * Negativo: la tentativa cierra antes que el deal (holgura).
   */
  slipDays: number;
  behindDeal: boolean;
}

function parseMs(iso: string): number {
  return new Date(iso + "T12:00:00Z").getTime();
}

/** Dias calendario firmados: b − a (puede ser negativo). */
export function calendarDaysBetween(aIso: string, bIso: string): number {
  const a = parseMs(aIso);
  const b = parseMs(bIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000);
}

export function resolveDealDate(project: Pick<Project, "endDatePlanned" | "endDateDeal">): string {
  return project.endDateDeal?.trim() || project.endDatePlanned;
}

export function computeDateSlip(project: Project): DateSlipResult {
  const endDateDeal = resolveDealDate(project);
  const durationPlannedDays = calendarDaysBetween(project.startDate, project.endDatePlanned);
  const durationDealDays = calendarDaysBetween(project.startDate, endDateDeal);
  const slipDays = calendarDaysBetween(endDateDeal, project.endDatePlanned);
  return {
    endDateDeal,
    durationPlannedDays,
    durationDealDays,
    slipDays,
    behindDeal: slipDays > 0,
  };
}
