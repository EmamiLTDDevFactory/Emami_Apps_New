/**
 * The app uses several DIFFERENT delay/EDD color scales depending on tab —
 * see spec_dis_shared_components.md §8, items 3-4. Do not merge these into
 * one "delay color" function; keep them distinct exactly as documented.
 */
import { colors } from '@/constants/theme';
import { toDate } from '@/lib/format';

/** Dashboard "Avg Delay" KPI card color: <=0 green, <=1 amber, else red. */
export function dashboardDelayColor(avgDelay: number): string {
  if (avgDelay <= 0) return colors.green;
  if (avgDelay <= 1) return colors.amber;
  return colors.red;
}

/** Canonical 3-tier scale — Completed card & Reports table `_delay`/`total_delay` cells.
 *  Note the EXACT-zero test (not <=0) — a -2 (early) delay lands in the amber branch. */
export function canonicalDelayColor(delay: number): string {
  if (delay === 0) return colors.green;
  if (delay <= 1) return colors.amber;
  return colors.red;
}
export function canonicalDelayLabel(delay: number): string {
  return delay === 0 ? 'On-time' : `${Math.trunc(delay)}d`;
}

/** Reports "Delay vs EDD" _delay label variant used alongside canonicalDelayColor. */
export function delayVsEddLabel(delay: number | null): string {
  if (delay === null) return '—';
  return canonicalDelayLabel(delay);
}

/** Completed-tab "Delivered / On-time" KPI: exact-zero on-time test (stricter than <=0). */
export function isOnTimeExact(totalDelay: number): boolean {
  return totalDelay === 0;
}

/** Dashboard/Reports-filter on-time test: <=0 (early counts as on-time). */
export function isOnTimeOrEarly(totalDelay: number): boolean {
  return totalDelay <= 0;
}

export type EddVariant = 'navy-future' | 'green-future';

/** EDD-vs-today coloring used on Pending (navy-future) and SAP Dispatched/Reports (green-future) tabs. */
export function eddVsTodayColor(edd: unknown, variant: EddVariant): string {
  const d = toDate(edd);
  if (!d) return colors.g400;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  if (dd.getTime() < today.getTime()) return colors.red;
  if (dd.getTime() === today.getTime()) return colors.amber;
  return variant === 'navy-future' ? colors.navy : colors.green;
}

/** EDD-vs-actual-delivery coloring used on the Completed tab card. */
export function eddVsActualColor(edd: unknown, actualDeliveryDate: unknown): string {
  const e = toDate(edd);
  const a = toDate(actualDeliveryDate);
  if (!e) return colors.g400;
  if (!a) return colors.g400;
  return a.getTime() <= e.getTime() ? colors.green : colors.red;
}
