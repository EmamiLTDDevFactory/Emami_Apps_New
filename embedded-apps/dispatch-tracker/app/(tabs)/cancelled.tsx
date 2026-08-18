import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { fd, finr, fmtCw, sv, toDate } from '@/lib/format';
import { CancelledInvoice } from '@/types/models';
import { KPICard } from '@/components/KPICard';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { FilterRow, FilterSelect, SearchInput } from '@/components/FilterBar';

/**
 * Ported 1:1 from dis_shared_components.py's render_cancelled(). Read-only on
 * both roles — no action buttons on this tab in the original app either.
 */

const PERIODS = ['All Time', 'Today', 'Last 7 Days', 'Last 30 Days', 'This Month'];
const PAGE_SIZE = 7;

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

/** _dfilter — always filters on invoice_date. */
function inPeriod(period: string, dateVal: unknown): boolean {
  if (period === 'All Time') return true;
  const cutoff = periodCutoff(period);
  if (!cutoff) return true;
  const d = toDate(dateVal);
  if (!d) return false;
  return d.getTime() >= cutoff.getTime();
}

/** _inv_total_for_depot — sum of all 5 status caches, filtered by depot when one is selected. */
function invTotalForDepot(depot: string, caches: (Array<{ depot?: string }> | null)[]): number {
  let t = 0;
  for (const c of caches) {
    if (!c) continue;
    t += depot === 'All Depots' ? c.length : c.filter((r) => (r.depot ?? '') === depot).length;
  }
  return t;
}

