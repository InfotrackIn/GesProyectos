import { randomUUID } from "node:crypto";
import type { Principal } from "../lib/auth.js";
import { HttpError } from "../lib/response.js";
import * as repo from "../lib/repo.js";
import type { Sla } from "../shared/types.js";

const SLA_TEXT_FIELDS = [
  "proyecto",
  "codigo_cliente_ssc_atencion_whatsapp",
  "csm_pm",
  "coordinador_de_convenio",
  "comercial",
  "tipo_convenio",
  "aliado",
  "equipos_del_cliente",
  "disponibilidad",
  "horario_de_atencion",
  "mdm_primera_atencion",
  "mdm_resolucion",
  "hardware_primera_atencion",
  "hardware_intervencion",
  "software_absoluto",
  "software_urgente",
  "software_no_urgente",
] as const;

type SlaTextField = (typeof SLA_TEXT_FIELDS)[number];

export async function list(_principal: Principal) {
  return repo.listSlas();
}

export async function getOne(_principal: Principal, id: string) {
  const sla = await repo.getSla(id);
  if (!sla) throw new HttpError(404, "SLA no encontrado");
  return sla;
}

export async function create(_principal: Principal, body: Record<string, unknown>) {
  const fields = normalizeFields(body);
  if (!fields.proyecto) throw new HttpError(400, "El campo proyecto es obligatorio");
  if (!fields.tipo_convenio) throw new HttpError(400, "El campo tipo_convenio es obligatorio");

  const sla: Sla = {
    id: randomUUID(),
    ...fields,
  };
  await repo.putSla(sla);
  return sla;
}

export async function update(_principal: Principal, id: string, body: Record<string, unknown>) {
  const existing = await repo.getSla(id);
  if (!existing) throw new HttpError(404, "SLA no encontrado");

  const fields = normalizeFields({ ...existing, ...body, id });
  if (!fields.proyecto) throw new HttpError(400, "El campo proyecto es obligatorio");
  if (!fields.tipo_convenio) throw new HttpError(400, "El campo tipo_convenio es obligatorio");

  const sla: Sla = {
    id,
    ...fields,
  };
  await repo.putSla(sla);
  return sla;
}

export async function remove(_principal: Principal, id: string) {
  const existing = await repo.getSla(id);
  if (!existing) throw new HttpError(404, "SLA no encontrado");
  await repo.deleteSla(id);
}

export async function listByProyecto(_principal: Principal, proyecto: string) {
  const decoded = decodeURIComponent(proyecto).trim();
  if (!decoded) throw new HttpError(400, "El proyecto es obligatorio");
  return repo.listSlasByProyecto(decoded);
}

function normalizeFields(body: Record<string, unknown>): Record<SlaTextField, string> {
  const out = {} as Record<SlaTextField, string>;
  for (const key of SLA_TEXT_FIELDS) {
    out[key] = asText(body[key]);
  }
  return out;
}

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}
