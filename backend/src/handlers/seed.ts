import { newId } from "../lib/id.js";
import type { Principal } from "../lib/auth.js";
import { assertAdmin } from "../lib/auth.js";
import * as repo from "../lib/repo.js";
import type { Project } from "../shared/types.js";

/** Carga datos de ejemplo para validar el tablero end-to-end. Solo Administrador. */
export async function seed(principal: Principal) {
  assertAdmin(principal);
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (base: Date, days: number) => {
    const c = new Date(base);
    c.setDate(c.getDate() + days);
    return c;
  };
  const nowIso = now.toISOString();

  const baseProjects: Omit<Project, "id" | "createdAt" | "updatedAt" | "kind" | "parentProjectId" | "evolutivoSeq">[] = [
    {
      name: "Onboarding Banco Andino",
      category: "Implementacion cliente",
      process: "PMO",
      status: "control",
      phase: "en_progreso",
      owner: "Ana Perez",
      startDate: iso(addDays(now, -30)),
      endDatePlanned: iso(addDays(now, 60)),
      endDateDeal: iso(addDays(now, 45)),
      progressMode: "manual",
      manualProgress: 0,
      plannedSetupCost: 12000,
      plannedRecurringCost: 3000,
      realCost: 14500,
      monthlyRevenue: 5000,
      totalValue: 60000,
    },
    {
      name: "Migracion Retail Sur",
      category: "Proyecto estrategico",
      process: "PMO",
      status: "riesgo",
      phase: "en_progreso",
      owner: "Luis Gomez",
      startDate: iso(addDays(now, -60)),
      endDatePlanned: iso(addDays(now, 20)),
      endDateDeal: iso(addDays(now, 10)),
      progressMode: "manual",
      manualProgress: 45,
      plannedSetupCost: 20000,
      plannedRecurringCost: 4000,
      realCost: 26000,
      monthlyRevenue: 8000,
      totalValue: 96000,
    },
    {
      name: "Despliegue Core Interno v2",
      category: "Infraestructura",
      process: "IMPL",
      status: "control",
      phase: "en_progreso",
      owner: "Marco Ruiz",
      startDate: iso(addDays(now, -15)),
      endDatePlanned: iso(addDays(now, 45)),
      endDateDeal: iso(addDays(now, 50)),
      progressMode: "manual",
      manualProgress: 0,
      plannedSetupCost: 8000,
      plannedRecurringCost: 1000,
      realCost: 7500,
      monthlyRevenue: 0,
      totalValue: 9000,
    },
    {
      name: "Automatizacion Pipeline CI",
      category: "DevOps",
      process: "IMPL",
      status: "critico",
      phase: "standby",
      owner: "Marco Ruiz",
      startDate: iso(addDays(now, -90)),
      endDatePlanned: iso(addDays(now, -5)),
      endDateDeal: iso(addDays(now, -20)),
      progressMode: "manual",
      manualProgress: 70,
      plannedSetupCost: 5000,
      plannedRecurringCost: 500,
      realCost: 9000,
      monthlyRevenue: 0,
      totalValue: 5500,
    },
    {
      name: "Cuenta Seguros del Norte",
      category: "Post-venta",
      process: "CSM",
      status: "control",
      phase: "en_progreso",
      owner: "Sofia Diaz",
      startDate: iso(addDays(now, -45)),
      endDatePlanned: iso(addDays(now, 90)),
      endDateDeal: iso(addDays(now, 90)),
      progressMode: "manual",
      manualProgress: 0,
      plannedSetupCost: 3000,
      plannedRecurringCost: 6000,
      realCost: 8500,
      monthlyRevenue: 9000,
      totalValue: 108000,
    },
    // --- I+D+I: fechas alineadas a formatos FOS-ID-002 / FOS-ID-003 de cada PMV ---
    {
      name: "PMV FaceTrack — Reconocimiento facial",
      category: "PMV / Biometria",
      process: "IDI",
      status: "control",
      phase: "completado",
      owner: "Equipo I+D+I",
      startDate: "2025-05-15",
      endDatePlanned: "2026-07-14",
      endDateDeal: "2026-07-14",
      progressMode: "manual",
      manualProgress: 100,
      plannedSetupCost: 0,
      plannedRecurringCost: 900,
      realCost: 0,
      monthlyRevenue: 0,
      totalValue: 0,
    },
    {
      name: "PMV SmartPick OCR — Pedidos inteligentes",
      category: "PMV / IA conversacional",
      process: "IDI",
      status: "control",
      phase: "completado",
      owner: "Equipo I+D+I",
      startDate: "2026-05-30",
      endDatePlanned: "2026-07-14",
      endDateDeal: "2026-07-14",
      progressMode: "manual",
      manualProgress: 100,
      plannedSetupCost: 0,
      plannedRecurringCost: 0,
      realCost: 0,
      monthlyRevenue: 0,
      totalValue: 0,
    },
    {
      name: "PMV CRIOVAX FrioRFID — Cadena de frio RFID",
      category: "PMV / RFID y demo",
      process: "IDI",
      status: "control",
      phase: "completado",
      owner: "Equipo I+D+I",
      startDate: "2026-05-15",
      endDatePlanned: "2026-07-14",
      endDateDeal: "2026-07-14",
      progressMode: "manual",
      manualProgress: 100,
      plannedSetupCost: 0,
      plannedRecurringCost: 0,
      realCost: 0,
      monthlyRevenue: 0,
      totalValue: 0,
    },
  ];

  const projects: Project[] = baseProjects.map((p) => ({
    ...p,
    kind: "proyecto" as const,
    id: newId(),
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
  for (const p of projects) await repo.putProject(p);

  // Cronograma jerarquico de ejemplo para el primer proyecto PMO
  const sample = projects[0];
  const nowMs = now.getTime();
  const phaseDefs = [
    { name: "Iniciacion", description: "Kickoff y alcance", weight: 1, start: -30, end: -20 },
    { name: "Planificacion", description: "Plan de trabajo", weight: 1, start: -19, end: -10 },
    { name: "Ejecucion", description: "Implementacion", weight: 3, start: -9, end: 20 },
    { name: "Pruebas y UAT", description: "Validacion", weight: 2, start: 21, end: 35 },
    { name: "Despliegue", description: "Go-live", weight: 2, start: 36, end: 45 },
    { name: "Cierre", description: "Estabilizacion", weight: 1, start: 46, end: 60 },
  ];
  const phaseIds: string[] = [];
  for (let i = 0; i < phaseDefs.length; i++) {
    const d = phaseDefs[i];
    const id = newId();
    phaseIds.push(id);
    await repo.putSchedulePhase({
      id,
      projectId: sample.id,
      name: d.name,
      description: d.description,
      startDate: iso(addDays(now, d.start)),
      endDate: iso(addDays(now, d.end)),
      status: i === 0 ? "completada" : i === 1 ? "completada" : i === 2 ? "en_progreso" : "pendiente",
      completedAt: i < 2 ? iso(addDays(now, d.end)) : undefined,
      weight: d.weight,
      order: i + 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }
  const schedTasks: {
    phaseIdx: number;
    name: string;
    start: number;
    end: number;
    status: "pendiente" | "en_progreso" | "completada";
    completedAt?: string;
    weight: number;
  }[] = [
    { phaseIdx: 0, name: "Kickoff con cliente", start: -30, end: -25, status: "completada", completedAt: iso(addDays(now, -26)), weight: 1 },
    { phaseIdx: 0, name: "Acta de inicio", start: -24, end: -20, status: "completada", completedAt: iso(addDays(now, -21)), weight: 1 },
    { phaseIdx: 1, name: "Cronograma detallado", start: -19, end: -14, status: "completada", completedAt: iso(addDays(now, -15)), weight: 1 },
    { phaseIdx: 2, name: "Configuracion ambiente", start: -9, end: 5, status: "en_progreso", weight: 2 },
    { phaseIdx: 2, name: "Integraciones", start: 0, end: 20, status: "pendiente", weight: 2 },
    { phaseIdx: 3, name: "UAT con usuarios clave", start: 21, end: 35, status: "pendiente", weight: 2 },
    { phaseIdx: 4, name: "Go-live", start: 36, end: 45, status: "pendiente", weight: 2 },
    { phaseIdx: 5, name: "Hypercare", start: 46, end: 60, status: "pendiente", weight: 1 },
  ];
  void nowMs;
  for (let i = 0; i < schedTasks.length; i++) {
    const t = schedTasks[i];
    await repo.putScheduleTask({
      id: newId(),
      projectId: sample.id,
      phaseId: phaseIds[t.phaseIdx],
      name: t.name,
      description: "",
      startDate: iso(addDays(now, t.start)),
      endDate: iso(addDays(now, t.end)),
      status: t.status,
      completedAt: t.completedAt,
      weight: t.weight,
      order: i + 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // Marcar un segundo proyecto como completado para demostrar evolutivos
  const closed = projects[1];
  await repo.putProject({
    ...closed,
    phase: "completado",
    kind: "proyecto",
    updatedAt: nowIso,
  });

  // Cronogramas I+D+I alineados a sprints de FOS-ID-002 / FOS-ID-003
  const idiSchedules: {
    nameIncludes: string;
    phases: { name: string; start: string; end: string }[];
  }[] = [
    {
      nameIncludes: "FaceTrack",
      phases: [
        { name: "Sprint 1 — Infra y autenticacion", start: "2025-05-15", end: "2025-05-15" },
        { name: "Sprint 2 — Registro y reconocimiento", start: "2025-05-30", end: "2025-05-30" },
        { name: "Sprint 3 — Reportes y liquidacion CST", start: "2025-06-20", end: "2025-06-20" },
        { name: "Sprint 4 — Documentacion y entrega PMV", start: "2026-07-14", end: "2026-07-14" },
      ],
    },
    {
      nameIncludes: "SmartPick",
      phases: [
        { name: "Sprint 1 — Bot + OCR IA + persistencia", start: "2026-05-30", end: "2026-05-30" },
        { name: "Sprint 2 — API SmartPick + UI + AWS", start: "2026-07-14", end: "2026-07-14" },
      ],
    },
    {
      nameIncludes: "CRIOVAX",
      phases: [
        { name: "Sprint 1 — Infra API + DynamoDB + seed RFID", start: "2026-05-15", end: "2026-05-15" },
        { name: "Sprint 2 — Experiencia RFID + consola web", start: "2026-06-15", end: "2026-06-15" },
        { name: "Sprint 3 — Polly y entrega PMV", start: "2026-07-14", end: "2026-07-14" },
      ],
    },
  ];
  for (const sched of idiSchedules) {
    const project = projects.find((p) => p.process === "IDI" && p.name.includes(sched.nameIncludes));
    if (!project) continue;
    for (let i = 0; i < sched.phases.length; i++) {
      const ph = sched.phases[i];
      const phaseId = newId();
      await repo.putSchedulePhase({
        id: phaseId,
        projectId: project.id,
        name: ph.name,
        description: `Hito FOS / PMV — fecha ${ph.end}`,
        startDate: ph.start,
        endDate: ph.end,
        status: "completada",
        completedAt: ph.end,
        weight: 1,
        order: i + 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      await repo.putScheduleTask({
        id: newId(),
        projectId: project.id,
        phaseId,
        name: `Cierre ${ph.name}`,
        description: "Hito alineado a formato de entrega PMV (auditoria I+D+I)",
        startDate: ph.start,
        endDate: ph.end,
        status: "completada",
        completedAt: ph.end,
        weight: 1,
        order: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  // Encuestas (PMO y CSM)
  await repo.putSurvey({
    process: "PMO",
    period: month,
    nps: 62,
    responses: 48,
    csat: 4.3,
    promoters: 34,
    passives: 8,
    detractors: 6,
    source: "manual",
    updatedAt: nowIso,
  });
  await repo.putSurvey({
    process: "CSM",
    period: month,
    nps: 71,
    responses: 55,
    csat: 4.6,
    promoters: 42,
    passives: 9,
    detractors: 4,
    source: "manual",
    updatedAt: nowIso,
  });

  // Panel ejecutivo del mes
  await repo.putKpi({ id: newId(), process: "PMO", month, name: "Proyectos a tiempo", value: 8, goal: 10 });
  await repo.putKpi({ id: newId(), process: "PMO", month, name: "Satisfaccion (NPS)", value: 62, goal: 60 });
  await repo.putKpi({ id: newId(), process: "IMPL", month, name: "Despliegues exitosos", value: 9, goal: 9 });
  await repo.putKpi({ id: newId(), process: "CSM", month, name: "Retencion clientes", value: 88, goal: 95 });

  await repo.putAlert(
    { id: newId(), process: "PMO", severity: "alto", title: "Retail Sur", description: "Sobrecosto del 8% y retraso de cronograma", valueAtRisk: 26000 },
    month
  );
  await repo.putAlert(
    { id: newId(), process: "IMPL", severity: "critico", title: "Pipeline CI", description: "Proyecto vencido y sobre presupuesto" },
    month
  );

  await repo.putTask({ id: newId(), month, title: "Revisar contrato Banco Andino", moduleLabel: "PMO", dueDate: iso(addDays(now, 3)) });
  await repo.putTask({ id: newId(), month, title: "Cierre de sprint interno", moduleLabel: "Implementacion", dueDate: iso(addDays(now, 1)) });
  await repo.putTask({ id: newId(), month, title: "Encuesta trimestral CSM", moduleLabel: "CSM" });

  await repo.putControl({ id: newId(), month, week: "S1", process: "PMO", team: "PMO", responsibles: ["Ana", "Luis"], status: "alDia" });
  await repo.putControl({ id: newId(), month, week: "S1", process: "IMPL", team: "Implementacion", responsibles: ["Marco"], status: "pendiente" });
  await repo.putControl({ id: newId(), month, week: "S1", process: "CSM", team: "CSM", responsibles: ["Sofia"], status: "alDia" });
  await repo.putControl({ id: newId(), month, week: "S1", process: "IDI", team: "I+D+I", responsibles: ["Equipo I+D+I"], status: "alDia" });

  await repo.putKpi({ id: newId(), process: "IDI", month, name: "PMV entregados", value: 3, goal: 3 });

  await repo.putModule({
    process: "PMO",
    month,
    totalProjects: 2,
    breakdown: [
      { label: "En control", count: 1 },
      { label: "En riesgo", count: 1 },
      { label: "Criticos", count: 0 },
    ],
    metrics: [
      { label: "Avance", value: "58%" },
      { label: "NPS", value: "62" },
    ],
    updateStatus: "alDia",
  });
  await repo.putModule({
    process: "IMPL",
    month,
    totalProjects: 2,
    breakdown: [
      { label: "Completado", count: 0 },
      { label: "En progreso", count: 1 },
      { label: "Con alerta", count: 1 },
    ],
    metrics: [
      { label: "Avance", value: "60%" },
      { label: "Urgentes", value: "1" },
    ],
    updateStatus: "pendiente",
  });
  await repo.putModule({
    process: "CSM",
    month,
    totalProjects: 1,
    breakdown: [
      { label: "En control", count: 1 },
      { label: "En riesgo", count: 0 },
      { label: "Criticos", count: 0 },
    ],
    metrics: [
      { label: "NPS", value: "71" },
      { label: "Standby", value: "0" },
    ],
    updateStatus: "enConstruccion",
  });
  await repo.putModule({
    process: "IDI",
    month,
    totalProjects: 3,
    breakdown: [
      { label: "Completados", count: 3 },
      { label: "En progreso", count: 0 },
      { label: "En riesgo", count: 0 },
    ],
    metrics: [
      { label: "Avance", value: "100%" },
      { label: "PMV", value: "3" },
    ],
    updateStatus: "alDia",
  });

  return { seeded: true, projects: projects.length, month };
}
