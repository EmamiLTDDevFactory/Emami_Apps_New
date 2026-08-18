import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DonutChart } from '@/components/charts/DonutChart';
import { GsvBarChart } from '@/components/charts/GsvBarChart';
import { HBarChart } from '@/components/charts/HBarChart';
import { DepotDelayChart, SlaBreachChart } from '@/components/charts/SlaCharts';
import { EmptyState } from '@/components/EmptyState';
import { FilterRow, FilterSelect } from '@/components/FilterBar';
import { DateField } from '@/components/Form';
import { KPICard } from '@/components/KPICard';
import { SectionHeader } from '@/components/SectionHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { colors, radius, shadow, slaBuckets } from '@/constants/theme';
import { dashboardDelayColor } from '@/lib/delay';
import { finr, gsvFmt, toDate, todayDate } from '@/lib/format';
import { AnyInvoiceRow } from '@/types/models';

/** Ported 1:1 from dis_shared_components.py's render_dashboard(). */

const BASE_PERIODS = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'All Time', 'Custom'] as const;
type Period = (typeof BASE_PERIODS)[number];

function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function sameDay(a: Date, b: Date): boolean {
  return dayStart(a).getTime() === dayStart(b).getTime();
}

function dedupeUnion(...lists: AnyInvoiceRow[][]): AnyInvoiceRow[] {
  const seen = new Set<string>();
  const out: AnyInvoiceRow[] = [];
  for (const list of lists) {
    for (const row of list) {
      if (seen.has(row.invoice_no)) continue;
      seen.add(row.invoice_no);
      out.push(row);
    }
  }
  return out;
}

function matchesPeriod(row: AnyInvoiceRow, period: Period, today: Date, customStart: Date, customEnd: Date): boolean {
  if (period === 'All Time') return true;
  const dt = toDate(row.invoice_date);
  if (!dt) return false;
  switch (period) {
    case 'Today':
      return sameDay(dt, today);
    case 'Yesterday':
      return sameDay(dt, addDays(today, -1));
    case 'Last 7 Days':
      return dayStart(dt).getTime() >= dayStart(addDays(today, -7)).getTime();
    case 'Last 30 Days':
      return dayStart(dt).getTime() >= dayStart(addDays(today, -30)).getTime();
    case 'This Month':
      return dt.getMonth() === today.getMonth() && dt.getFullYear() === today.getFullYear();
    case 'Custom':
      return dayStart(dt).getTime() >= dayStart(customStart).getTime() && dayStart(dt).getTime() <= dayStart(customEnd).getTime();
    default:
      return true;
  }
}

function countForPeriod(rows: AnyInvoiceRow[], period: Exclude<Period, 'Custom'>, today: Date): number {
  if (period === 'All Time') return rows.length;
  return rows.filter((r) => matchesPeriod(r, period, today, today, today)).length;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) : s;
}

function hasDispatchDate(r: AnyInvoiceRow): boolean {
  const v = (r as { dispatch_date?: unknown }).dispatch_date;
  return v != null && String(v).trim() !== '';
}
function isReturnedCancel(r: AnyInvoiceRow): boolean {
  return String((r as { cancel_reason?: unknown }).cancel_reason ?? '').startsWith('RETURNED');
}

function topByCount(rows: AnyInvoiceRow[], field: 'town' | 'customer_name'): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = (r as Record<string, unknown>)[field];
    if (!v || !String(v).trim()) continue;
    const s = String(v);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function gsvOfCache(rows: AnyInvoiceRow[]): number {
  return rows.reduce((s, r) => s + num((r as { invoice_value?: unknown }).invoice_value), 0);
}

type DepotStat = { depot: string; count: number; onTime: number; otPct: number; avg: number; max: number };

