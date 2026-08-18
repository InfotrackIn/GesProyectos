/**
 * Dias habiles: excluye sabados, domingos y festivos de Colombia
 * (incluyendo trasladados por Ley Emiliani).
 */

function parseDate(iso: string): Date {
  const d = new Date(iso + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) throw new Error(`Fecha invalida: ${iso}`);
  return d;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUtc(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** Algoritmo de Meeus/Jones/Butcher para Domingo de Pascua (UTC). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** Traslada al lunes siguiente si no cae en lunes (Ley Emiliani). */
function emiliani(date: Date): Date {
  const dow = date.getUTCDay(); // 0=dom ... 1=lun
  if (dow === 1) return date;
  const daysToMonday = dow === 0 ? 1 : 8 - dow;
  return addDaysUtc(date, daysToMonday);
}

const holidayCache = new Map<number, Set<string>>();

export function colombiaHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const set = new Set<string>();
  const fixed = (m: number, d: number) => set.add(toIso(new Date(Date.UTC(year, m - 1, d, 12))));
  const fixedEmiliani = (m: number, d: number) =>
    set.add(toIso(emiliani(new Date(Date.UTC(year, m - 1, d, 12)))));

  // Fijos sin traslado
  fixed(1, 1); // Año Nuevo
  fixed(5, 1); // Día del Trabajo
  fixed(7, 20); // Independencia
  fixed(8, 7); // Batalla de Boyacá
  fixed(12, 8); // Inmaculada Concepción
  fixed(12, 25); // Navidad

  // Fijos con Ley Emiliani
  fixedEmiliani(1, 6); // Reyes
  fixedEmiliani(3, 19); // San José
  fixedEmiliani(6, 29); // San Pedro y San Pablo
  fixedEmiliani(8, 15); // Asunción
  fixedEmiliani(10, 12); // Día de la Raza
  fixedEmiliani(11, 1); // Todos los Santos
  fixedEmiliani(11, 11); // Independencia de Cartagena

  // Semana Santa y festivos movibles
  const easter = easterSunday(year);
  set.add(toIso(addDaysUtc(easter, -3))); // Jueves Santo
  set.add(toIso(addDaysUtc(easter, -2))); // Viernes Santo
  set.add(toIso(emiliani(addDaysUtc(easter, 39)))); // Ascensión
  set.add(toIso(emiliani(addDaysUtc(easter, 60)))); // Corpus Christi
  set.add(toIso(emiliani(addDaysUtc(easter, 68)))); // Sagrado Corazón

  holidayCache.set(year, set);
  return set;
}

export function isHoliday(iso: string): boolean {
  const d = parseDate(iso);
  return colombiaHolidays(d.getUTCFullYear()).has(toIso(d));
}

export function isWeekend(iso: string): boolean {
  const dow = parseDate(iso).getUTCDay();
  return dow === 0 || dow === 6;
}

export function isBusinessDay(iso: string): boolean {
  return !isWeekend(iso) && !isHoliday(iso);
}

/** Cuenta dias habiles entre start y end inclusive. */
export function businessDaysBetween(startIso: string, endIso: string): number {
  let start = parseDate(startIso);
  let end = parseDate(endIso);
  if (end < start) [start, end] = [end, start];
  let count = 0;
  for (let d = new Date(start); d <= end; d = addDaysUtc(d, 1)) {
    if (isBusinessDay(toIso(d))) count++;
  }
  return count;
}

/** Dias habiles transcurridos desde start hasta asOf (inclusive), acotado a [0, total]. */
export function businessDaysElapsed(startIso: string, endIso: string, asOfIso?: string): number {
  const asOf = asOfIso ?? toIso(new Date());
  const start = parseDate(startIso);
  const end = parseDate(endIso);
  const asOfD = parseDate(asOf);
  if (asOfD < start) return 0;
  const effectiveEnd = asOfD < end ? asOfD : end;
  return businessDaysBetween(startIso, toIso(effectiveEnd));
}

export function todayIso(): string {
  return toIso(new Date());
}
