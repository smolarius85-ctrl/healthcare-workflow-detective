import type { CaseCalendar } from '../case/types';

/**
 * Time handling. All case timestamps are local wall-clock strings ("YYYY-MM-DD HH:MM")
 * in the case's single declared timezone. We convert them to "naive minutes" using
 * Date.UTC so calculations never depend on the viewer's own timezone.
 */

const MIN_PER_DAY = 24 * 60;

export function toMinutes(ts: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(ts);
  if (!m) throw new Error(`Bad timestamp: ${ts}`);
  const [, y, mo, d, h, mi] = m.map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) / 60000;
}

export function fromMinutes(min: number): string {
  const d = new Date(min * 60000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function dateOf(ts: string): string {
  return ts.slice(0, 10);
}

function dayStart(min: number): number {
  return Math.floor(min / MIN_PER_DAY) * MIN_PER_DAY;
}

function dateKey(min: number): string {
  return fromMinutes(min).slice(0, 10);
}

export function isBusinessDay(min: number, cal: CaseCalendar): boolean {
  const dow = new Date(min * 60000).getUTCDay();
  return cal.businessDays.includes(dow) && !cal.holidays.includes(dateKey(min));
}

/** Minutes inside business hours between two timestamps (a <= b). */
export function businessMinutesBetween(a: string, b: string, cal: CaseCalendar): number {
  const start = toMinutes(a);
  const end = toMinutes(b);
  if (end <= start) return 0;
  let total = 0;
  for (let day = dayStart(start); day < end; day += MIN_PER_DAY) {
    if (!isBusinessDay(day, cal)) continue;
    const open = day + cal.businessStart;
    const close = day + cal.businessEnd;
    const s = Math.max(start, open);
    const e = Math.min(end, close);
    if (e > s) total += e - s;
  }
  return total;
}

/**
 * The business date a submission "counts" from. A submission on a business day before
 * close counts that day; after close, or on a weekend/holiday, it counts from the next business day.
 */
export function effectiveBusinessDate(ts: string, cal: CaseCalendar): number {
  const min = toMinutes(ts);
  let day = dayStart(min);
  if (isBusinessDay(day, cal) && min - day < cal.businessEnd) return day;
  day += MIN_PER_DAY;
  while (!isBusinessDay(day, cal)) day += MIN_PER_DAY;
  return day;
}

/**
 * Business days elapsed: the number of business days after the submission's effective
 * business date, up to and including the date of `to`. Same-day = 0.
 */
export function businessDaysBetween(from: string, to: string, cal: CaseCalendar): number {
  const startDay = effectiveBusinessDate(from, cal);
  const endDay = dayStart(toMinutes(to));
  let count = 0;
  for (let day = startDay + MIN_PER_DAY; day <= endDay; day += MIN_PER_DAY) {
    if (isBusinessDay(day, cal)) count++;
  }
  return count;
}

export function isWithinBusinessHours(ts: string, cal: CaseCalendar): boolean {
  const min = toMinutes(ts);
  const off = min - dayStart(min);
  return isBusinessDay(min, cal) && off >= cal.businessStart && off <= cal.businessEnd;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatTs(ts: string): string {
  const d = new Date(toMinutes(ts) * 60000);
  return `${DOW[d.getUTCDay()]} ${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${ts.slice(11)}`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}