function depotStats(rows: AnyInvoiceRow[]): DepotStat[] {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const dep = (r as { depot?: unknown }).depot;
    if (!dep) continue;
    const arr = groups.get(String(dep)) ?? [];
    arr.push(num((r as { total_delay?: unknown }).total_delay));
    groups.set(String(dep), arr);
  }
  return Array.from(groups.entries()).map(([depot, delays]) => {
    const count = delays.length;
    const onTime = delays.filter((v) => v <= 0).length;
    const avg = count > 0 ? delays.reduce((a, b) => a + b, 0) / count : 0;
    const max = count > 0 ? Math.max(...delays) : 0;
    return { depot, count, onTime, otPct: count > 0 ? (onTime / count) * 100 : 0, avg, max };
  });
}

type TransporterStat = { transporter: string; count: number; avg: number; otPct: number };

function transporterStats(rows: AnyInvoiceRow[]): TransporterStat[] {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const t = (r as { transporter?: unknown }).transporter;
    if (!t || !String(t).trim()) continue;
    const arr = groups.get(String(t)) ?? [];
    arr.push(num((r as { total_delay?: unknown }).total_delay));
    groups.set(String(t), arr);
  }
  return Array.from(groups.entries()).map(([transporter, delays]) => {
    const count = delays.length;
    const onTime = delays.filter((v) => v <= 0).length;
    const avg = count > 0 ? delays.reduce((a, b) => a + b, 0) / count : 0;
    return { transporter, count, avg, otPct: count > 0 ? (onTime / count) * 100 : 0 };
  });
}

function delayLabel(v: number): string {
  if (v < 0) return `Early (${Math.abs(v).toFixed(1)}d)`;
  if (v === 0) return 'On-time';
  return `${v.toFixed(1)}d late`;
}

type DepotAgg = { count: number; gsv: number; cases: number };
function depotAgg(rows: AnyInvoiceRow[]): Map<string, DepotAgg> {
  const m = new Map<string, DepotAgg>();
  for (const r of rows) {
    const dep = (r as { depot?: unknown }).depot;
    if (!dep) continue;
    const cur = m.get(String(dep)) ?? { count: 0, gsv: 0, cases: 0 };
    cur.count += 1;
    cur.gsv += num((r as { invoice_value?: unknown }).invoice_value);
    cur.cases += num((r as { no_of_cases?: unknown }).no_of_cases);
    m.set(String(dep), cur);
  }
  return m;
}

