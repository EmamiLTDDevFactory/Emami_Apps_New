import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getRetVal } from '@/lib/api';
import { canonicalDelayColor, canonicalDelayLabel, eddVsTodayColor } from '@/lib/delay';
import { fd, finr, gsvFmt, sfloat, sv, toDate } from '@/lib/format';
import { exportReportToExcel, ReportType } from '@/lib/export';
import { AnyInvoiceRow } from '@/types/models';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { ActiveFilterChip, FilterRow, FilterSelect, SearchInput } from '@/components/FilterBar';

/**
 * Ported 1:1 from render_reports() in streamlit_app/dis_shared_components.py
 * (~lines 2558-3096) — the "Reports" tab that doubles as a cross-tab browser
 * over the 5 status caches (pending/dispatched/completed/returned/cancelled)
 * plus a deduped "all" view, with a dynamic filter panel whose f2/f3/f4 slots
 * change meaning per active type, a commit(Apply)/Reset pattern, and an
 * Excel export per type via lib/export.ts's exportReportToExcel.
 *
 * Two intentional deviations from the literal Python source (both scoped to
 * cosmetic/summary text, not to any filter/threshold logic):
 *  1. The active-type filter-summary line does a straightforward "join
 *     non-default committed values" instead of reproducing Python's literal
 *     `ft != "All Transporters"` check verbatim (which, read literally, would
 *     make that term appear even when nothing is filtered on non-transporter
 *     types, since e.g. "All Customers" != "All Transporters" is always true).
 *  2. The Depot dropdown's data-derived options come from the ACTIVE type's
 *     own rows (as the task spec calls for) rather than Python's "all" cache.
 */

// ── Type metadata (icon/label/color per type) ─────────────────────────────

const TYPE_META: Record<ReportType, { icon: string; label: string; color: string; bgLight: string; bgActive: string }> = {
  all: { icon: '📋', label: 'All', color: '#1E3A7B', bgLight: '#EFF6FF', bgActive: '#DBEAFE' },
  pending: { icon: '⏳', label: 'Pending', color: '#D97706', bgLight: '#FFFBEB', bgActive: '#FEF3C7' },
  dispatched: { icon: '🚚', label: 'Dispatched', color: '#1D4ED8', bgLight: '#EFF6FF', bgActive: '#DBEAFE' },
  completed: { icon: '✅', label: 'Completed', color: '#15803D', bgLight: '#F0FDF4', bgActive: '#DCFCE7' },
  returned: { icon: '↩', label: 'Returned', color: '#7C3AED', bgLight: '#F5F3FF', bgActive: '#EDE9FE' },
  cancelled: { icon: '✕', label: 'Cancelled', color: '#DC2626', bgLight: '#FEF2F2', bgActive: '#FEE2E2' },
};
const TYPE_ORDER: ReportType[] = ['all', 'pending', 'dispatched', 'completed', 'returned', 'cancelled'];

const PERIODS = ['All Time', 'Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month'];
const PAGE_SIZES = ['10', '25', '50', '100'];

interface FilterState {
  depot: string;
  period: string;
  f2: string;
  f3: string;
  f4: string;
}

function fieldFlags(type: ReportType) {
  const showTrans = type === 'all' || type === 'dispatched' || type === 'completed';
  const showRetType = type === 'returned';
  const showDelay = type === 'completed';
  const townOrCust = type === 'pending' || type === 'cancelled'; // f3 => Town, f4 hidden
  return { showTrans, showRetType, showDelay, townOrCust };
}

function defaultFilters(type: ReportType): FilterState {
  const { showTrans, showRetType, showDelay, townOrCust } = fieldFlags(type);
  return {
    depot: 'All Depots',
    period: 'All Time',
    f2: showTrans ? 'All Transporters' : showRetType ? 'All Types' : 'All Customers',
    f3: showDelay ? 'All' : townOrCust ? 'All Towns' : 'All Customers',
    f4: 'All Towns',
  };
}

