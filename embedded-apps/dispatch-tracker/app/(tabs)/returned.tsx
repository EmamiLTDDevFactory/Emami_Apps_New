import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getRetVal } from '@/lib/api';
import { fd, finr, fmtCw, toDate } from '@/lib/format';
import { ReturnedInvoice } from '@/types/models';
import { KPICard } from '@/components/KPICard';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { FilterRow, FilterSelect, SearchInput } from '@/components/FilterBar';

/**
 * Ported 1:1 from dis_shared_components.py's render_returned(). Read-only on
 * both roles in this app (no action buttons ever appear on this tab) — the
 * HQ-only st.success() flash-message relay after mutating actions elsewhere
 * in the original app has no equivalent here since nothing on this screen
 * mutates data.
 */

const PERIODS = ['All Time', 'Today', 'Last 7 Days', 'Last 30 Days', 'This Month'];
const TYPES = ['All', 'Full Return', 'Partial Refund'];
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

/** _dfilter — always filters on invoice_date, whatever the tab is sorted by. */
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

/** Inline _parse() from render_returned(): "FULL | Credit:{cn} | SAP:{date}" / "PARTIAL | Credit:{cn} | SAP:{date} | Pieces:{n} | Mat:{m}". */
function parseReason(reason: string, key: string): string {
  for (const part of reason.split('|')) {
    const p = part.trim();
    if (p.startsWith(key + ':')) return p.slice(key.length + 1).trim();
  }
  return '—';
}

