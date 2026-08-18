import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '@/constants/theme';
import { fd, finr, toDate } from '@/lib/format';
import { eddVsTodayColor } from '@/lib/delay';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { DispatchDetail } from '@/types/models';
import { EmptyState } from '@/components/EmptyState';
import { KPICard } from '@/components/KPICard';
import { FilterRow, FilterSelect, SearchInput } from '@/components/FilterBar';
import { ActionButton } from '@/components/ActionButton';
import { StatusBadge } from '@/components/StatusBadge';
import { Pagination } from '@/components/Pagination';
import { DeliverModal } from '@/components/modals/DeliverModal';
import { DispatchCancelModal } from '@/components/modals/DispatchCancelModal';

/** Ported 1:1 from render_sap_dispatched() in dis_shared_components.py. */

const SORT_OPTIONS = [
  'Dispatch Date ↓',
  'Dispatch Date ↑',
  'EDD ↑ (urgent first)',
  'EDD ↓',
  'Invoice No',
  'Customer',
  'Value ↓',
] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

const PAGE_SIZE_OPTIONS = ['25', '50', '100'];

/** na_position="last" regardless of sort direction, matching pandas' sort_values(na_position="last"). */
function cmpDate(a: string | null | undefined, b: string | null | undefined, asc: boolean): number {
  const da = toDate(a);
  const db = toDate(b);
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  const diff = da.getTime() - db.getTime();
  return asc ? diff : -diff;
}

function sortRows(rows: DispatchDetail[], sort: SortOption): DispatchDetail[] {
  const arr = [...rows];
  switch (sort) {
    case 'Dispatch Date ↑':
      return arr.sort((a, b) => cmpDate(a.dispatch_date, b.dispatch_date, true));
    case 'EDD ↑ (urgent first)':
      return arr.sort((a, b) => cmpDate(a.edd, b.edd, true));
    case 'EDD ↓':
      return arr.sort((a, b) => cmpDate(a.edd, b.edd, false));
    case 'Invoice No':
      return arr.sort((a, b) => a.invoice_no.localeCompare(b.invoice_no));
    case 'Customer':
      return arr.sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''));
    case 'Value ↓':
      return arr.sort((a, b) => (b.invoice_value ?? 0) - (a.invoice_value ?? 0));
    case 'Dispatch Date ↓':
    default:
      return arr.sort((a, b) => cmpDate(a.dispatch_date, b.dispatch_date, false));
  }
}

function statusBadgeFor(status: string): { status: 'delivered' | 'returned' | 'cancelled' | 'inTransit'; label: string } {
  if (status === 'Completed') return { status: 'delivered', label: 'DELIVERED' };
  if (status === 'Returned') return { status: 'returned', label: 'RETURNED' };
  if (status === 'Cancelled') return { status: 'cancelled', label: 'CANCELLED' };
  return { status: 'inTransit', label: 'IN TRANSIT' };
}

function fmtCases(v: number | null | undefined): string {
  return v ? v.toFixed(0) : '—';
}

function fmtWeight(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(1);
}

function truncate(v: string | null | undefined, max: number, ellipsis: boolean): string {
  const s = v || '';
  if (!s) return '—';
  if (s.length > max) return ellipsis ? `${s.slice(0, max)}…` : s.slice(0, max);
  return s;
}

