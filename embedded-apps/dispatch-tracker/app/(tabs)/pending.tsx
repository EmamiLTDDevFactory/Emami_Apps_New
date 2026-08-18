import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { PendingInvoice } from '@/types/models';
import { fd, finr, fmtCw, sfloat, toDate } from '@/lib/format';
import { eddVsTodayColor } from '@/lib/delay';
import { KPICard } from '@/components/KPICard';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { ActionButton } from '@/components/ActionButton';
import { FilterRow, FilterSelect, SearchInput } from '@/components/FilterBar';
import { DispatchModal } from '@/components/modals/DispatchModal';
import { PendingCancelModal } from '@/components/modals/PendingCancelModal';

const PAGE_SIZE = 7;
const GROUP_OPTIONS = ['None', 'Town', 'Customer Name', 'Route Code'];
const GROUP_FIELD: Record<string, keyof PendingInvoice> = {
  Town: 'town',
  'Customer Name': 'customer_name',
  'Route Code': 'route_code',
};

/** Ported 1:1 from render_pending() in streamlit_app/dis_shared_components.py. */
export default function PendingScreen() {
  const { readOnly } = useAuth();
  const { pendCache, loading, errors, ensurePending } = useData();

  useEffect(() => {
    ensurePending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [search, setSearch] = useState('');
  const [depotFilter, setDepotFilter] = useState('All Depots');
  const [townFilter, setTownFilter] = useState('All Towns');
  const [groupBy, setGroupBy] = useState('None');
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dispatchRow, setDispatchRow] = useState<PendingInvoice | null>(null);
  const [cancelRow, setCancelRow] = useState<PendingInvoice | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, depotFilter, townFilter, groupBy]);

  const sorted = useMemo(() => {
    if (!pendCache) return [];
    return [...pendCache].sort((a, b) => {
      const da = toDate(a.invoice_date);
      const db = toDate(b.invoice_date);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.getTime() - da.getTime();
    });
  }, [pendCache]);

  const depotOptions = useMemo(() => {
    const set = new Set<string>();
    sorted.forEach((r) => {
      if (r.depot) set.add(r.depot);
    });
    return ['All Depots', ...Array.from(set).sort()];
  }, [sorted]);

  const townOptions = useMemo(() => {
    const set = new Set<string>();
    sorted.forEach((r) => {
      if (r.town) set.add(r.town);
    });
    return ['All Towns', ...Array.from(set).sort()];
  }, [sorted]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((r) => {
      if (q) {
        const hay = [r.invoice_no, r.customer_id, r.customer_name, r.town, r.route_code]
          .map((v) => String(v ?? '').toLowerCase())
          .join(' | ');
        if (!hay.includes(q)) return false;
      }
      if (readOnly && depotFilter !== 'All Depots' && (r.depot ?? '') !== depotFilter) return false;
      if (townFilter !== 'All Towns' && (r.town ?? '') !== townFilter) return false;
      return true;
    });
  }, [sorted, search, depotFilter, townFilter, readOnly]);

  const gsv = filtered.reduce((s, r) => s + (sfloat(r.invoice_value) ?? 0), 0);
  const cases = filtered.reduce((s, r) => s + (sfloat(r.no_of_cases) ?? 0), 0);
  const towns = new Set(filtered.map((r) => r.town).filter(Boolean)).size;

  function toggleExpanded(invoiceNo: string) {
    setExpanded((s) => ({ ...s, [invoiceNo]: !s[invoiceNo] }));
  }

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 4000);
  }

  if (!pendCache && loading.pend) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.navy} />
        <Text style={styles.loadingText}>Fetching pending invoices…</Text>
      </View>
    );
  }

  if (errors.pend && !pendCache) {
    return (
      <View style={styles.screen}>
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errors.pend}</Text>
        </View>
      </View>
    );
  }

  if (!pendCache || pendCache.length === 0) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
        <EmptyState message="No pending invoices" icon="✅" hint="All invoices have been dispatched or completed" />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <SectionHeader title="Pending Invoices" subtitle={`${sorted.length} total`} />

      {flash ? (
        <View style={styles.flash}>
          <Text style={styles.flashText}>{flash}</Text>
        </View>
      ) : null}

      <FilterRow>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Invoice · Customer · Town · Route Code · Customer Code"
        />
        {readOnly ? <FilterSelect value={depotFilter} options={depotOptions} onChange={setDepotFilter} minWidth={120} /> : null}
        <FilterSelect value={townFilter} options={townOptions} onChange={setTownFilter} minWidth={120} />
        <FilterSelect value={groupBy} options={GROUP_OPTIONS} onChange={setGroupBy} minWidth={120} />
        <Pressable style={[styles.toggle, showAll && styles.toggleActive]} onPress={() => setShowAll((s) => !s)}>
          <Text style={[styles.toggleText, showAll && styles.toggleTextActive]}>Show All</Text>
        </Pressable>
      </FilterRow>

      <View style={styles.kpiRow}>
        <KPICard icon="⏳" label="Pending" value={`${filtered.length}/${sorted.length}`} color={colors.amber} />
        <KPICard icon="📦" label="Total Cases" value={cases.toFixed(0)} color={colors.teal} />
      </View>
      <View style={styles.kpiRow}>
        <KPICard icon="💰" label="GSV" value={finr(gsv)} color={colors.amber} />
        <KPICard icon="📍" label="Towns" value={String(towns)} color={colors.navy} />
      </View>

      {filtered.length === 0 ? (
        <EmptyState message="No invoices match" icon="🔍" />
      ) : groupBy === 'None' ? (
        <UngroupedList
          rows={filtered}
          showAll={showAll}
          page={page}
          onPageChange={setPage}
          readOnly={readOnly}
          expanded={expanded}
          onToggleExpanded={toggleExpanded}
          onDispatch={setDispatchRow}
          onCancel={setCancelRow}
        />
      ) : (
        <GroupedList
          rows={filtered}
          groupBy={groupBy}
          readOnly={readOnly}
          expanded={expanded}
          onToggleExpanded={toggleExpanded}
          onDispatch={setDispatchRow}
          onCancel={setCancelRow}
        />
      )}

      {dispatchRow ? (
        <DispatchModal
          visible
          row={dispatchRow}
          onClose={() => setDispatchRow(null)}
          onSuccess={showFlash}
        />
      ) : null}
      {cancelRow ? (
        <PendingCancelModal
          visible
          row={cancelRow}
          onClose={() => setCancelRow(null)}
          onSuccess={showFlash}
        />
      ) : null}
    </ScrollView>
  );
}

