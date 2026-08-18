import type { Project } from "../shared/types.js";

export interface CostResult {
  planned: number; // setup + recurrente planificado
  real: number;
  varianceAmount: number; // real - planificado
  variancePct: number; // porcentaje sobre lo planificado
  overBudget: boolean; // true si el real supera el planificado
}

/** Epica 5: costo planificado (setup + recurrente) vs real, con variacion. */
export function computeCost(project: Project): CostResult {
  const planned = (project.plannedSetupCost || 0) + (project.plannedRecurringCost || 0);
  const real = project.realCost || 0;
  const varianceAmount = real - planned;
  const variancePct = planned > 0 ? round1((varianceAmount / planned) * 100) : 0;
  return {
    planned,
    real,
    varianceAmount,
    variancePct,
    overBudget: real > planned,
  };
}

export interface AggregateCost {
  plannedTotal: number;
  realTotal: number;
  varianceAmount: number;
  variancePct: number;
}

export function aggregateCosts(projects: Project[]): AggregateCost {
  let plannedTotal = 0;
  let realTotal = 0;
  for (const p of projects) {
    const c = computeCost(p);
    plannedTotal += c.planned;
    realTotal += c.real;
  }
  const varianceAmount = realTotal - plannedTotal;
  const variancePct = plannedTotal > 0 ? round1((varianceAmount / plannedTotal) * 100) : 0;
  return { plannedTotal, realTotal, varianceAmount, variancePct };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
