import type { Process, Role } from "../types";

export const PORTAL_ADMIN_GROUP_ID = "5e362b7a-7539-4b0f-87ef-acb878e9deeb";
export const AZURE_CLIENT_ID = "83526f1b-9347-4213-a72c-65700464c817";
const GRAPH_AUDIENCE = "00000003-0000-0000-c000-000000000000";

export const PORTAL_ORIGINS = [
  "https://impactia-portal.lovable.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

export const PORTAL_URL = "https://impactia-portal.lovable.app/";
export const AUTH_REQUIRED_EVENT = "gesproyectos-auth-required";

const SESSION_KEY = "gesproyectos_portal_session";

export interface PortalUser {
  id?: string;
  name?: string;
  email?: string;
  groups?: string[];
  isAdmin?: boolean;
}

export interface PortalSession {
  user: PortalUser;
  idToken: string;
  issuedAt: number;
}

export interface AuthUser {
  email?: string;
  name?: string;
  role: Role;
  groups: string[];
  allowedProcesses: Process[] | "ALL";
}

function parseGroupList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // ignore
    }
    return raw
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(/[\s,]+/)
      .filter(Boolean);
  }
  return [];
}

export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const claims = decodeJwt(token);
  if (!claims || typeof claims.exp !== "number") return true;
  return claims.exp * 1000 < Date.now() + 30_000;
}

function audienceList(aud: unknown): string[] {
  if (Array.isArray(aud)) return aud.map(String);
  if (typeof aud === "string") return [aud];
  return [];
}

/** El authorizer de la API espera aud = app Azure de GesProyectos, no el de Graph. */
export function isApiAudience(token: string): boolean {
  const claims = decodeJwt(token);
  if (!claims) return false;
  const allowed = new Set([AZURE_CLIENT_ID, `api://${AZURE_CLIENT_ID}`]);
  const auds = audienceList(claims.aud);
  if (auds.some((a) => allowed.has(a))) return true;
  if (auds.includes(GRAPH_AUDIENCE)) return false;
  // Algunos tokens de la misma app ponen el client id en appid/azp.
  const appid = typeof claims.appid === "string" ? claims.appid : "";
  const azp = typeof claims.azp === "string" ? claims.azp : "";
  return allowed.has(appid) || allowed.has(azp);
}

export function stripBearer(token: string): string {
  return token.replace(/^Bearer\s+/i, "").trim();
}

export function pickPortalToken(payload: {
  idToken?: string;
  accessToken?: string;
  token?: string;
}): string | null {
  const candidates = [payload.idToken, payload.accessToken, payload.token]
    .filter((t): t is string => typeof t === "string" && t.length > 20)
    .map(stripBearer);
  if (candidates.length === 0) return null;
  return candidates.find((t) => !isTokenExpired(t) && isApiAudience(t)) ?? null;
}

export function resolveRole(_groups: string[], _isAdminFlag?: boolean): Role {
  return "Administrador";
}

export function toAuthUser(session: PortalSession): AuthUser {
  const claims = decodeJwt(session.idToken) ?? {};
  const groups = parseGroupList(session.user.groups ?? claims.groups);
  const email =
    session.user.email ||
    (typeof claims.email === "string" ? claims.email : undefined) ||
    (typeof claims.preferred_username === "string" ? claims.preferred_username : undefined);
  const role = resolveRole(groups, session.user.isAdmin);
  return {
    email,
    name: session.user.name || email,
    role,
    groups,
    allowedProcesses: "ALL",
  };
}

export function loadSession(): PortalSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PortalSession;
    if (!session?.idToken || isTokenExpired(session.idToken)) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: PortalSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getIdToken(): string | null {
  const session = loadSession();
  return session && !isTokenExpired(session.idToken) ? session.idToken : null;
}

export function isPortalOrigin(origin: string): boolean {
  if (PORTAL_ORIGINS.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return (
      host === "localhost" ||
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovable.dev") ||
      host.endsWith(".lovableproject.com")
    );
  } catch {
    return false;
  }
}

export function requestPortalAuth(durationMs = 20_000): () => void {
  const target = window.opener ?? (window.parent !== window ? window.parent : null);
  if (!target) return () => undefined;

  const ping = () => {
    try {
      target.postMessage({ type: "chat-ready" }, "*");
    } catch {
      // opener cerrado
    }
  };
  ping();
  const interval = window.setInterval(ping, 500);
  const timeout = window.setTimeout(() => window.clearInterval(interval), durationMs);
  return () => {
    window.clearInterval(interval);
    window.clearTimeout(timeout);
  };
}

export function notifyAuthRequired(): void {
  window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
}
