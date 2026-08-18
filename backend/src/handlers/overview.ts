import type { Principal } from "../lib/auth.js";
import { visibleProcesses } from "../lib/auth.js";
import * as repo from "../lib/repo.js";
import { aggregateCosts } from "../domain/costs.js";
import { computeProgress } from "../domain/progress.js";
import { SURVEY_PROCESSES, type Process } from "../shared/types.js";

/**
 * Epica 2: resumen ejecutivo. Respeta el filtro de proceso (Epica 1) y los
 * permisos del perfil (Epica 7). El proceso "ALL" agrega todos los visibles.
 */
export async function overview(principal: Principal, processFilter: Process | "ALL", month: string) {
  const allowed = visibleProcesses(principal);
  const all = await repo.listProjects();

  const projects = all.filter((p) => {
    if (!allowed.includes(p.process)) return false;
    if (processFilter !== "ALL" && p.process !== processFilter) return false;
    return true;
  });

  const counts = {
    total: projects.length,
    control: projects.filter((p) => p.status === "control").length,
    riesgo: projects.filter((p) => p.status === "riesgo").length,
    critico: projects.filter((p) => p.status === "critico").length,
  };

  const progresses = projects.map((p) => computeProgress(p).progress);
  const avgProgress =
    progresses.length > 0
      ? Math.round((progresses.reduce((a, b) => a + b, 0) / progresses.length) * 10) / 10
      : 0;

  const cost = aggregateCosts(projects);

  // El resumen de encuestas solo aplica si el proceso seleccionado maneja
  // indicadores de satisfaccion (Epica 1: Implementacion Interna no aplica).
  const surveyApplies =
    processFilter === "ALL"
      ? allowed.some((p) => SURVEY_PROCESSES.includes(p))
      : SURVEY_PROCESSES.includes(processFilter);

  let surveySummary = null;
  if (surveyApplies) {
    const surveys = (await repo.listSurveys()).filter((s) => {
      if (!allowed.includes(s.process)) return false;
      if (processFilter !== "ALL" && s.process !== processFilter) return false;
      return SURVEY_PROCESSES.includes(s.process);
    });
    surveySummary = summarizeSurveys(surveys);
  }

  // Panel de alertas compartido con la Vista General (Epica 9).
  const alerts = (await repo.listAlerts(month)).filter((a) => {
    if (!allowed.includes(a.process)) return false;
    if (processFilter !== "ALL" && a.process !== processFilter) return false;
    return true;
  });

  return { counts, avgProgress, cost, surveyApplies, surveySummary, alerts };
}

function summarizeSurveys(surveys: { nps: number; csat: number; promoters: number; passives: number; detractors: number; responses: number }[]) {
  if (surveys.length === 0) {
    return { nps: 0, csat: 0, promoters: 0, passives: 0, detractors: 0, responses: 0 };
  }
  const promoters = sum(surveys, "promoters");
  const passives = sum(surveys, "passives");
  const detractors = sum(surveys, "detractors");
  const responses = sum(surveys, "responses");
  return {
    nps: avg(surveys, "nps"),
    csat: avg(surveys, "csat"),
    promoters,
    passives,
    detractors,
    responses,
  };
}

function sum<T extends Record<string, number>>(arr: T[], key: keyof T): number {
  return arr.reduce((a, b) => a + (b[key] || 0), 0);
}

function avg<T extends Record<string, number>>(arr: T[], key: keyof T): number {
  if (arr.length === 0) return 0;
  return Math.round((sum(arr, key) / arr.length) * 10) / 10;
}