export default function DashboardScreen() {
  const { session, readOnly } = useAuth();
  const { pendCache, dispCache, compCache, retCache, cancCache, loadDashboard } = useData();

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const loaded = pendCache !== null && dispCache !== null && compCache !== null && retCache !== null && cancCache !== null;

  const pend = pendCache ?? [];
  const disp = dispCache ?? [];
  const comp = compCache ?? [];
  const ret = retCache ?? [];
  const canc = cancCache ?? [];

  const today = todayDate();

  const [periodBase, setPeriodBase] = useState<Period>('All Time');
  const [customStart, setCustomStart] = useState<Date>(addDays(today, -30));
  const [customEnd, setCustomEnd] = useState<Date>(today);

  const unionAll = useMemo(() => dedupeUnion(pend, disp, comp, ret, canc), [pend, disp, comp, ret, canc]);

  const customInvalid = periodBase === 'Custom' && customEnd.getTime() < customStart.getTime();
  const effectiveCustomEnd = customInvalid ? customStart : customEnd;

  const periodCounts = useMemo(() => {
    const out: Partial<Record<Period, number>> = {};
    for (const p of BASE_PERIODS) {
      if (p === 'Custom') continue;
      out[p] = countForPeriod(unionAll, p, today);
    }
    return out;
  }, [unionAll]);

  const periodOptions = BASE_PERIODS.map((p) => (p === 'Custom' ? 'Custom' : `${p} (${periodCounts[p] ?? 0})`));
  const selectedLabel = periodBase === 'Custom' ? 'Custom' : `${periodBase} (${periodCounts[periodBase] ?? 0})`;

  function handlePeriodChange(v: string) {
    const base = v.replace(/\s*\(\d+\)$/, '').trim() as Period;
    setPeriodBase(base);
  }

  const d = useMemo(
    () => unionAll.filter((r) => matchesPeriod(r, periodBase, today, customStart, effectiveCustomEnd)),
    [unionAll, periodBase, customStart, effectiveCustomEnd]
  );

  const df_p = useMemo(() => d.filter((r) => r.status === 'Pending' && !hasDispatchDate(r)), [d]);
  const df_dp = useMemo(() => d.filter((r) => r.status === 'Pending' && hasDispatchDate(r)), [d]);
  const df_c = useMemo(() => d.filter((r) => r.status === 'Completed'), [d]);
  const df_r = useMemo(() => d.filter((r) => r.status === 'Returned' || (r.status === 'Cancelled' && isReturnedCancel(r))), [d]);
  const df_cn = useMemo(() => d.filter((r) => r.status === 'Cancelled' && !isReturnedCancel(r)), [d]);

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.navy} size="large" />
      </View>
    );
  }

  if (unionAll.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <EmptyState message="No invoices available" icon="📦" hint="Upload SAP export or check API connection" />
      </ScrollView>
    );
  }

  // ---- KPI Grid ----------------------------------------------------------
  const kpi = session?.sap_kpi;

  // Ported from the original's cache_counts→sap_kpi→period-filtered-bucket
  // priority: once the status caches are loaded (the normal case), these
  // counts are the FULL cache length and intentionally ignore the period
  // selector — only the charts/insights below are period-filtered. See
  // spec_dis_shared_components.md §1.3 ("_pend_n resolved via
  // cache_counts['pend'] → sap_kpi['pend_no'] → len(df_p)").
  function resolveCount(bucket: AnyInvoiceRow[], rawCache: AnyInvoiceRow[], kpiVal: number | null | undefined): number {
    if (rawCache.length > 0) return rawCache.length;
    if (kpiVal != null) return kpiVal;
    return bucket.length;
  }

  const rawCacheSum = pend.length + disp.length + comp.length + ret.length + canc.length;
  let totalInvoices: number;
  if (rawCacheSum > 0) {
    totalInvoices = rawCacheSum;
  } else {
    const kpiVals: (number | null)[] = kpi ? [kpi.pend_no, kpi.disp_no, kpi.comp_no, kpi.canc_no, kpi.ret_no] : [];
    const kpiSum = kpiVals.reduce<number>((a, b) => a + (b ?? 0), 0);
    totalInvoices = kpiSum > 0 ? kpiSum : d.length;
  }

  const pendingCount = resolveCount(df_p, pend, kpi?.pend_no);
  const dispatchedCount = resolveCount(df_dp, disp, kpi?.disp_no);
  const deliveredCount = resolveCount(df_c, comp, kpi?.comp_no);
  const returnedCount = resolveCount(df_r, ret, kpi?.ret_no);
  const cancelledCount = resolveCount(df_cn, canc, kpi?.canc_no);

  function sumAcrossRaw(field: 'invoice_value' | 'no_of_cases'): number {
    const caches = [pend, disp, comp, ret, canc];
    let total = 0;
    let found = false;
    for (const c of caches) {
      if (c.length > 0) {
        found = true;
        total += c.reduce((s, r) => s + num((r as unknown as Record<string, unknown>)[field]), 0);
      }
    }
    if (!found) total = d.reduce((s, r) => s + num((r as unknown as Record<string, unknown>)[field]), 0);
    return total;
  }
  const totalGsv = sumAcrossRaw('invoice_value');
  const totalCases = sumAcrossRaw('no_of_cases');

  const fullDelays = comp.map((r) => num((r as { total_delay?: unknown }).total_delay));
  const totalCompleted = comp.length;
  const onTimeCount = fullDelays.filter((v) => v <= 0).length;
  const otp = totalCompleted > 0 ? (onTimeCount / totalCompleted) * 100 : 0;
  const avgd = totalCompleted > 0 ? fullDelays.reduce((a, b) => a + b, 0) / totalCompleted : 0;
  const otpColor = otp >= 80 ? colors.green : otp >= 50 ? colors.amber : colors.red;

  const returnRateValue = totalInvoices > 0 ? `${((returnedCount / totalInvoices) * 100).toFixed(1)}%` : '—';
  const cancelRateValue = totalInvoices > 0 ? `${((cancelledCount / totalInvoices) * 100).toFixed(1)}%` : '—';

  // ---- Business Insights --------------------------------------------------
  const townTop = topByCount(d, 'town')[0];
  const custGroups = new Map<string, number>();
  for (const r of d) {
    const name = (r as { customer_name?: unknown }).customer_name;
    if (!name || !String(name).trim()) continue;
    const key = String(name);
    custGroups.set(key, (custGroups.get(key) ?? 0) + num((r as { invoice_value?: unknown }).invoice_value));
  }
  let custTop: { key: string; sum: number } | undefined;
  for (const [key, sum] of custGroups) {
    if (!custTop || sum > custTop.sum) custTop = { key, sum };
  }

  const depotOt = depotStats(comp);
  let bestDepot: DepotStat | undefined;
  let worstDepot: DepotStat | undefined;
  for (const s of depotOt) {
    if (!bestDepot || s.otPct > bestDepot.otPct) bestDepot = s;
    if (!worstDepot || s.otPct < worstDepot.otPct) worstDepot = s;
  }

  // ---- Analytics -----------------------------------------------------------
  const donutData = [
    { label: 'Pending', value: df_p.length, color: colors.amber },
    { label: 'Dispatched', value: df_dp.length, color: colors.teal },
    { label: 'Completed', value: df_c.length, color: colors.green },
    { label: 'Returned', value: df_r.length, color: colors.purple },
    { label: 'Cancelled', value: df_cn.length, color: colors.red },
  ].filter((s) => s.value > 0);

  const gsvByStatus = [
    { label: 'Completed', value: gsvOfCache(comp), color: colors.green },
    { label: 'Pending', value: gsvOfCache(pend), color: colors.amber },
    { label: 'Dispatched', value: gsvOfCache(disp), color: colors.teal },
    { label: 'Returned', value: gsvOfCache(ret), color: colors.purple },
    { label: 'Cancelled', value: gsvOfCache(canc), color: colors.red },
  ]
    .filter((s) => s.value > 0)
    .map((s) => ({ ...s, barLabel: finr(s.value) }));

  const topTowns = topByCount(d, 'town')
    .slice(0, 10)
    .map((t) => ({ label: t.key, value: t.count, color: colors.navy }));
  const topCustomers = topByCount(d, 'customer_name')
    .slice(0, 10)
    .map((c) => ({ label: truncate(c.key, 22), value: c.count, color: colors.teal }));

  // ---- HQ-only SLA analysis --------------------------------------------------
  const slaBucketsData = slaBuckets.map((b) => {
    const rows = comp.filter((r) => b.test(num((r as { total_delay?: unknown }).total_delay)));
    return { label: b.label, count: rows.length, gsv: rows.reduce((s, r) => s + num((r as { invoice_value?: unknown }).invoice_value), 0) };
  });
  const totalOrders = slaBucketsData.reduce((s, b) => s + b.count, 0);
  const totalGsvAll = slaBucketsData.reduce((s, b) => s + b.gsv, 0);
  const showSla = readOnly && totalOrders > 0;
  const slaRows = slaBucketsData.map((b) => ({
    ...b,
    pctOrders: totalOrders > 0 ? (b.count / totalOrders) * 100 : 0,
    pctGsv: totalGsvAll > 0 ? (b.gsv / totalGsvAll) * 100 : 0,
  }));
  const depotDelayRows = depotOt.map((s) => ({ depot: s.depot, avg: s.avg }));

  const compClean = comp.filter((r) => {
    const t = (r as { transporter?: unknown }).transporter;
    return t != null && String(t).trim() !== '';
  });
  const depotsForTransporter = Array.from(new Set(compClean.map((r) => String((r as { depot?: unknown }).depot ?? '')).filter(Boolean))).sort();
  const transporterTableRows = depotsForTransporter
    .map((dep) => {
      const rows = compClean.filter((r) => String((r as { depot?: unknown }).depot ?? '') === dep);
      const stats = transporterStats(rows);
      if (stats.length === 0) return null;
      const best = [...stats].sort((a, b) => b.otPct - a.otPct || a.avg - b.avg)[0];
      const worst = [...stats].sort((a, b) => a.otPct - b.otPct || b.avg - a.avg)[0];
      return { depot: dep, best, worst };
    })
    .filter((r): r is { depot: string; best: TransporterStat; worst: TransporterStat } => r !== null);

  // ---- HQ-only Depot-wise Overview -----------------------------------------
  const pendAgg = depotAgg(pend);
  const dispAgg = depotAgg(disp);
  const compAgg = depotAgg(comp);
  const retAgg = depotAgg(ret);
  const cancAgg = depotAgg(canc);
  const depotCodes = Array.from(
    new Set([...pendAgg.keys(), ...dispAgg.keys(), ...compAgg.keys(), ...retAgg.keys(), ...cancAgg.keys()])
  ).sort();
  const depotOverviewRows = depotCodes
    .map((dep) => {
      const p = pendAgg.get(dep)?.count ?? 0;
      const di = dispAgg.get(dep)?.count ?? 0;
      const c = compAgg.get(dep)?.count ?? 0;
      const r = retAgg.get(dep)?.count ?? 0;
      const cn = cancAgg.get(dep)?.count ?? 0;
      const gsv =
        (pendAgg.get(dep)?.gsv ?? 0) + (dispAgg.get(dep)?.gsv ?? 0) + (compAgg.get(dep)?.gsv ?? 0) + (retAgg.get(dep)?.gsv ?? 0) + (cancAgg.get(dep)?.gsv ?? 0);
      const cases =
        (pendAgg.get(dep)?.cases ?? 0) +
        (dispAgg.get(dep)?.cases ?? 0) +
        (compAgg.get(dep)?.cases ?? 0) +
        (retAgg.get(dep)?.cases ?? 0) +
        (cancAgg.get(dep)?.cases ?? 0);
      return { depot: dep, total: p + di + c + r + cn, pending: p, dispatched: di, completed: c, returned: r, cancelled: cn, gsv, cases };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {/* 1. Period selector */}
      <FilterRow>
        <FilterSelect value={selectedLabel} options={periodOptions} onChange={handlePeriodChange} minWidth={190} />
      </FilterRow>
      {periodBase === 'Custom' && (
        <View style={styles.customRow}>
          <View style={styles.customField}>
            <Text style={styles.customLabel}>Start</Text>
            <DateField value={customStart} onChange={setCustomStart} maximumDate={today} />
          </View>
          <View style={styles.customField}>
            <Text style={styles.customLabel}>End</Text>
            <DateField value={customEnd} onChange={setCustomEnd} minimumDate={customStart} maximumDate={today} />
          </View>
        </View>
      )}
      {customInvalid && <Text style={styles.warning}>⚠ End date before start date</Text>}

      {/* 3. KPI Grid */}
      <KpiRow>
        <KPICard icon="📥" label="Total Invoices" value={String(totalInvoices)} color={colors.navy} sub="imported" />
        <KPICard icon="⏳" label="Pending" value={String(pendingCount)} color={colors.amber} sub="awaiting dispatch" />
      </KpiRow>
      <KpiRow>
        <KPICard icon="🚚" label="Dispatched" value={String(dispatchedCount)} color={colors.teal} sub="in transit" />
        <KPICard icon="✅" label="Delivered" value={String(deliveredCount)} color={colors.green} sub="completed" />
      </KpiRow>
      <KpiRow>
        <KPICard icon="↩" label="Returned" value={String(returnedCount)} color={colors.purple} />
        <KPICard icon="✕" label="Cancelled" value={String(cancelledCount)} color={colors.red} />
      </KpiRow>
      <KpiRow>
        <KPICard icon="💰" label="Total GSV" value={gsvFmt(totalGsv)} color={colors.gsvOrange} sub="invoice value" />
        <KPICard icon="📦" label="Total Cases" value={totalCases.toFixed(0)} color={colors.casesSlate} />
      </KpiRow>
      <KpiRow>
        <KPICard icon="🎯" label="On-Time %" value={`${otp.toFixed(1)}%`} color={otpColor} sub={`${onTimeCount} of ${totalCompleted} delivered`} />
        <KPICard
          icon="⏱"
          label="Avg Delay"
          value={avgd <= 0 ? 'On-time' : `${avgd.toFixed(2)} Days`}
          color={dashboardDelayColor(avgd)}
          sub="vs expected delivery"
        />
      </KpiRow>
      <KpiRow>
        <KPICard icon="↩" label="Return Rate" value={returnRateValue} color={colors.purple} sub={`${returnedCount} returns`} />
        <KPICard icon="✕" label="Cancel Rate" value={cancelRateValue} color={colors.red} sub={`${cancelledCount} cancelled`} />
      </KpiRow>

      {d.length === 0 ? (
        <EmptyState message="No data for selected period" icon="📭" hint="Try a different date range" />
      ) : (
        <>
          {/* 4. Business Insights */}
          <SectionHeader title="Business Insights" subtitle={periodBase} />
          <View style={styles.insightRow}>
            <InsightCard label="Best Depot" value={bestDepot?.depot ?? '—'} sub={`${(bestDepot?.otPct ?? 0).toFixed(1)}% on-time`} color={colors.green} />
            <InsightCard
              label="Highest GSV Customer"
              value={truncate(custTop?.key ?? '—', 28)}
              sub={finr(custTop?.sum ?? 0)}
              color={colors.navy}
            />
          </View>
          <View style={styles.insightRow}>
            <InsightCard
              label="Highest Volume Town"
              value={truncate(townTop?.key ?? '—', 24)}
              sub={`${townTop?.count ?? 0} invoices`}
              color={colors.teal}
            />
            <InsightCard label="Worst Depot" value={worstDepot?.depot ?? '—'} sub={`${(worstDepot?.otPct ?? 0).toFixed(1)}% on-time`} color={colors.red} />
          </View>

          {/* 5. Analytics */}
          <SectionHeader title="Analytics" />
          <DonutChart title="Invoice Status Mix" data={donutData} />
          <GsvBarChart title="GSV by Status (₹)" data={gsvByStatus} />

          {/* 6. Depot-role charts (depot users) */}
          {!readOnly && (
            <>
              <HBarChart title="Top Towns" data={topTowns} />
              <HBarChart title="Top Customers" data={topCustomers} />
            </>
          )}

          {/* 7. HQ-only SLA Analysis */}
          {showSla && (
            <>
              <DepotDelayChart rows={depotDelayRows} />
              <SlaBreachChart buckets={slaRows.map((r) => ({ label: r.label, count: r.count, pct: r.pctOrders }))} />
              <SlaSummaryTable rows={slaRows} totalGsv={totalGsvAll} />
              {transporterTableRows.length > 0 && <TransporterTable rows={transporterTableRows} />}
            </>
          )}
        </>
      )}

      {/* 8. HQ-only Depot-wise Overview */}
      {readOnly && depotOverviewRows.length > 0 && (
        <>
          <SectionHeader title="Depot-wise Overview" subtitle={`${depotOverviewRows.length} depots`} />
          <DepotOverviewTable rows={depotOverviewRows} />
          <HBarChart title="Top Towns" data={topTowns} />
          <HBarChart title="Top Customers" data={topCustomers} />
        </>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Small local presentational helpers
// ---------------------------------------------------------------------------

function KpiRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.kpiRow}>{children}</View>;
}

function InsightCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <View style={[styles.insightCard, { borderLeftColor: color }]}>
      <Text style={styles.insightLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.insightValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.insightSub} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

function Th({ text, width, align = 'left' }: { text: string; width: number; align?: 'left' | 'right' | 'center' }) {
  return (
    <Text style={[styles.th, { width, textAlign: align }]} numberOfLines={2}>
      {text}
    </Text>
  );
}
function Td({ text, width, align = 'left', style }: { text: string; width: number; align?: 'left' | 'right' | 'center'; style?: object }) {
  return (
    <Text style={[styles.td, { width, textAlign: align }, style]} numberOfLines={1}>
      {text}
    </Text>
  );
}

function SlaSummaryTable({ rows, totalGsv }: { rows: { label: string; count: number; gsv: number; pctOrders: number; pctGsv: number }[]; totalGsv: number }) {
  const totalOrders = rows.reduce((s, r) => s + r.count, 0);
  return (
    <View style={[styles.tableCard, shadow.sm]}>
      <Text style={styles.tableTitle}>DELAY SEVERITY vs AGREED SLA</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={[styles.tr, styles.thRow]}>
            <Th text="SLA Status" width={150} />
            <Th text="Orders" width={70} align="right" />
            <Th text="% of Orders" width={90} align="right" />
            <Th text="Invoice Value (₹)" width={130} align="right" />
            <Th text="% of Value" width={90} align="right" />
          </View>
          {rows.map((r) => (
            <View key={r.label} style={styles.tr}>
              <Td text={r.label} width={150} />
              <Td text={String(r.count)} width={70} align="right" style={styles.tdNum} />
              <Td text={`${r.pctOrders.toFixed(1)}%`} width={90} align="right" style={styles.tdMuted} />
              <Td text={finr(r.gsv)} width={130} align="right" style={styles.tdNum} />
              <Td text={`${r.pctGsv.toFixed(1)}%`} width={90} align="right" style={styles.tdMuted} />
            </View>
          ))}
          <View style={[styles.tr, styles.tfootRow]}>
            <Td text="Total" width={150} style={styles.tdBold} />
            <Td text={String(totalOrders)} width={70} align="right" style={styles.tdNum} />
            <Td text="100.0%" width={90} align="right" style={styles.tdMuted} />
            <Td text={finr(totalGsv)} width={130} align="right" style={styles.tdNum} />
            <Td text="100.0%" width={90} align="right" style={styles.tdMuted} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TransporterTable({ rows }: { rows: { depot: string; best: TransporterStat; worst: TransporterStat }[] }) {
  return (
    <View style={[styles.tableCard, shadow.sm]}>
      <Text style={styles.tableTitle}>DEPOT-WISE BEST &amp; WORST TRANSPORTER</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={[styles.tr, styles.thRow]}>
            <Th text="Depot" width={70} />
            <Th text="Best Transporter" width={120} />
            <Th text="Shipments" width={80} align="center" />
            <Th text="On-Time %" width={80} align="center" />
            <Th text="Avg Delay" width={90} align="center" />
            <Th text="Worst Transporter" width={120} />
            <Th text="Shipments" width={80} align="center" />
            <Th text="On-Time %" width={80} align="center" />
            <Th text="Avg Delay" width={90} align="center" />
          </View>
          {rows.map((r) => (
            <View key={r.depot} style={styles.tr}>
              <Td text={r.depot} width={70} style={styles.tdDepot} />
              <Td text={r.best.transporter} width={120} style={styles.tdBest} />
              <Td text={String(r.best.count)} width={80} align="center" style={styles.tdMuted} />
              <Td text={`${r.best.otPct.toFixed(0)}%`} width={80} align="center" style={styles.tdBest} />
              <Td text={delayLabel(r.best.avg)} width={90} align="center" style={styles.tdMuted} />
              <Td text={r.worst.transporter} width={120} style={styles.tdWorst} />
              <Td text={String(r.worst.count)} width={80} align="center" style={styles.tdMuted} />
              <Td text={`${r.worst.otPct.toFixed(0)}%`} width={80} align="center" style={styles.tdWorst} />
              <Td text={delayLabel(r.worst.avg)} width={90} align="center" style={styles.tdMuted} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function DepotOverviewTable({
  rows,
}: {
  rows: { depot: string; total: number; pending: number; dispatched: number; completed: number; returned: number; cancelled: number; gsv: number; cases: number }[];
}) {
  return (
    <View style={[styles.tableCard, shadow.sm, { paddingTop: 0 }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={[styles.tr, styles.thRowAlt]}>
            <Th text="Depot" width={70} />
            <Th text="Total" width={60} align="right" />
            <Th text="Pending" width={70} align="right" />
            <Th text="Dispatched" width={80} align="right" />
            <Th text="Completed" width={80} align="right" />
            <Th text="Returned" width={70} align="right" />
            <Th text="Cancelled" width={70} align="right" />
            <Th text="GSV (₹)" width={110} align="right" />
            <Th text="Cases" width={70} align="right" />
          </View>
          {rows.map((r) => (
            <View key={r.depot} style={styles.tr}>
              <Td text={r.depot} width={70} style={styles.tdDepot} />
              <Td text={String(r.total)} width={60} align="right" style={styles.tdDepot} />
              <Td text={String(r.pending)} width={70} align="right" style={{ color: colors.amber, fontWeight: '700' }} />
              <Td text={String(r.dispatched)} width={80} align="right" style={{ color: colors.teal, fontWeight: '700' }} />
              <Td text={String(r.completed)} width={80} align="right" style={{ color: colors.green, fontWeight: '700' }} />
              <Td text={String(r.returned)} width={70} align="right" style={{ color: colors.purple, fontWeight: '700' }} />
              <Td text={String(r.cancelled)} width={70} align="right" style={{ color: colors.red, fontWeight: '700' }} />
              <Td text={finr(r.gsv)} width={110} align="right" />
              <Td text={r.cases.toFixed(0)} width={70} align="right" />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 12, paddingBottom: 40, gap: 0 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  customRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  customField: { flex: 1 },
  customLabel: { fontSize: 10, fontWeight: '700', color: colors.g500, textTransform: 'uppercase', marginBottom: 4 },
  warning: { fontSize: 11, color: colors.amberDk, marginBottom: 8 },
  insightRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  insightCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.g200,
    borderLeftWidth: 3,
    borderRadius: radius.md,
    padding: 10,
    paddingHorizontal: 13,
  },
  insightLabel: { fontSize: 8.5, fontWeight: '700', color: colors.g400, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 },
  insightValue: { fontSize: 13, fontWeight: '700', color: colors.g900 },
  insightSub: { fontSize: 9, color: colors.g400, marginTop: 2 },
  tableCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.lg,
    padding: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  tableTitle: { fontSize: 11, fontWeight: '700', color: colors.navy, letterSpacing: 0.4, marginBottom: 4, paddingHorizontal: 4 },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.g100 },
  thRow: { backgroundColor: colors.g50, borderBottomWidth: 2, borderBottomColor: colors.g200 },
  thRowAlt: { backgroundColor: colors.g100 },
  tfootRow: { backgroundColor: colors.g50, borderTopWidth: 2, borderTopColor: colors.g200, borderBottomWidth: 0 },
  th: { fontSize: 9, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, paddingVertical: 7, paddingHorizontal: 8 },
  td: { fontSize: 12, color: colors.g900, paddingVertical: 6, paddingHorizontal: 8 },
  tdNum: { fontWeight: '700', color: colors.navy },
  tdMuted: { color: colors.g500 },
  tdBold: { fontWeight: '700', color: colors.g900 },
  tdDepot: { fontWeight: '700', color: colors.navy },
  tdBest: { color: colors.green, fontWeight: '600' },
  tdWorst: { color: colors.red, fontWeight: '600' },
});