export default function CancelledScreen() {
  const { session, readOnly } = useAuth();
  const { cancCache, pendCache, dispCache, compCache, retCache, loading, errors, ensureCancelled } = useData();

  useEffect(() => {
    ensureCancelled();
  }, [ensureCancelled]);

  const [search, setSearch] = useState('');
  const [depot, setDepot] = useState('All Depots');
  const [period, setPeriod] = useState('All Time');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, depot, period]);

  const dcRows = cancCache ?? [];

  const depotOptions = useMemo(() => {
    if (!readOnly) return ['All Depots'];
    const sessDeps = (session?.depots ?? []).filter(Boolean);
    const dataDeps = Array.from(new Set(dcRows.map((r) => r.depot).filter((d): d is string => !!d)));
    const all = Array.from(new Set([...sessDeps, ...dataDeps])).sort();
    return all.length ? ['All Depots', ...all] : ['All Depots'];
  }, [readOnly, session, dcRows]);

  const gsvCn = dcRows.reduce((s, r) => s + (Number(r.invoice_value) || 0), 0);
  const casesCn = dcRows.reduce((s, r) => s + (Number(r.no_of_cases) || 0), 0);
  const totalInvCn = invTotalForDepot(readOnly ? depot : 'All Depots', [pendCache, dispCache, compCache, retCache, cancCache]);

  const filtered = useMemo(() => {
    let ds = dcRows.slice();
    if (readOnly && depot !== 'All Depots') ds = ds.filter((r) => (r.depot ?? '') === depot);
    if (search) {
      const q = search.toLowerCase();
      ds = ds.filter(
        (r) =>
          (r.invoice_no ?? '').toLowerCase().includes(q) ||
          (r.customer_name ?? '').toLowerCase().includes(q) ||
          (r.town ?? '').toLowerCase().includes(q)
      );
    }
    if (period !== 'All Time') ds = ds.filter((r) => inPeriod(period, r.invoice_date));
    ds.sort((a, b) => {
      const da = toDate(a.cancel_date ?? a.invoice_date);
      const db = toDate(b.cancel_date ?? b.invoice_date);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.getTime() - da.getTime();
    });
    return ds;
  }, [dcRows, readOnly, depot, search, period]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (errors.canc) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <EmptyState message={errors.canc} icon="⚠️" />
      </ScrollView>
    );
  }

  if (!cancCache && loading.canc) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <EmptyState message="Loading cancelled invoices…" icon="✕" />
      </ScrollView>
    );
  }

  if (!dcRows.length) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <EmptyState message="No cancelled invoices yet" icon="✕" />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.kpiRow}>
        <KPICard icon="✕" label="Total Cancelled" value={`${dcRows.length}/${totalInvCn}`} color={colors.red} />
        <KPICard icon="💰" label="GSV Cancelled" value={finr(gsvCn)} color={colors.gray} sub={`${casesCn.toFixed(0)} cases`} />
      </View>

      <FilterRow>
        <SearchInput value={search} onChangeText={setSearch} placeholder="🔍  Invoice / Customer / Town" />
        {readOnly && <FilterSelect value={depot} options={depotOptions} onChange={setDepot} minWidth={120} />}
        <FilterSelect value={period} options={PERIODS} onChange={setPeriod} minWidth={120} />
      </FilterRow>

      {!filtered.length ? (
        <EmptyState message="No results" icon="🔍" />
      ) : (
        <>
          {pageRows.map((row, i) => (
            <CancelledCard key={row.invoice_no + i} row={row} bg={i % 2 === 0 ? '#fff' : colors.cancelledPink} />
          ))}
          <Pagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  color,
  bold,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  bold?: boolean;
  wide?: boolean;
}) {
  return (
    <View style={[styles.field, wide ? styles.fieldWide : styles.fieldNarrow]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, bold ? styles.fieldValueBold : null, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function CancelledCard({ row, bg }: { row: CancelledInvoice; bg: string }) {
  const dispatched = !!toDate(row.dispatch_date);
  const badgeLabel = dispatched ? 'After Dispatch' : 'Before Dispatch';
  const canDt = sv(row.cancel_date, '');
  const reason = sv(row.cancel_reason, '');

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✕ {badgeLabel}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <Field
          wide
          bold
          label="Invoice No"
          value={
            <>
              {row.invoice_no}
              {row.depot ? <Text style={styles.depotChip}> {row.depot}</Text> : null}
            </>
          }
        />
        <Field label="Inv Date" value={fd(row.invoice_date)} />
        <Field wide label="Customer" value={(row.customer_name ?? '').slice(0, 28)} />
        <Field label="Town" value={row.town ?? ''} color={colors.navy} bold />
        <Field label="Cases" value={fmtCw(row.no_of_cases, row.gross_weight_kg)} bold />
        <Field label="Value" value={finr(row.invoice_value)} color="#d29922" bold />
        <Field label="Cancel Date" value={canDt ? canDt.slice(0, 10) : '—'} color={colors.red} />
        <Field label="Dispatch" value={dispatched ? fd(row.dispatch_date) : 'Not dispatched'} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Reason: <Text style={styles.reasonText}>{reason.slice(0, 100)}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 28 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  card: {
    borderWidth: 1,
    borderColor: colors.redBd,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
    borderRadius: radius.md,
    padding: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  badgeRow: { marginBottom: 8 },
  badge: {
    backgroundColor: colors.redLt,
    borderWidth: 1,
    borderColor: colors.redBd,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: colors.redDk },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  field: { minWidth: 90 },
  fieldWide: { flexBasis: '46%', flexGrow: 1 },
  fieldNarrow: { flexBasis: '30%', flexGrow: 1 },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  fieldValue: { fontSize: 12, color: colors.g700 },
  fieldValueBold: { fontWeight: '700', color: colors.g900 },
  depotChip: {
    backgroundColor: colors.navyLt,
    color: colors.navy,
    fontSize: 9,
    fontWeight: '700',
    borderRadius: 3,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  footer: { borderTopWidth: 1, borderTopColor: '#FEE2E2', paddingTop: 8 },
  footerText: { fontSize: 11, color: colors.gray },
  reasonText: { fontWeight: '700', color: colors.redDk },
});
