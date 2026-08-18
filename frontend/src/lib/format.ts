const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function fmtMoney(n: number): string {
  return money.format(n || 0);
}

/** Formatea un desfase en dias (ej. "+12 d", "-3 d", "0 d"). */
export function fmtDays(n: number): string {
  const v = Math.round(n || 0);
  if (v > 0) return `+${v} d`;
  return `${v} d`;
}

export function fmtPct(n: number): string {
  return `${Math.round((n || 0) * 10) / 10}%`;
}

export function fmtDate(iso?: string): string {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Genera opciones de meses (yyyy-mm) alrededor del mes actual. */
export function monthOptions(back = 12, forward = 3): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -back; i <= forward; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return opts.reverse();
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
