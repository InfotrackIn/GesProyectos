import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import type { Process, Role } from "../shared/types.js";
import { HttpError } from "./response.js";

export interface Principal {
  sub: string;
  email?: string;
  name?: string;
  groups: string[];
  role: Role;
  /** Procesos que el usuario puede ver/editar. Admin = todos. */
  allowedProcesses: Process[] | "ALL";
}

const ALL_PROCESSES: Process[] = ["PMO", "IMPL", "CSM"];
const PORTAL_ADMIN_GROUP_ID = "5e362b7a-7539-4b0f-87ef-acb878e9deeb";
const ACCESS_GROUP_ID = "090658b1-85fc-4026-a82c-1d549258d213";

function envGroupIds(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length ? ids : fallback;
}

export function getPrincipal(event: APIGatewayProxyEventV2WithJWTAuthorizer): Principal {
  const claims = (event.requestContext?.authorizer?.jwt?.claims ?? {}) as Record<string, unknown>;
  const sub = String(claims.oid ?? claims.sub ?? "");
  const email = firstClaim(claims, ["email", "preferred_username", "upn", "unique_name"]);
  const name = claimName(claims) || email;

  const groups = parseGroups(claims.groups);
  const adminGroupIds = envGroupIds("AZURE_ADMIN_GROUP_IDS", [PORTAL_ADMIN_GROUP_ID]);
  const accessGroupIds = envGroupIds("AZURE_ACCESS_GROUP_IDS", [ACCESS_GROUP_ID]);

  const isAdmin = groups.some((g) => adminGroupIds.includes(g));
  const hasAccess = isAdmin || groups.some((g) => accessGroupIds.includes(g));
  if (!hasAccess) {
    throw new HttpError(403, "Tu cuenta no tiene acceso a GesProyectos");
  }

  const role: Role = isAdmin ? "Administrador" : "Implementador";

  return {
    sub,
    email,
    name,
    groups,
    role,
    allowedProcesses: isAdmin ? "ALL" : ["IMPL"],
  };
}

export function actorName(principal: Principal): string {
  return principal.name?.trim() || principal.email || principal.sub || "Usuario";
}

export function actorFields(principal: Principal): { actorId: string; actorName: string; actorEmail?: string } {
  return {
    actorId: principal.sub || "unknown",
    actorName: actorName(principal),
    actorEmail: principal.email,
  };
}

function firstClaim(claims: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = claims[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function claimName(claims: Record<string, unknown>): string | undefined {
  const name = firstClaim(claims, ["name", "given_name"]);
  if (name && claims.family_name && typeof claims.family_name === "string") {
    const family = claims.family_name.trim();
    if (family && !name.toLowerCase().includes(family.toLowerCase())) {
      return `${name} ${family}`.trim();
    }
  }
  const given = typeof claims.given_name === "string" ? claims.given_name.trim() : "";
  const family = typeof claims.family_name === "string" ? claims.family_name.trim() : "";
  const combined = `${given} ${family}`.trim();
  return combined || name;
}

function parseGroups(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Cognito / Entra pueden enviar "[id id]"
    }
    return raw
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(/[\s,]+/)
      .filter(Boolean);
  }
  return [];
}

export function canAccessProcess(principal: Principal, process: Process): boolean {
  if (principal.allowedProcesses === "ALL") return true;
  return principal.allowedProcesses.includes(process);
}

export function assertCanAccessProcess(principal: Principal, process: Process): void {
  if (!canAccessProcess(principal, process)) {
    throw new HttpError(403, `El perfil ${principal.role} no puede acceder al proceso ${process}`);
  }
}

export function assertAdmin(principal: Principal): void {
  if (principal.role !== "Administrador") {
    throw new HttpError(403, "Solo el Administrador puede realizar esta accion");
  }
}

export function visibleProcesses(principal: Principal): Process[] {
  return principal.allowedProcesses === "ALL" ? ALL_PROCESSES : principal.allowedProcesses;
}
