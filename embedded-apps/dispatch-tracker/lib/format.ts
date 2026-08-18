/**
 * Ported 1:1 from the formatter helpers at the top of
 * streamlit_app/dis_shared_components.py (_fd, _finr, _sv, _sfloat,
 * _to_date, _fmt_cw, _gsv_fmt). Keep behavior identical — every screen
 * in the original app renders through these.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase();
  if (s === '' || s === 'nat' || s === 'nan' || s === 'none') return null;
  const raw = String(v);
  const d = new Date(raw.length >= 10 ? raw.slice(0, 10) : raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** _fd — date -> "13 Aug 2026", "—" if missing/invalid. */
export function fd(v: unknown): string {
  const d = toDate(v);
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** _sv — safe string, returns fallback for null/blank/"nan"/"none"/"nat". */
export function sv(v: unknown, fb = ''): string {
  if (v === null || v === undefined) return fb;
  const s = String(v);
  if (['nan', 'none', 'nat', ''].includes(s.trim().toLowerCase())) return fb;
  return s;
}

/** _sfloat — safe float, null on failure/NaN. */
export function sfloat(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** _finr — currency, "₹#,##0.00", "—" if invalid. */
export function finr(v: unknown): string {
  const n = sfloat(v);
  if (n === null) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** _gsv_fmt — abbreviated currency: Cr (>=1e7), L (>=1e5), else full. */
export function gsvFmt(v: unknown): string {
  const n = sfloat(v) ?? 0;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** _fmt_cw — "Cases: {c}  ·  Weight: {w} KG", omitting missing/zero parts. */
export function fmtCw(cases: unknown, grossWt: unknown): string {
  const c = sfloat(cases);
  const w = sfloat(grossWt);
  const parts: string[] = [];
  if (c) parts.push(`Cases: ${c.toFixed(2)}`);
  if (w) parts.push(`Weight: ${w.toFixed(2)} KG`);
  return parts.length ? parts.join('  ·  ') : '—';
}

export function daysBetween(a: Date, b: Date): number {
  const ms = a.setHours(0, 0, 0, 0) - b.setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

export function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