export default function DispatchedScreen() {
  const { session, readOnly } = useAuth();
  const { dispCache, errors, ensureDispatched } = useData();

  useEffect(() => {
    ensureDispatched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [search, setSearch] = useState('');
  const [depotFilter, setDepotFilter] = useState('All Depots');
  const [sort, setSort] = useState<SortOption>('Dispatch Date ↓');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string | null>(null);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [flash, setFlash] = useState<{ text: string; kind: 'success' | 'warning' } | null>(null);

  const rows = dispCache ?? [];

  const depotOptions = useMemo(() => {
    if (!readOnly) return ['All Depots'];
    const set = new Set<string>();
    (session?.depots ?? []).filter(Boolean).forEach((d) => set.add(d));
    rows.forEach((r) => {
      if (r.depot) set.add(r.depot);
    });
    return ['All Depots', ...Array.from(set).sort()];
  }, [readOnly, session, rows]);

  // Reset to page 1 whenever a filter/sort/page-size control changes.
  useEffect(() => {
    setPage(1);
  }, [search, sort, pageSize, depotFilter]);

  const filtered = useMemo(() => {
    let ds = rows;
    if (readOnly && depotFilter !== 'All Depots') {
      ds = ds.filter((r) => (r.depot || '') === depotFilter);
    }
    if (search.trim()) {
      const sl = search.trim().toLowerCase();
      ds = ds.filter(
        (r) =>
          r.invoice_no?.toLowerCase().includes(sl) ||
          r.customer_name?.toLowerCase().includes(sl) ||
          r.town?.toLowerCase().includes(sl) ||
          r.lr_no?.toLowerCase().includes(sl) ||
          r.transporter?.toLowerCase().includes(sl) ||
          r.vehicle_no?.toLowerCase().includes(sl)
      );
    }
    return sortRows(ds, sort);
  }, [rows, readOnly, depotFilter, search, sort]);

  const totalForDepot = useMemo(() => {
    if (!readOnly || depotFilter === 'All Depots') return rows.length;
    return rows.filter((r) => (r.depot || '') === depotFilter).length;
  }, [rows, readOnly, depotFilter]);

  const totalCases = filtered.reduce((sum, r) => sum + (Number(r.no_of_cases) || 0), 0);
  const totalGsv = filtered.reduce((sum, r) => sum + (Number(r.invoice_value) || 0), 0);

  const pageRows = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  // Selection is scoped to the current page, matching the original radio-rail
  // behavior where `_sel_key` is cleared whenever it falls off `_page_invs`.
  useEffect(() => {
    if (selectedInvoiceNo && !pageRows.some((r) => r.invoice_no === selectedInvoiceNo)) {
      setSelectedInvoiceNo(null);
    }
  }, [pageRows, selectedInvoiceNo]);

  const selectedRow = pageRows.find((r) => r.invoice_no === selectedInvoiceNo) ?? null;

  function closeDeliver() {
    setDeliverOpen(false);
    setSelectedInvoiceNo(null);
  }
  function closeCancel() {
    setCancelOpen(false);
    setSelectedInvoiceNo(null);
  }
  function handleDeliverDone(text: string, kind: 'success' | 'warning') {
    setFlash({ text, kind });
    closeDeliver();
  }
  function handleCancelDone(text: string, kind: 'success' | 'warning') {
    setFlash({ text, kind });
    closeCancel();
  }

  if (dispCache === null) {
    if (errors.disp) {
      return (
        <View style={styles.page}>
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errors.disp}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.page}>
        <EmptyState message="No dispatched invoices" icon="🚚" hint="Dispatch records from SAP will appear here" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {flash && (
        <Pressable
          style={[styles.flash, flash.kind === 'success' ? styles.flashSuccess : styles.flashWarning]}
          onPress={() => setFlash(null)}>
          <Text style={[styles.flashText, { color: flash.kind === 'success' ? colors.greenDk : colors.amberDk }]}>
            {flash.text}
          </Text>
        </Pressable>
      )}

      <FilterRow>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="🔍  Invoice · Customer · Town · LR No · Transporter · Vehicle No"
        />
        {readOnly && <FilterSelect value={depotFilter} options={depotOptions} onChange={setDepotFilter} minWidth={130} />}
        <FilterSelect value={sort} options={[...SORT_OPTIONS]} onChange={(v) => setSort(v as SortOption)} minWidth={150} />
        <FilterSelect value={String(pageSize)} options={PAGE_SIZE_OPTIONS} onChange={(v) => setPageSize(Number(v))} minWidth={70} />
      </FilterRow>

      <View style={styles.kpiRow}>
        <KPICard icon="🚚" label="Dispatched" value={`${filtered.length}/${totalForDepot}`} color={colors.teal} />
        <KPICard icon="📦" label="Total Cases" value={totalCases.toFixed(0)} color={colors.navy} />
        <KPICard icon="💰" label="GSV" value={finr(totalGsv)} color={colors.amber} />
      </View>

      <View style={styles.actionBar}>
        <Text style={styles.actionBarLabel}>{selectedInvoiceNo ? 'Selected' : 'Actions'}</Text>
        {selectedInvoiceNo ? (
          <View style={styles.actionChip}>
            <Text style={styles.actionChipText}>📄 {selectedInvoiceNo}</Text>
          </View>
        ) : (
          <Text style={styles.actionHint}>Select an invoice to act on it</Text>
        )}
        <View style={styles.actionButtons}>
          <ActionButton label="✓ Deliver" recipe="deliver" disabled={!selectedRow} onPress={() => setDeliverOpen(true)} />
          <ActionButton label="✕ Cancel" recipe="cancel" disabled={!selectedRow} onPress={() => setCancelOpen(true)} />
        </View>
      </View>

      <View style={styles.list}>
        {pageRows.map((row) => {
          const isSelected = row.invoice_no === selectedInvoiceNo;
          const badge = statusBadgeFor(row.status);
          const eddColor = eddVsTodayColor(row.edd, 'green-future');
          return (
            <Pressable
              key={row.invoice_no}
              style={[styles.card, shadow.sm, isSelected && styles.cardSelected]}
              onPress={() => setSelectedInvoiceNo(isSelected ? null : row.invoice_no)}>
              <View style={styles.cardHeader}>
                <Text style={styles.invoiceNo} numberOfLines={1}>
                  {row.invoice_no}
                </Text>
                <StatusBadge status={badge.status} label={badge.label} />
              </View>

              <View style={styles.grid}>
                <Info label="Depot" value={row.depot || '—'} chip />
                <Info label="Customer" value={truncate(row.customer_name, 23, false)} />
                <Info label="Town" value={row.town || '—'} />
                <Info label="Cases" value={fmtCases(row.no_of_cases)} />
                <Info label="Gross WT" value={fmtWeight(row.gross_weight_kg)} />
                <Info label="Value ₹" value={finr(row.invoice_value)} valueColor={colors.amber} bold />
                <Info label="EDD" value={fd(row.edd)} valueColor={eddColor} bold />
                <Info label="LR No" value={row.lr_no || '—'} />
                <Info label="Dispatch Date" value={fd(row.dispatch_date)} />
                <Info label="Transporter" value={truncate(row.transporter, 21, true)} />
                <Info label="Vehicle No" value={row.vehicle_no || '—'} />
                <Info label="Vehicle Type" value={row.vehicle_type || '—'} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pagination variant="full" showJump={false} page={page} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} />

      {selectedRow && deliverOpen && (
        <DeliverModal visible={deliverOpen} row={selectedRow} onClose={closeDeliver} onDone={handleDeliverDone} />
      )}
      {selectedRow && cancelOpen && (
        <DispatchCancelModal visible={cancelOpen} row={selectedRow} onClose={closeCancel} onDone={handleCancelDone} />
      )}
    </ScrollView>
  );
}

function Info({
  label,
  value,
  valueColor,
  bold,
  chip,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
  chip?: boolean;
}) {
  return (
    <View style={styles.infoField}>
      <Text style={styles.infoLabel}>{label}</Text>
      {chip ? (
        <View style={styles.depotChip}>
          <Text style={styles.depotChipText} numberOfLines={1}>
            {value}
          </Text>
        </View>
      ) : (
        <Text
          style={[styles.infoValue, valueColor ? { color: valueColor } : null, bold && styles.infoValueBold]}
          numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
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
  flash: { borderRadius: radius.sm, borderWidth: 1.5, padding: 10, marginBottom: 8 },
  flashSuccess: { backgroundColor: colors.greenLt, borderColor: colors.greenBd },
  flashWarning: { backgroundColor: colors.amberLt, borderColor: colors.amberBd },
  flashText: { fontSize: 12, fontWeight: '700' },
  kpiRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  actionBarLabel: { fontSize: 9, fontWeight: '700', color: colors.g400, textTransform: 'uppercase', letterSpacing: 0.5 },
  actionChip: {
    backgroundColor: colors.blueLt,
    borderWidth: 1,
    borderColor: colors.blueBd,
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  actionChipText: { fontSize: 11, fontWeight: '700', color: colors.blueDeep },
  actionHint: { fontSize: 11, color: colors.g400, fontStyle: 'italic' },
  actionButtons: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  list: { gap: 8 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
    padding: 10,
  },
  cardSelected: { backgroundColor: colors.dispatchedRowHighlight },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  invoiceNo: { fontSize: 13.5, fontWeight: '800', color: colors.blueDeep, flexShrink: 1, marginRight: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoField: { flexBasis: '46%', flexGrow: 1 },
  infoLabel: { fontSize: 8.5, fontWeight: '700', color: colors.g400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 11.5, color: colors.g700, fontWeight: '500' },
  infoValueBold: { fontWeight: '800' },
  depotChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.navyLt,
    borderWidth: 1,
    borderColor: colors.navyBd,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  depotChipText: { fontSize: 10, fontWeight: '700', color: colors.navy },
});