export default function ReturnedScreen() {
  const { session, readOnly } = useAuth();
  const { retCache, pendCache, dispCache, compCache, cancCache, loading, errors, ensureReturned } = useData();

  useEffect(() => {
    ensureReturned();
  }, [ensureReturned]);

  const [search, setSearch] = useState('');
  const [depot, setDepot] = useState('All Depots');
  const [period, setPeriod] = useState('All Time');
  const [type, setType] = useState('All');
  const [page, setPage] = useState(1);
  const [retVals, setRetVals] = useState<Record<string, string>>({});

  useEffect(() => {
    setPage(1);
  }, [search, depot, period, type]);

  const drRows = retCache ?? [];

  const depotOptions = useMemo(() => {
    if (!readOnly) return ['All Depots'];
    const sessDeps = (session?.depots ?? []).filter(Boolean);
    const dataDeps = Array.from(new Set(drRows.map((r) => r.depot).filter((d): d is string => !!d)));
    const all = Array.from(new Set([...sessDeps, ...dataDeps])).sort();
    return all.length ? ['All Depots', ...all] : ['All Depots'];
  }, [readOnly, session, drRows]);

  const fullCnt = drRows.filter((r) => (r.cancel_reason ?? '').startsWith('FULL')).length;
  const partialCnt = drRows.filter((r) => (r.cancel_reason ?? '').startsWith('PARTIAL')).length;
  const gsvR = drRows.reduce((s, r) => s + (Number(r.invoice_value) || 0), 0);
  const casesR = drRows.reduce((s, r) => s + (Number(r.no_of_cases) || 0), 0);
  const totalInvR = invTotalForDepot(readOnly ? depot : 'All Depots', [pendCache, dispCache, compCache, retCache, cancCache]);

  const filtered = useMemo(() => {
    let ds = drRows.slice();
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
    if (type === 'Full Return') ds = ds.filter((r) => (r.cancel_reason ?? '').startsWith('FULL'));
    else if (type === 'Partial Refund') ds = ds.filter((r) => (r.cancel_reason ?? '').startsWith('PARTIAL'));
    ds.sort((a, b) => {
      const da = toDate((a as ReturnedInvoice & { cancel_date?: string | null }).cancel_date ?? a.invoice_date);
      const db = toDate((b as ReturnedInvoice & { cancel_date?: string | null }).cancel_date ?? b.invoice_date);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.getTime() - da.getTime();
    });
    return ds;
  }, [drRows, readOnly, depot, search, period, type]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Fetch (and cache) Return Value per credit note for whatever page is currently visible.
  useEffect(() => {
    const missing = Array.from(
      new Set(
        pageRows.map((r) => parseReason(r.cancel_reason ?? '', 'Credit')).filter((cn) => cn && cn !== '—' && !(cn in retVals))
      )
    );
    if (!missing.length) return;
    let cancelled = false;
    missing.forEach((cn) => {
      getRetVal(cn)
        .then((v) => !cancelled && setRetVals((s) => ({ ...s, [cn]: v ?? '' })))
        .catch(() => !cancelled && setRetVals((s) => ({ ...s, [cn]: '' })));
    });
    return () => {
      cancelled = true;
    };
    // pageRows is a derived slice; only its content (credit notes) matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageRows.map((r) => r.invoice_no).join(',')]);

  if (errors.ret) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <EmptyState message={errors.ret} icon="⚠️" />
      </ScrollView>
    );
  }

  if (!retCache && loading.ret) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <EmptyState message="Loading returned invoices…" icon="↩" />
      </ScrollView>
    );
  }

  if (!drRows.length) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <EmptyState message="No returned invoices yet" icon="↩" />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.kpiRow}>
        <KPICard icon="↩" label="Total Returns" value={`${drRows.length}/${totalInvR}`} color={colors.purple} />
        <KPICard icon="📦" label="Full Returns" value={String(fullCnt)} color={colors.navy} />
        <KPICard icon="🔄" label="Partial Refunds" value={String(partialCnt)} color={colors.amber} />
        <KPICard icon="💰" label="GSV Returned" value={finr(gsvR)} color={colors.red} sub={`${casesR.toFixed(0)} cases`} />
      </View>

      <FilterRow>
        <SearchInput value={search} onChangeText={setSearch} placeholder="🔍  Invoice / Customer / Town" />
        {readOnly && <FilterSelect value={depot} options={depotOptions} onChange={setDepot} minWidth={120} />}
        <FilterSelect value={period} options={PERIODS} onChange={setPeriod} minWidth={120} />
        <FilterSelect value={type} options={TYPES} onChange={setType} minWidth={130} />
      </FilterRow>

      {!filtered.length ? (
        <EmptyState message="No results" icon="🔍" />
      ) : (
        <>
          {pageRows.map((row, i) => (
            <ReturnedCard key={row.invoice_no + i} row={row} bg={i % 2 === 0 ? '#fff' : '#F8FAFF'} retVals={retVals} />
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

function ReturnedCard({ row, bg, retVals }: { row: ReturnedInvoice; bg: string; retVals: Record<string, string> }) {
  const reason = row.cancel_reason ?? '';
  const isFull = reason.startsWith('FULL');
  const isPartial = reason.startsWith('PARTIAL');
  const retLbl = isFull ? 'Full Return' : isPartial ? 'Partial Refund' : 'Return';
  const creditNote = parseReason(reason, 'Credit');
  const sapDateStr = parseReason(reason, 'SAP');
  const pieces = parseReason(reason, 'Pieces');
  const material = parseReason(reason, 'Mat');
  const retVal = creditNote !== '—' ? retVals[creditNote] : undefined;
  const hasActDelivery = !!toDate(row.actual_delivery_date);
  const showPostDelBadge = hasActDelivery && (isFull || isPartial);

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={styles.grid}>
        <Field
          wide
          label="Invoice No"
          bold
          value={
            <>
              {row.invoice_no}
              {row.depot ? <Text style={styles.depotChip}> {row.depot}</Text> : null}
            </>
          }
        />
        <Field label="Inv. Date" value={fd(row.invoice_date)} />
        <View style={[styles.field, styles.fieldWide]}>
          <Text style={styles.fieldLabel}>Customer</Text>
          <Text style={styles.fieldValue}>{(row.customer_name ?? '').slice(0, 28)}</Text>
          <Text style={styles.townText}>{row.town ?? ''}</Text>
        </View>
        <Field label="Cases" value={fmtCw(row.no_of_cases, row.gross_weight_kg)} bold />
        <Field label="Value" value={finr(row.invoice_value)} color="#d29922" bold />
        <Field label="Act. Delivery" value={fd(row.actual_delivery_date)} />
        <Field label="Receiving Date" value={fd(row.receiving_date)} color={colors.purple} bold />
        <View style={[styles.field, styles.fieldNarrow]}>
          <Text style={styles.fieldLabel}>Return Type</Text>
          <View style={styles.retPill}>
            <Text style={styles.retPillText}>↩ {retLbl}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {showPostDelBadge && (
          <View style={styles.postDelBadge}>
            <Text style={styles.postDelBadgeText}>📦 Return after deliver</Text>
          </View>
        )}
        <Text style={styles.footerText}>
          Credit Note: <Text style={styles.creditNoteText}>{creditNote}</Text>
        </Text>
        {retVal ? (
          <View style={styles.retValChip}>
            <Text style={styles.retValChipText}>
              Return Value: <Text style={styles.retValChipStrong}>{retVal}</Text>
            </Text>
          </View>
        ) : null}
        <Text style={styles.footerText}>
          SAP Entry: <Text style={styles.footerStrong}>{sapDateStr}</Text>
        </Text>
        {isPartial && pieces !== '—' && (
          <Text style={styles.footerText}>
            Pieces: <Text style={styles.footerStrong}>{pieces}</Text>
          </Text>
        )}
        {isPartial && material !== '—' && (
          <Text style={styles.footerText}>
            Material: <Text style={styles.footerStrong}>{material}</Text>
          </Text>
        )}
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
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: colors.purple,
    borderRadius: radius.md,
    padding: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
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
  townText: { fontSize: 9, color: colors.navy, fontWeight: '600', marginTop: 1 },
  depotChip: {
    backgroundColor: colors.navyLt,
    color: colors.navy,
    fontSize: 9,
    fontWeight: '700',
    borderRadius: 3,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  retPill: {
    backgroundColor: colors.purpleLt,
    borderWidth: 1,
    borderColor: colors.purpleBd,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  retPillText: { fontSize: 9, fontWeight: '700', color: colors.purpleDk },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.g100,
    paddingTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  footerText: { fontSize: 11, color: colors.gray },
  footerStrong: { fontWeight: '700', color: colors.g700 },
  creditNoteText: { fontWeight: '700', color: colors.purple },
  postDelBadge: {
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: colors.amberBd,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  postDelBadgeText: { fontSize: 9, fontWeight: '700', color: colors.amberDk },
  retValChip: {
    backgroundColor: '#FEFCE8',
    borderWidth: 1,
    borderColor: '#FDE047',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  retValChipText: { fontSize: 11, fontWeight: '600', color: '#713F12' },
  retValChipStrong: { color: colors.amberDk, fontWeight: '700' },
});