function defaultFilterRecord(): Record<ReportType, FilterState> {
  const rec = {} as Record<ReportType, FilterState>;
  TYPE_ORDER.forEach((t) => {
    rec[t] = defaultFilters(t);
  });
  return rec;
}

// ── Date helpers (period cutoffs + "Last Month" anchor) ────────────────────

function periodCutoff(period: string): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  switch (period) {
    case 'Today':
      return today;
    case 'Last 7 Days': {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case 'Last 30 Days': {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      return d;
    }
    case 'This Month': {
      const d = new Date(today);
      d.setDate(1);
      return d;
    }
    default:
      return null;
  }
}

function inPeriod(period: string, dateVal: unknown): boolean {
  if (period === 'All Time' || period === 'Last Month') return true;
  const cutoff = periodCutoff(period);
  if (!cutoff) return true;
  const d = toDate(dateVal);
  if (!d) return false;
  return d.getTime() >= cutoff.getTime();
}

/** lm = (first day of this month) - 1 day = last day of the previous month. */
function lastMonthAnchor(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  return d;
}

function inLastMonth(dateVal: unknown, lm: Date): boolean {
  const d = toDate(dateVal);
  if (!d) return false;
  return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
}

function diffDays(a: Date, b: Date): number {
  const ad = new Date(a);
  ad.setHours(0, 0, 0, 0);
  const bd = new Date(b);
  bd.setHours(0, 0, 0, 0);
  return Math.round((ad.getTime() - bd.getTime()) / 86400000);
}

// ── Computed columns + filter chain ─────────────────────────────────────

type ComputedRow = AnyInvoiceRow & { _edd: Date | null; _delay: number | null };

/** _add_computed — _edd = to_date(edd); _delay = (actual_delivery_date - _edd).days, else null. */
function addComputed(rows: AnyInvoiceRow[]): ComputedRow[] {
  return rows.map((r) => {
    const _edd = toDate(r.edd);
    const act = toDate(r.actual_delivery_date);
    const _delay = _edd && act ? diffDays(act, _edd) : null;
    return { ...r, _edd, _delay };
  });
}

/** _apply_filters(src) — depot -> period -> f2 (transporter/return-type/customer) -> f3 (delay/town/customer) -> f4 (town). */
function applyFilters(rows: AnyInvoiceRow[], type: ReportType, f: FilterState): AnyInvoiceRow[] {
  const { showTrans, showRetType, showDelay, townOrCust } = fieldFlags(type);
  let d = rows;

  if (f.depot !== 'All Depots') d = d.filter((r) => (r.depot ?? '') === f.depot);

  if (f.period !== 'All Time') {
    if (f.period === 'Last Month') {
      const lm = lastMonthAnchor();
      d = d.filter((r) => inLastMonth(r.invoice_date, lm));
    } else {
      d = d.filter((r) => inPeriod(f.period, r.invoice_date));
    }
  }

  if (showTrans) {
    if (f.f2 !== 'All Transporters') {
      const q = f.f2.toLowerCase();
      d = d.filter((r) => (r.transporter ?? '').toLowerCase().includes(q));
    }
  } else if (showRetType) {
    if (f.f2 === 'Full Return') d = d.filter((r) => (r.cancel_reason ?? '').startsWith('FULL'));
    else if (f.f2 === 'Partial Refund') d = d.filter((r) => (r.cancel_reason ?? '').startsWith('PARTIAL'));
  } else if (f.f2 !== 'All Customers') {
    d = d.filter((r) => (r.customer_name ?? '') === f.f2);
  }

  if (showDelay) {
    if (f.f3 === 'On-time') d = d.filter((r) => (Number(r.total_delay) || 0) <= 0);
    else if (f.f3 === 'Delayed') d = d.filter((r) => (Number(r.total_delay) || 0) > 0);
  } else if (townOrCust) {
    if (f.f3 !== 'All Towns') d = d.filter((r) => (r.town ?? '') === f.f3);
  } else if (f.f3 !== 'All Customers') {
    d = d.filter((r) => (r.customer_name ?? '') === f.f3);
  }

  if (!townOrCust && f.f4 !== 'All Towns') d = d.filter((r) => (r.town ?? '') === f.f4);

  return d;
}

