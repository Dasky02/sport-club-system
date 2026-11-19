const zone = "Europe/Prague";
const wall = new Intl.DateTimeFormat("sv-SE", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const full = new Intl.DateTimeFormat("cs-CZ", { timeZone: zone, dateStyle: "medium", timeStyle: "short" });
const time = new Intl.DateTimeFormat("cs-CZ", { timeZone: zone, hour: "2-digit", minute: "2-digit" });
const monthFormat = new Intl.DateTimeFormat("cs-CZ", { timeZone: "UTC", year: "numeric", month: "long" });

function wallTime(value: Date) {
  return wall.format(value).replace(" ", "T");
}
export const clubDateKey = (value: string | Date) => wallTime(new Date(value)).slice(0, 10);
export const clubDateTimeInput = (value: string) => wallTime(new Date(value)).slice(0, 16);
export const displayDateTime = (value: string) => full.format(new Date(value));
export const displayTime = (value: string) => time.format(new Date(value));

export function clubInstant(value: string): string {
  const candidate = new Date(`${value}:00Z`).getTime();
  if (!Number.isFinite(candidate)) throw new Error("Vyplňte platný termín.");
  const toOffset = (instant: number) => new Date(`${wallTime(new Date(instant))}Z`).getTime() - instant;
  const offsets = new Set([toOffset(candidate - 86_400_000), toOffset(candidate + 86_400_000)]);
  const wanted = `${value}:00`;
  const matches = [...offsets].map((offset) => new Date(candidate - offset)).filter((instant) => wallTime(instant) === wanted);
  if (matches.length !== 1) throw new Error("Vyberte jednoznačný čas mimo přechod letního a zimního času.");
  return matches[0].toISOString();
}

function dateAt(month: string, shift = 0) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + shift, 1));
}
export const currentMonth = () => clubDateKey(new Date()).slice(0, 7);
export const displayMonth = (month: string) => monthFormat.format(dateAt(month));
export const changeMonth = (month: string, shift: number) => dateAt(month, shift).toISOString().slice(0, 7);
export function monthRange(month: string) {
  return { from: clubInstant(`${month}-01T00:00`), to: clubInstant(`${changeMonth(month, 1)}-01T00:00`) };
}
export function monthDays(month: string) {
  const start = dateAt(month);
  const blank = (start.getUTCDay() + 6) % 7;
  const count = Math.round((dateAt(month, 1).getTime() - start.getTime()) / 86_400_000);
  return { blank, dates: Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`) };
}