function UngroupedList({
  rows,
  showAll,
  page,
  onPageChange,
  readOnly,
  expanded,
  onToggleExpanded,
  onDispatch,
  onCancel,
}: {
  rows: PendingInvoice[];
  showAll: boolean;
  page: number;
  onPageChange: (p: number) => void;
  readOnly: boolean;
  expanded: Record<string, boolean>;
  onToggleExpanded: (invoiceNo: string) => void;
  onDispatch: (row: PendingInvoice) => void;
  onCancel: (row: PendingInvoice) => void;
}) {
  const pageRows = showAll ? rows : rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <View>
      {pageRows.map((row) => (
        <PendingRowCard
          key={row.invoice_no}
          row={row}
          readOnly={readOnly}
          expanded={!!expanded[row.invoice_no]}
          onToggleExpanded={() => onToggleExpanded(row.invoice_no)}
          onDispatch={() => onDispatch(row)}
          onCancel={() => onCancel(row)}
        />
      ))}
      {!showAll ? <Pagination page={page} totalItems={rows.length} pageSize={PAGE_SIZE} onPageChange={onPageChange} /> : null}
    </View>
  );
}

function GroupedList({
  rows,
  groupBy,
  readOnly,
  expanded,
  onToggleExpanded,
  onDispatch,
  onCancel,
}: {
  rows: PendingInvoice[];
  groupBy: string;
  readOnly: boolean;
  expanded: Record<string, boolean>;
  onToggleExpanded: (invoiceNo: string) => void;
  onDispatch: (row: PendingInvoice) => void;
  onCancel: (row: PendingInvoice) => void;
}) {
  const field = GROUP_FIELD[groupBy] ?? 'town';
  const groups = useMemo(() => {
    const map = new Map<string, PendingInvoice[]>();
    rows.forEach((r) => {
      const val = String(r[field] ?? '').trim() || 'Unknown';
      if (!map.has(val)) map.set(val, []);
      map.get(val)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, field]);

  return (
    <View>
      {groups.map(([gval, grows]) => (
        <View key={gval}>
          <View style={styles.groupBanner}>
            <Text style={styles.groupBannerText}>{gval}</Text>
            <View style={styles.groupBannerPill}>
              <Text style={styles.groupBannerPillText}>{grows.length}</Text>
            </View>
          </View>
          {grows.map((row) => (
            <PendingRowCard
              key={row.invoice_no}
              row={row}
              readOnly={readOnly}
              expanded={!!expanded[row.invoice_no]}
              onToggleExpanded={() => onToggleExpanded(row.invoice_no)}
              onDispatch={() => onDispatch(row)}
              onCancel={() => onCancel(row)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function eddStyle(edd: unknown) {
  const missing = !toDate(edd);
  return { color: eddVsTodayColor(edd, 'navy-future'), fontWeight: missing ? ('400' as const) : ('700' as const) };
}

function HeaderField({ label, children, style }: { label: string; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.headerField, style]}>
      <Text style={styles.headerFieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function PendingRowCard({
  row,
  readOnly,
  expanded,
  onToggleExpanded,
  onDispatch,
  onCancel,
}: {
  row: PendingInvoice;
  readOnly: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onDispatch: () => void;
  onCancel: () => void;
}) {
  const distance = sfloat(row.distance_km);
  const detailRows: [string, string][] = [
    ['Customer ID', row.customer_id || '—'],
    ['Channel', row.channel || '—'],
    ['Division', row.division || '—'],
    ['Cases / Weight', fmtCw(row.no_of_cases, row.gross_weight_kg)],
    ['Order Date', fd(row.order_receiving_date)],
    ['Payment Date', fd(row.payment_receiving_date)],
    ['Distance', distance ? `${distance.toFixed(0)} km` : '—'],
    ['Route Code', row.route_code || '—'],
  ];

  return (
    <View style={[styles.card, shadow.sm]}>
      <View style={styles.cardHeader}>
        <HeaderField label="Invoice No" style={{ flexGrow: 2, minWidth: 140 }}>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceNo}>{row.invoice_no}</Text>
            {row.depot ? (
              <View style={styles.depotChip}>
                <Text style={styles.depotChipText}>{row.depot}</Text>
              </View>
            ) : null}
          </View>
        </HeaderField>
        <HeaderField label="Invoice Date">
          <Text style={styles.fieldValue}>{fd(row.invoice_date)}</Text>
        </HeaderField>
        <HeaderField label="Value">
          <Text style={styles.valueText}>{finr(row.invoice_value)}</Text>
        </HeaderField>
        <HeaderField label="Customer" style={{ flexGrow: 2, minWidth: 120 }}>
          <Text style={styles.fieldValueDark}>{(row.customer_name || '—').slice(0, 26)}</Text>
        </HeaderField>
        <HeaderField label="Town">
          <Text style={styles.townText}>{row.town || '—'}</Text>
        </HeaderField>
        <HeaderField label="EDD">
          <Text style={[styles.fieldValue, eddStyle(row.edd)]}>{fd(row.edd)}</Text>
        </HeaderField>
      </View>

      <Pressable style={styles.detailsToggle} onPress={onToggleExpanded}>
        <Text style={styles.detailsToggleText}>{expanded ? '▴ Details' : '▾ Details'}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.detailTable}>
          {detailRows.map(([label, value], i) => (
            <View key={label} style={[styles.detailRow, { backgroundColor: i % 2 === 0 ? colors.surface : '#F8FAFF' }]}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {!readOnly ? (
        <View style={styles.actionsRow}>
          <ActionButton label="🚚 Dispatch" recipe="dispatch" onPress={onDispatch} fullWidth />
          <ActionButton label="✕ Cancel" recipe="cancelPending" onPress={onCancel} fullWidth />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: 12, paddingBottom: 32 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.bg },
  loadingText: { fontSize: 12, color: colors.g500 },
  errorBanner: {
    backgroundColor: colors.redLt,
    borderWidth: 1.5,
    borderColor: colors.redBd,
    borderLeftWidth: 3,
    borderLeftColor: colors.red,
    borderRadius: radius.sm,
    padding: 12,
    margin: 12,
  },
  errorBannerText: { color: colors.redDk, fontWeight: '600', fontSize: 12 },
  flash: {
    backgroundColor: colors.greenLt,
    borderWidth: 1,
    borderColor: colors.greenBd,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 8,
  },
  flashText: { color: colors.greenDk, fontSize: 12, fontWeight: '600' },
  toggle: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.g200,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  toggleText: { fontSize: 12, fontWeight: '600', color: colors.g500 },
  toggleTextActive: { color: '#fff' },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  groupBanner: {
    backgroundColor: colors.navyLt,
    borderWidth: 1,
    borderColor: colors.navyBd,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupBannerText: { fontSize: 12, fontWeight: '800', color: colors.navy },
  groupBannerPill: { backgroundColor: colors.navy, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  groupBannerPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#F8FAFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E7EC',
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerField: { minWidth: 80, gap: 2 },
  headerFieldLabel: { fontSize: 9, color: colors.g500, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  invoiceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  invoiceNo: { fontSize: 13, fontWeight: '800', color: colors.g900 },
  depotChip: { backgroundColor: colors.navyLt, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 1 },
  depotChipText: { fontSize: 9, fontWeight: '700', color: colors.navy },
  fieldValue: { fontSize: 12, fontWeight: '600', color: colors.g700 },
  fieldValueDark: { fontSize: 12, fontWeight: '600', color: colors.nearBlack },
  valueText: { fontSize: 13, fontWeight: '700', color: colors.amber },
  townText: { fontSize: 12, fontWeight: '700', color: colors.navy },
  detailsToggle: { paddingHorizontal: 12, paddingVertical: 8 },
  detailsToggleText: { fontSize: 11, fontWeight: '700', color: colors.g500 },
  detailTable: { borderWidth: 1, borderColor: colors.g200, borderRadius: radius.sm, marginHorizontal: 12, marginBottom: 10, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.g100 },
  detailLabel: { flex: 0.45, fontSize: 10, fontWeight: '700', color: colors.g500, textTransform: 'uppercase', letterSpacing: 0.4 },
  detailValue: { flex: 0.55, fontSize: 11, color: colors.nearBlack },
  actionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2 },
});
