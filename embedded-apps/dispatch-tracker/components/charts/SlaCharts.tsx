import { colors, rankColor } from '@/constants/theme';
import { GsvBarChart } from './GsvBarChart';
import { HBarChart } from './HBarChart';

export type DepotDelayRow = { depot: string; avg: number };
export type SlaBucketRow = { label: string; count: number; pct: number };

/** "Best vs Worst Depots by Avg Delivery Delay" — HQ-only SLA section, chart A. */
export function DepotDelayChart({ rows }: { rows: DepotDelayRow[] }) {
  const sorted = [...rows].sort((a, b) => a.avg - b.avg); // ascending: best (lowest avg) first
  const n = sorted.length;
  const data = sorted.map((r, i) => ({
    label: r.depot,
    value: Math.max(0, r.avg),
    color: rankColor(i, n),
    barLabel: r.avg < 0 ? `Early (${Math.abs(r.avg).toFixed(1)}d)` : `${r.avg.toFixed(1)} Days`,
  }));
  return (
    <HBarChart
      title="Best vs Worst Depots by Avg Delivery Delay"
      data={data}
      caption="Worst ← · · · · · · · → Best"
    />
  );
}

/** "Orders vs SLA Breach Severity" — HQ-only SLA section, chart B. */
export function SlaBreachChart({ buckets }: { buckets: SlaBucketRow[] }) {
  const data = buckets.map((b) => ({
    label: b.label,
    value: b.count,
    color: colors.redDk,
    barLabel: `${b.count} (${b.pct.toFixed(0)}%)`,
  }));
  return <GsvBarChart title="Orders vs SLA Breach Severity" data={data} />;
}