/** _opts(col) — unique values, transporter suffix-stripped on "  [", capped at 100. */
function buildOptions(rows: AnyInvoiceRow[], field: 'transporter' | 'customer_name' | 'town', allLabel: string): string[] {
  const set = new Set<string>();
  rows.forEach((r) => {
    const raw = sv((r as unknown as Record<string, unknown>)[field]);
    if (!raw) return;
    const v = field === 'transporter' ? raw.split('  [')[0].trim() : raw.trim();
    if (v) set.add(v);
  });
  return [allLabel, ...Array.from(set).sort().slice(0, 100)];
}

/** _type_dfs["all"] — concat of the 5 status caches, deduped by invoice_no (first wins). */
function dedupeByInvoiceNo(rows: AnyInvoiceRow[]): AnyInvoiceRow[] {
  const seen = new Set<string>();
  const out: AnyInvoiceRow[] = [];
  rows.forEach((r) => {
    if (!r.invoice_no || seen.has(r.invoice_no)) return;
    seen.add(r.invoice_no);
    out.push(r);
  });
  return out;
}

// ── Table column configs ────────────────────────────────────────────────

interface ColumnDef {
  key: string;
  label: string;
  width: number;
}

const BASE_COLUMNS: ColumnDef[] = [
  { key: 'invoice_no', label: 'Invoice No', width: 118 },
  { key: 'customer_name', label: 'Customer', width: 150 },
  { key: 'town', label: 'Town', width: 100 },
  { key: 'invoice_date', label: 'Inv Date', width: 90 },
  { key: 'invoice_value', label: 'Value (₹)', width: 110 },
  { key: 'status', label: 'Status', width: 90 },
];

const TYPE_EXTRA_COLUMNS: Record<ReportType, ColumnDef[]> = {
  all: [{ key: 'no_of_cases', label: 'Cases', width: 70 }],
  pending: [
    { key: '_edd', label: 'Exp. Delivery', width: 100 },
    { key: 'no_of_cases', label: 'Cases', width: 70 },
  ],
  dispatched: [
    { key: 'dispatch_date', label: 'Dispatch Date', width: 100 },
    { key: '_edd', label: 'Exp. Delivery', width: 100 },
    { key: 'transporter', label: 'Transporter', width: 130 },
    { key: 'lr_no', label: 'LR No', width: 90 },
  ],
  completed: [
    { key: 'dispatch_date', label: 'Dispatch Date', width: 100 },
    { key: 'actual_delivery_date', label: 'Actual Delivery', width: 105 },
    { key: '_edd', label: 'Exp. Delivery', width: 100 },
    { key: 'total_delay', label: 'Delay (Days)', width: 95 },
    { key: '_delay', label: 'Delay vs EDD', width: 95 },
    { key: 'transporter', label: 'Transporter', width: 130 },
  ],
  returned: [
    { key: 'actual_delivery_date', label: 'Actual Delivery', width: 105 },
    { key: 'receiving_date', label: 'Receiving Date', width: 105 },
    { key: 'cancel_reason', label: 'Reason', width: 180 },
  ],
  cancelled: [
    { key: 'cancel_date', label: 'Cancel Date', width: 95 },
    { key: 'cancel_reason', label: 'Reason', width: 180 },
  ],
};

const DATE_KEYS = new Set([
  'invoice_date',
  'dispatch_date',
  'actual_delivery_date',
  'cancel_date',
  'receiving_date',
  'order_receiving_date',
  'payment_receiving_date',
]);

function columnsFor(type: ReportType, showDepot: boolean): ColumnDef[] {
  const base = [...BASE_COLUMNS];
  if (showDepot) base.splice(1, 0, { key: 'depot', label: 'Depot', width: 70 });
  return [...base, ...TYPE_EXTRA_COLUMNS[type]];
}

