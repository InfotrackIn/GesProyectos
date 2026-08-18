import type { Project } from "../types";

export function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchesText(haystack: string | undefined, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const hay = normalizeSearch(haystack ?? "");
  return q.split(/\s+/).every((term) => hay.includes(term));
}

/** Busca por nombre, categoria, responsable, proceso o tipo. */
export function matchesProjectSearch(project: Project, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const hay = [
    project.name,
    project.category,
    project.owner,
    project.process,
    project.kind,
    project.id,
  ]
    .filter(Boolean)
    .map((s) => normalizeSearch(String(s)))
    .join(" ");
  return q.split(/\s+/).every((term) => hay.includes(term));
}