function Cell({ col, row }: { col: ColumnDef; row: ComputedRow }) {
  const key = col.key;

  if (key === 'invoice_no') {
    return (
      <Text style={[styles.cellText, styles.cellInvoiceNo]} numberOfLines={1}>
        {sv(row.invoice_no, '—')}
      </Text>
    );
  }
  if (key === 'depot') {
    return (
      <View style={styles.depotChip}>
        <Text style={styles.depotChipText} numberOfLines={1}>
          {sv(row.depot, '—')}
        </Text>
      </View>
    );
  }
  if (key === 'customer_name') {
    return (
      <Text style={[styles.cellText, styles.cellCustomer]} numberOfLines={1}>
        {sv(row.customer_name, '—')}
      </Text>
    );
  }
  if (key === 'invoice_value') {
    return (
      <Text style={[styles.cellText, styles.cellValue]} numberOfLines={1}>
        {finr(row.invoice_value)}
      </Text>
    );
  }
  if (key === '_edd') {
    return (
      <Text style={[styles.cellText, { color: eddVsTodayColor(row.edd, 'green-future'), fontWeight: '700' }]} numberOfLines={1}>
        {fd(row.edd)}
      </Text>
    );
  }
  if (key === '_delay' || key === 'total_delay') {
    const v = key === '_delay' ? row._delay : sfloat(row.total_delay);
    if (v === null || v === undefined) {
      return <Text style={[styles.cellText, styles.cellMuted]}>—</Text>;
    }
    return (
      <Text style={[styles.cellText, { color: canonicalDelayColor(v), fontWeight: '700' }]} numberOfLines={1}>
        {canonicalDelayLabel(v)}
      </Text>
    );
  }
  if (key === 'distance_km') {
    const km = sfloat((row as unknown as Record<string, unknown>).distance_km);
    return <Text style={[styles.cellText, { color: colors.g700 }]}>{km && km > 0 ? `${Math.round(km)} km` : '—'}</Text>;
  }
  if (DATE_KEYS.has(key)) {
    return (
      <Text style={[styles.cellText, styles.cellMuted]} numberOfLines={1}>
        {fd((row as unknown as Record<string, unknown>)[key])}
      </Text>
    );
  }
  if (key === 'cancel_reason') {
    return (
      <Text style={[styles.cellText, styles.cellReason]} numberOfLines={2}>
        {sv(row.cancel_reason, '—')}
      </Text>
    );
  }
  return (
    <Text style={styles.cellText} numberOfLines={1}>
      {sv((row as unknown as Record<string, unknown>)[key], '—')}
    </Text>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ minWidth: 130 }}>
      <Text style={styles.filterFieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const { session, readOnly } = useAuth();
  const {
    pendCache,
    dispCache,
    compCache,
    retCache,
    cancCache,
    loading,
    ensurePending,
    ensureDispatched,
    ensureCompleted,
    ensureReturned,
    ensureCancelled,
  } = useData();

  useEffect(() => {
    ensurePending();
    ensureDispatched();
    ensureCompleted();
    ensureReturned();
    ensureCancelled();
  }, [ensurePending, ensureDispatched, ensureCompleted, ensureReturned, ensureCancelled]);

  const typeDfs = useMemo<Record<ReportType, AnyInvoiceRow[]>>(() => {
    const pending = pendCache ?? [];
    const dispatched = dispCache ?? [];
    const completed = compCache ?? [];
    const returned = retCache ?? [];
    const cancelled = cancCache ?? [];
    const all = dedupeByInvoiceNo([...pending, ...dispatched, ...completed, ...returned, ...cancelled]);
    return { all, pending, dispatched, completed, returned, cancelled };
  }, [pendCache, dispCache, compCache, retCache, cancCache]);

  const allEmpty = TYPE_ORDER.every((t) => typeDfs[t].length === 0);
  const stillLoading = allEmpty && (loading.pend || loading.disp || loading.comp || loading.ret || loading.canc);

  const [activeType, setActiveType] = useState<ReportType>('all');
  const [committed, setCommitted] = useState<Record<ReportType, FilterState>>(defaultFilterRecord);
  const [draft, setDraft] = useState<FilterState>(() => defaultFilters('all'));

  const [search, setSearch] = useState<Partial<Record<ReportType, string>>>({});
  const [pageSizeByType, setPageSizeByType] = useState<Partial<Record<ReportType, string>>>({});
  const [page, setPage] = useState<Partial<Record<ReportType, number>>>({});
  const [exporting, setExporting] = useState(false);

  function switchType(type: ReportType) {
    setActiveType(type);
    setCommitted(defaultFilterRecord());
    setDraft(defaultFilters(type));
  }

  const { showTrans, showRetType, showDelay, townOrCust } = fieldFlags(activeType);

  // Dropdown option lists are scoped by the (uncommitted) draft period, falling
  // back to the unfiltered active-type rows if that period has zero matches.
  const optSrcRows = useMemo(() => {
    const raw = typeDfs[activeType];
    if (draft.period === 'All Time') return raw;
    let out: AnyInvoiceRow[];
    if (draft.period === 'Last Month') {
      const lm = lastMonthAnchor();
      out = raw.filter((r) => inLastMonth(r.invoice_date, lm));
    } else {
      out = raw.filter((r) => inPeriod(draft.period, r.invoice_date));
    }
    return out.length ? out : raw;
  }, [typeDfs, activeType, draft.period]);

  const depotOptions = useMemo(() => {
    if (!readOnly) return [];
    const sessDeps = (session?.depots ?? []).filter(Boolean);
    const dataDeps = typeDfs[activeType].map((r) => r.depot).filter((d): d is string => !!d);
    const all = Array.from(new Set([...sessDeps, ...dataDeps])).sort();
    return all.length ? ['All Depots', ...all] : [];
  }, [readOnly, session, typeDfs, activeType]);

  const f2Options = useMemo(() => {
    if (showTrans) return buildOptions(optSrcRows, 'transporter', 'All Transporters');
    if (showRetType) return ['All Types', 'Full Return', 'Partial Refund'];
    return buildOptions(optSrcRows, 'customer_name', 'All Customers');
  }, [optSrcRows, showTrans, showRetType]);

  const f3Options = useMemo(() => {
    if (showDelay) return ['All', 'On-time', 'Delayed'];
    if (townOrCust) return buildOptions(optSrcRows, 'town', 'All Towns');
    return buildOptions(optSrcRows, 'customer_name', 'All Customers');
  }, [optSrcRows, showDelay, townOrCust]);

  const f4Options = useMemo(() => buildOptions(optSrcRows, 'town', 'All Towns'), [optSrcRows]);

  const f2Label = showTrans ? 'Transporter' : showRetType ? 'Return Type' : 'Customer';
  const f3Label = showDelay ? 'Delay Status' : townOrCust ? 'Town' : 'Customer';

  function applyDraft() {
    setCommitted((prev) => ({ ...prev, [activeType]: { ...draft } }));
    setPage((p) => ({ ...p, [activeType]: 1 }));
  }
  function resetDraft() {
    const d = defaultFilters(activeType);
    setDraft(d);
    setCommitted((prev) => ({ ...prev, [activeType]: d }));
    setPage((p) => ({ ...p, [activeType]: 1 }));
  }

  // Committed-filtered + computed rows for ALL 6 types simultaneously, so the
  // nav cards' counts/GSV reflect each type's own committed filters instantly.
  const filteredByType = useMemo(() => {
    const out = {} as Record<ReportType, ComputedRow[]>;
    TYPE_ORDER.forEach((t) => {
      out[t] = addComputed(applyFilters(typeDfs[t], t, committed[t]));
    });
    return out;
  }, [typeDfs, committed]);

  const activeRows = filteredByType[activeType];

  const activeSearch = search[activeType] ?? '';
  const activePageSize = Number(pageSizeByType[activeType] ?? '25');
  const activePage = page[activeType] ?? 1;

  const searched = useMemo(() => {
    const q = activeSearch.trim().toLowerCase();
    if (!q) return activeRows;
    return activeRows.filter((r) => {
      const hay = [r.invoice_no, r.depot, r.customer_name, r.town, r.lr_no, r.transporter]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' | ');
      return hay.includes(q);
    });
  }, [activeRows, activeSearch]);

  const pageRows = useMemo(
    () => searched.slice((activePage - 1) * activePageSize, activePage * activePageSize),
    [searched, activePage, activePageSize]
  );

  const chips = useMemo(() => {
    const f = committed[activeType];
    const out: { icon: string; label: string }[] = [];
    if (f.depot !== 'All Depots') out.push({ icon: '🏭', label: f.depot });
    if (f.period !== 'All Time') out.push({ icon: '📅', label: f.period });
    if (showTrans && f.f2 !== 'All Transporters') out.push({ icon: '🚛', label: f.f2.slice(0, 22) });
    else if (showRetType && f.f2 !== 'All Types') out.push({ icon: '↩', label: f.f2.slice(0, 22) });
    else if (!showTrans && !showRetType && f.f2 !== 'All Customers') out.push({ icon: '👤', label: f.f2.slice(0, 22) });
    if (showDelay && f.f3 !== 'All') out.push({ icon: '⏱', label: f.f3 });
    else if (!showDelay && townOrCust && f.f3 !== 'All Towns') out.push({ icon: '📍', label: f.f3.slice(0, 18) });
    else if (!showDelay && !townOrCust && f.f3 !== 'All Customers') out.push({ icon: '👤', label: f.f3.slice(0, 22) });
    if (!townOrCust && f.f4 !== 'All Towns') out.push({ icon: '📍', label: f.f4.slice(0, 18) });
    return out;
  }, [committed, activeType, showTrans, showRetType, showDelay, townOrCust]);

  const meta = TYPE_META[activeType];
  const cnt = activeRows.length;
  const gsv = activeRows.reduce((s, r) => s + (sfloat(r.invoice_value) ?? 0), 0);
  const cases = activeRows.reduce((s, r) => s + (sfloat(r.no_of_cases) ?? 0), 0);
  const avg = cnt ? gsv / cnt : 0;

  const filterSummary = useMemo(() => {
    const f = committed[activeType];
    const parts = [f.period];
    if (showTrans && f.f2 !== 'All Transporters') parts.push(f.f2);
    if (!townOrCust && f.f4 !== 'All Towns') parts.push(f.f4);
    return parts.join(' · ');
  }, [committed, activeType, showTrans, townOrCust]);

  const columns = useMemo(() => columnsFor(activeType, readOnly), [activeType, readOnly]);

  async function handleExport() {
    setExporting(true);
    try {
      await exportReportToExcel({
        depotNo: session?.depot_number ?? 'ALL',
        type: activeType,
        rows: searched,
        getRetVal,
      });
    } finally {
      setExporting(false);
    }
  }

  if (stillLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.navy} />
        <Text style={styles.loadingText}>Loading report data…</Text>
      </View>
    );
  }

  if (allEmpty) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <EmptyState message="No report data available — visit each tab to load data" icon="📊" />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Reports" />

      <View style={styles.navGrid}>
        {TYPE_ORDER.map((t) => {
          const m = TYPE_META[t];
          const rows = filteredByType[t];
          const tCnt = rows.length;
          const tGsv = rows.reduce((s, r) => s + (sfloat(r.invoice_value) ?? 0), 0);
          const isActive = t === activeType;
          return (
            <Pressable
              key={t}
              style={[
                styles.navCard,
                isActive
                  ? { borderColor: m.color, backgroundColor: m.bgActive, borderWidth: 1.5 }
                  : { borderColor: colors.g200, backgroundColor: colors.surface, borderWidth: 1 },
                isActive ? shadow.lg : shadow.sm,
              ]}
              onPress={() => switchType(t)}>
              <Text style={styles.navIcon}>{m.icon}</Text>
              <Text style={[styles.navLabel, { color: m.color }]}>{m.label.toUpperCase()}</Text>
              <Text style={[styles.navCount, { color: m.color }]}>{tCnt}</Text>
              <Text style={styles.navGsv}>{gsvFmt(tGsv)}</Text>
              <View
                style={[
                  styles.navBtn,
                  isActive
                    ? { backgroundColor: m.color }
                    : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.g200 },
                ]}>
                <Text style={[styles.navBtnText, isActive ? { color: '#fff' } : { color: colors.g500 }]} numberOfLines={1}>
                  {isActive ? '✓  Viewing' : 'View Invoices'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.panel, shadow.sm]}>
        <Text style={styles.panelTitle}>
          🔽 &nbsp;Filters<Text style={styles.panelSubtitle}> — Showing: {meta.label}</Text>
        </Text>

        <View style={styles.filterGrid}>
          {readOnly && depotOptions.length > 0 ? (
            <FilterField label="Depot (Werks)">
              <FilterSelect value={draft.depot} options={depotOptions} onChange={(v) => setDraft((d) => ({ ...d, depot: v }))} minWidth={120} />
            </FilterField>
          ) : null}
          <FilterField label="Date Range">
            <FilterSelect value={draft.period} options={PERIODS} onChange={(v) => setDraft((d) => ({ ...d, period: v }))} minWidth={130} />
          </FilterField>
          <FilterField label={f2Label}>
            <FilterSelect value={draft.f2} options={f2Options} onChange={(v) => setDraft((d) => ({ ...d, f2: v }))} minWidth={140} />
          </FilterField>
          <FilterField label={f3Label}>
            <FilterSelect value={draft.f3} options={f3Options} onChange={(v) => setDraft((d) => ({ ...d, f3: v }))} minWidth={140} />
          </FilterField>
          {!townOrCust ? (
            <FilterField label="Town">
              <FilterSelect value={draft.f4} options={f4Options} onChange={(v) => setDraft((d) => ({ ...d, f4: v }))} minWidth={120} />
            </FilterField>
          ) : null}
        </View>

        <View style={styles.filterActions}>
          <Pressable style={styles.applyBtn} onPress={applyDraft}>
            <Text style={styles.applyBtnText}>✓  Apply</Text>
          </Pressable>
          <Pressable style={styles.resetBtn} onPress={resetDraft}>
            <Text style={styles.resetBtnText}>↺  Reset</Text>
          </Pressable>
        </View>

        {chips.length > 0 ? (
          <View style={styles.chipsRow}>
            <Text style={styles.chipsLabel}>Active:</Text>
            {chips.map((c, i) => (
              <ActiveFilterChip key={i} label={`${c.icon} ${c.label}`} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.summaryBar, { borderTopColor: meta.color }, shadow.sm]}>
        <View style={styles.summaryHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>
              {meta.icon}  {meta.label} Report
            </Text>
            <Text style={styles.summarySubtitle} numberOfLines={1}>
              {filterSummary}
            </Text>
          </View>
          <View style={[styles.typePill, { backgroundColor: meta.color }]}>
            <Text style={styles.typePillText}>{meta.label.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.statStrip}>
          <StatCell label="Records" value={String(cnt)} />
          <StatCell label="Total Value" value={finr(gsv)} color={colors.amber} />
          <StatCell label="Total Cases" value={cases.toFixed(0)} />
          <StatCell label="Avg Value" value={cnt ? finr(avg) : '—'} />
        </View>
      </View>

      {searched.length > 0 ? (
        <Pressable style={[styles.exportBtn, exporting && styles.exportBtnDisabled]} onPress={handleExport} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.exportBtnText}>
              ↓ Export {meta.label} ({searched.length})
            </Text>
          )}
        </Pressable>
      ) : null}

      <FilterRow>
        <SearchInput
          value={activeSearch}
          onChangeText={(v) => {
            setSearch((s) => ({ ...s, [activeType]: v }));
            setPage((p) => ({ ...p, [activeType]: 1 }));
          }}
          placeholder="🔍  Search invoices, customer, town, LR number…"
        />
        <FilterSelect
          value={String(activePageSize)}
          options={PAGE_SIZES}
          onChange={(v) => {
            setPageSizeByType((s) => ({ ...s, [activeType]: v }));
            setPage((p) => ({ ...p, [activeType]: 1 }));
          }}
          minWidth={70}
        />
      </FilterRow>

      {searched.length === 0 ? (
        <EmptyState message="No records found" icon="📋" hint="Adjust filters or select a different date range" />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableScroll}>
            <View>
              <View style={styles.headerRow}>
                {columns.map((c) => (
                  <Text key={c.key} style={[styles.headerCell, { width: c.width }]} numberOfLines={1}>
                    {c.label}
                  </Text>
                ))}
              </View>
              {pageRows.map((row, i) => (
                <View key={row.invoice_no + i} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#FAFBFC' }]}>
                  {columns.map((c) => (
                    <View key={c.key} style={{ width: c.width, paddingHorizontal: 6, justifyContent: 'center' }}>
                      <Cell col={c} row={row} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          <Pagination
            page={activePage}
            totalItems={searched.length}
            pageSize={activePageSize}
            onPageChange={(p) => setPage((s) => ({ ...s, [activeType]: p }))}
            variant="full"
            showJump
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 32 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.bg },
  loadingText: { fontSize: 12, color: colors.g500 },

  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  navCard: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 100,
    borderRadius: radius.md,
    padding: 10,
    alignItems: 'center',
    gap: 3,
  },
  navIcon: { fontSize: 18 },
  navLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  navCount: { fontSize: 20, fontWeight: '900' },
  navGsv: { fontSize: 10, fontWeight: '600', color: colors.g500 },
  navBtn: { marginTop: 4, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 5, width: '100%', alignItems: 'center' },
  navBtnText: { fontSize: 9.5, fontWeight: '700' },

  panel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.g200, borderRadius: radius.md, padding: 12, marginBottom: 10 },
  panelTitle: { fontSize: 12, fontWeight: '800', color: colors.g900, marginBottom: 8 },
  panelSubtitle: { fontSize: 11, fontWeight: '500', color: colors.g400 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  filterFieldLabel: { fontSize: 9, fontWeight: '700', color: colors.g500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  filterActions: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  applyBtn: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 9 },
  applyBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  resetBtn: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.g200, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 9 },
  resetBtnText: { color: colors.g500, fontSize: 12, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4 },
  chipsLabel: { fontSize: 10, fontWeight: '700', color: colors.g400, marginRight: 2 },

  summaryBar: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.g200,
    borderTopWidth: 3,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: colors.g900 },
  summarySubtitle: { fontSize: 11, color: colors.g500, marginTop: 2 },
  typePill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  typePillText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  statStrip: { flexDirection: 'row', flexWrap: 'wrap' },
  statCell: { flexBasis: '25%', flexGrow: 1, minWidth: 80, gap: 2 },
  statLabel: { fontSize: 9, fontWeight: '700', color: colors.g400, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 15, fontWeight: '800', color: colors.g900 },

  exportBtn: {
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  tableScroll: { borderWidth: 1, borderColor: colors.g200, borderRadius: radius.sm, backgroundColor: colors.surface },
  headerRow: { flexDirection: 'row', backgroundColor: colors.navyLt, borderBottomWidth: 1, borderBottomColor: colors.g200 },
  headerCell: { fontSize: 9.5, fontWeight: '800', color: colors.navy, textTransform: 'uppercase', letterSpacing: 0.3, paddingHorizontal: 6, paddingVertical: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.g100, minHeight: 40, alignItems: 'center' },
  cellText: { fontSize: 11.5, color: colors.g700 },
  cellInvoiceNo: { fontWeight: '800', color: colors.blueDk },
  cellCustomer: { fontWeight: '700', color: colors.g900 },
  cellValue: { fontWeight: '700', color: colors.amber },
  cellMuted: { color: colors.g500 },
  cellReason: { color: colors.g500 },
  depotChip: { backgroundColor: colors.navyLt, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start' },
  depotChipText: { fontSize: 9.5, fontWeight: '700', color: colors.navy },
});
