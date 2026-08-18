import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { EmptyState } from '@/components/EmptyState';
import { FilterRow, FilterSelect, SearchInput } from '@/components/FilterBar';
import { DateField } from '@/components/Form';
import { KPICard } from '@/components/KPICard';
import { PodRecord, PodViewModal } from '@/components/modals/PodViewModal';
import { ReturnModal } from '@/components/modals/ReturnModal';
import { Pagination } from '@/components/Pagination';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { canonicalDelayColor, canonicalDelayLabel, eddVsActualColor, isOnTimeExact } from '@/lib/delay';
import { fd, finr, fmtCw, toDate, todayDate } from '@/lib/format';
import { CompletedInvoice } from '@/types/models';

/**
 * Ported 1:1 from render_completed() in dis_shared_components.py.
 *
 * KNOWN GAP (matches the original, not a bug to fix here): POD upload is
 * dead code in the Streamlit app — the uploader is disabled and
 * load_pod_store() never actually populates pod_store from anywhere
 * upstream — so pod_store is always effectively empty in practice. This
 * constant mirrors that: it is always empty, and the "👁 POD" action is
 * gated on it, exactly like the original. PodViewModal itself is still
 * built fully and correctly so the plumbing is ready once a real POD data
 * source exists.
 */
const podStore: Record<string, PodRecord> = {};

type SortField = 'invoice_date' | 'actual_delivery_date' | 'invoice_value' | 'total_delay' | 'town';

const PERIODS = ['All Time', 'Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Custom'];
const SORT_FIELDS: { key: SortField; label: string }[] = [
  { key: 'invoice_date', label: '📅 Invoice Date' },
  { key: 'actual_delivery_date', label: '📅 Delivery Date' },
  { key: 'invoice_value', label: '💰 Value' },
  { key: 'total_delay', label: '⏱ Delay' },
  { key: 'town', label: '📍 Town' },
];
const PAGE_SIZE = 7;

export default function CompletedScreen() {
  const { session, readOnly } = useAuth();
  const { compCache, pendCache, dispCache, retCache, cancCache, loading, errors, ensureCompleted, invalidate } =
    useData();

  useEffect(() => {
    ensureCompleted();
  }, [ensureCompleted]);

  const [search, setSearch] = useState('');
  const [filterDepot, setFilterDepot] = useState('All Depots');
  const [period, setPeriod] = useState('All Time');
  const [customFrom, setCustomFrom] = useState<Date>(() => {
    const d = todayDate();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [customTo, setCustomTo] = useState<Date>(() => todayDate());
  const [transporterFilter, setTransporterFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('invoice_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const [returnTarget, setReturnTarget] = useState<CompletedInvoice | null>(null);
  const [podTarget, setPodTarget] = useState<{ invoiceNo: string; pod: PodRecord } | null>(null);
  const [flash, setFlash] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  const allRows = compCache ?? [];

  const depotOptions = useMemo(() => {
    if (!readOnly) return ['All Depots'];
    const sessDeps = (session?.depots ?? []).filter(Boolean);
    const dataDeps = allRows.map((r) => r.depot).filter((d): d is string => !!d);
    const merged = Array.from(new Set([...sessDeps, ...dataDeps])).sort();
    return merged.length ? ['All Depots', ...merged] : ['All Depots'];
  }, [readOnly, session?.depots, allRows]);

  const transporterOptions = useMemo(() => {
    const t = Array.from(new Set(allRows.map((r) => r.transporter).filter((v): v is string => !!v))).sort();
    return ['All', ...t];
  }, [allRows]);

  useEffect(() => {
    setPage(1);
  }, [search, filterDepot, period, customFrom, customTo, transporterFilter]);

  const filteredSorted = useMemo(() => {
    let rows = allRows.slice();
    if (readOnly && filterDepot !== 'All Depots') {
      rows = rows.filter((r) => (r.depot ?? '') === filterDepot);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          String(r.invoice_no ?? '').toLowerCase().includes(q) ||
          String(r.customer_name ?? '').toLowerCase().includes(q) ||
          String(r.town ?? '').toLowerCase().includes(q) ||
          String(r.transporter ?? '').toLowerCase().includes(q) ||
          // lr_no isn't part of the completed-invoice schema upstream (see
          // sap/invoices_comp.py) — this mirrors the original's defensive
          // `.get("lr_no", "")` fallback, so it's a no-op today by design.
          String((r as unknown as Record<string, unknown>).lr_no ?? '').toLowerCase().includes(q)
      );
    }
    rows = applyPeriod(rows, period, customFrom, customTo);
    if (transporterFilter !== 'All') rows = rows.filter((r) => r.transporter === transporterFilter);

    return rows.slice().sort((a, b) => {
      const av = sortValue(a, sortField);
      const bv = sortValue(b, sortField);
      if (av === null && bv === null) return 0;
      if (av === null) return 1; // na_position="last"
      if (bv === null) return -1;
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [allRows, readOnly, filterDepot, search, period, customFrom, customTo, transporterFilter, sortField, sortAsc]);

  const totalForDepot = useMemo(() => {
    const depot = readOnly ? filterDepot : 'All Depots';
    const count = (rows: { depot?: string }[] | null) => {
      if (!rows) return 0;
      if (depot === 'All Depots') return rows.length;
      return rows.filter((r) => (r.depot ?? '') === depot).length;
    };
    return count(pendCache) + count(dispCache) + count(compCache) + count(retCache) + count(cancCache);
  }, [readOnly, filterDepot, pendCache, dispCache, compCache, retCache, cancCache]);

  if (!allRows.length) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        {loading.comp ? <Text style={styles.loadingText}>Loading completed invoices…</Text> : null}
        {errors.comp ? <Text style={styles.errorText}>{errors.comp}</Text> : null}
        <EmptyState message="No completed invoices yet" icon="✅" />
      </ScrollView>
    );
  }

  const gsv = filteredSorted.reduce((s, r) => s + (Number(r.invoice_value) || 0), 0);
  const totalCases = filteredSorted.reduce((s, r) => s + (Number(r.no_of_cases) || 0), 0);
  const onTimeCount = filteredSorted.filter((r) => isOnTimeExact(Number(r.total_delay) || 0)).length;
  const avgDelay = filteredSorted.length
    ? filteredSorted.reduce((s, r) => s + (Number(r.total_delay) || 0), 0) / filteredSorted.length
    : 0;
  const onTimePct = (onTimeCount / Math.max(filteredSorted.length, 1)) * 100;

  const pageRows = filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const currentSortLabel = SORT_FIELDS.find((s) => s.key === sortField)?.label ?? sortField;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {flash ? (
        <Pressable
          style={[styles.flash, flash.type === 'success' ? styles.flashSuccess : styles.flashWarning]}
          onPress={() => setFlash(null)}>
          <Text
            style={[
              styles.flashText,
              { color: flash.type === 'success' ? colors.greenDk : colors.amberDk },
            ]}>
            {flash.text}
          </Text>
        </Pressable>
      ) : null}

      <FilterRow>
        <SearchInput value={search} onChangeText={setSearch} placeholder="🔍  Invoice · Customer · Town · LR" />
        {readOnly && (
          <FilterSelect value={filterDepot} options={depotOptions} onChange={setFilterDepot} minWidth={120} />
        )}
        <FilterSelect value={period} options={PERIODS} onChange={setPeriod} minWidth={130} />
        <FilterSelect
          value={transporterFilter}
          options={transporterOptions}
          onChange={setTransporterFilter}
          minWidth={130}
        />
      </FilterRow>

      <FilterRow>
        <FilterSelect
          value={currentSortLabel}
          options={SORT_FIELDS.map((s) => s.label)}
          onChange={(label) => {
            const found = SORT_FIELDS.find((s) => s.label === label);
            if (found) setSortField(found.key);
          }}
          minWidth={160}
        />
        <Pressable style={styles.ascToggle} onPress={() => setSortAsc((a) => !a)}>
          <View style={[styles.checkbox, sortAsc && styles.checkboxOn]}>
            {sortAsc ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.ascLabel}>↑ Asc</Text>
        </Pressable>
      </FilterRow>

      {period === 'Custom' && (
        <View style={styles.customRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>From</Text>
            <DateField value={customFrom} onChange={setCustomFrom} maximumDate={todayDate()} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>To</Text>
            <DateField value={customTo} onChange={setCustomTo} maximumDate={todayDate()} />
          </View>
        </View>
      )}

      <View style={styles.kpiRow}>
        <KPICard icon="✅" label="Completed" value={`${filteredSorted.length}/${totalForDepot}`} color={colors.green} />
        <KPICard icon="📦" label="Total Cases" value={totalCases.toFixed(0)} color={colors.teal} />
        <KPICard icon="💰" label="GSV" value={finr(gsv)} color={colors.amber} />
        <KPICard
          icon="🎯"
          label="On-Time"
          value={`${onTimePct.toFixed(0)}%`}
          color={colors.navy}
          sub={`Avg delay ${avgDelay.toFixed(1)}d`}
        />
      </View>

      {filteredSorted.length === 0 ? (
        <EmptyState message="No invoices match filters" icon="🔍" />
      ) : (
        <>
          <Pagination page={page} totalItems={filteredSorted.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          {pageRows.map((row) => (
            <InvoiceCard
              key={row.invoice_no}
              row={row}
              readOnly={readOnly}
              hasPod={!!podStore[row.invoice_no]}
              onViewPod={() => {
                const pod = podStore[row.invoice_no];
                if (pod) setPodTarget({ invoiceNo: row.invoice_no, pod });
              }}
              onReturn={() => setReturnTarget(row)}
            />
          ))}
        </>
      )}

      <ReturnModal
        visible={!!returnTarget}
        invoice={returnTarget}
        onClose={() => setReturnTarget(null)}
        onDone={(text, type) => setFlash({ text, type })}
      />
      <PodViewModal
        visible={!!podTarget}
        invoiceNo={podTarget?.invoiceNo ?? ''}
        pod={podTarget?.pod ?? null}
        onClose={() => setPodTarget(null)}
      />
    </ScrollView>
  );
}

function applyPeriod(rows: CompletedInvoice[], period: string, from: Date, to: Date): CompletedInvoice[] {
  if (period === 'All Time') return rows;
  const today = todayDate();
  if (period === 'Custom') {
    return rows.filter((r) => {
      const d = toDate(r.invoice_date);
      return !!d && d >= from && d <= to;
    });
  }
  let cut: Date | null = null;
  if (period === 'Today') cut = today;
  else if (period === 'Last 7 Days') {
    cut = new Date(today);
    cut.setDate(cut.getDate() - 7);
  } else if (period === 'Last 30 Days') {
    cut = new Date(today);
    cut.setDate(cut.getDate() - 30);
  } else if (period === 'This Month') {
    cut = new Date(today.getFullYear(), today.getMonth(), 1);
  }
  if (!cut) return rows;
  const cutoff = cut;
  return rows.filter((r) => {
    const d = toDate(r.invoice_date);
    return !!d && d >= cutoff;
  });
}

function sortValue(row: CompletedInvoice, field: SortField): number | string | null {
  switch (field) {
    case 'invoice_date':
    case 'actual_delivery_date': {
      const d = toDate(row[field]);
      return d ? d.getTime() : null;
    }
    case 'invoice_value':
    case 'total_delay': {
      const v = row[field];
      const n = Number(v);
      return v === null || v === undefined || Number.isNaN(n) ? null : n;
    }
    case 'town':
      return row.town ? String(row.town).toLowerCase() : null;
    default:
      return null;
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function InvoiceCard({
  row,
  readOnly,
  hasPod,
  onViewPod,
  onReturn,
}: {
  row: CompletedInvoice;
  readOnly: boolean;
  hasPod: boolean;
  onViewPod: () => void;
  onReturn: () => void;
}) {
  const eddColor = eddVsActualColor(row.edd, row.actual_delivery_date);
  const eddText = row.edd ? fd(row.edd) : '—';
  const totalDelay = Number(row.total_delay) || 0;
  const delayColor = canonicalDelayColor(totalDelay);
  const delayLabel = canonicalDelayLabel(totalDelay);

  const body = (
    <View style={styles.card}>
      <View style={styles.grid}>
        <Field label="Invoice No">
          <View style={styles.invoiceNoRow}>
            <Text style={styles.invoiceNo}>{row.invoice_no}</Text>
            {row.depot ? (
              <View style={styles.depotChip}>
                <Text style={styles.depotChipText}>{row.depot}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.subline}>Inv: {fd(row.invoice_date)}</Text>
        </Field>

        <Field label="Customer">
          <Text style={styles.customer} numberOfLines={1}>
            {row.customer_name || '—'}
          </Text>
          <Text style={styles.town} numberOfLines={1}>
            {row.town || ''}
          </Text>
        </Field>

        <Field label="Dispatch">
          <Text style={[styles.fieldValue, { color: colors.blueDk, fontWeight: '600' }]}>{fd(row.dispatch_date)}</Text>
        </Field>

        <Field label="Delivered">
          <Text style={[styles.fieldValue, { color: colors.g700 }]}>{fd(row.actual_delivery_date)}</Text>
        </Field>

        <Field label="EDD">
          <Text style={[styles.fieldValue, { color: eddColor, fontWeight: '700' }]}>{eddText}</Text>
        </Field>

        <Field label="Value / Cases">
          <Text style={[styles.fieldValue, { color: colors.valueAmber, fontWeight: '700' }]}>
            {finr(row.invoice_value)}
          </Text>
          <Text style={styles.subline}>{fmtCw(row.no_of_cases, row.gross_weight_kg)}</Text>
        </Field>

        <Field label="Transporter">
          <Text style={[styles.fieldValue, { color: colors.navy, fontWeight: '600' }]} numberOfLines={1}>
            {row.transporter || '—'}
          </Text>
        </Field>

        <Field label="Delay">
          <Text style={{ fontSize: 11, fontWeight: '700', color: delayColor }}>{delayLabel}</Text>
        </Field>
      </View>
    </View>
  );

  if (readOnly) return body;

  return (
    <View style={styles.cardRow}>
      <View style={{ flex: 1 }}>{body}</View>
      <View style={styles.actionCol}>
        {hasPod ? <ActionButton label="👁 POD" recipe="viewPod" onPress={onViewPod} fullWidth /> : null}
        <ActionButton label="↩ Return" recipe="return" onPress={onReturn} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, paddingBottom: 40, backgroundColor: colors.bg, flexGrow: 1 },
  loadingText: { fontSize: 11, color: colors.g500, marginBottom: 8 },
  errorText: { fontSize: 11, color: colors.redDk, marginBottom: 8 },
  flash: { borderRadius: radius.sm, borderWidth: 1.5, padding: 10, marginBottom: 10 },
  flashSuccess: { backgroundColor: colors.greenLt, borderColor: colors.greenBd },
  flashWarning: { backgroundColor: colors.amberLt, borderColor: colors.amberBd },
  flashText: { fontSize: 12, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  customRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dateLabel: { fontSize: 10, fontWeight: '700', color: colors.g500, marginBottom: 4, textTransform: 'uppercase' },
  ascToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 4 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.g300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  ascLabel: { fontSize: 12, fontWeight: '600', color: colors.g700 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: colors.green,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  field: { width: '50%', paddingRight: 8, marginBottom: 10 },
  fieldLabel: { fontSize: 9, color: colors.g500, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  fieldValue: { fontSize: 12 },
  subline: { fontSize: 9, color: colors.g500, marginTop: 2 },
  invoiceNoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  invoiceNo: { fontSize: 13, fontWeight: '800', color: colors.g900 },
  depotChip: { backgroundColor: colors.navyLt, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 1 },
  depotChipText: { fontSize: 9, fontWeight: '700', color: colors.navy },
  customer: { fontSize: 12, fontWeight: '600', color: colors.g900 },
  town: { fontSize: 9, fontWeight: '600', color: colors.navy, marginTop: 2 },
  cardRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  actionCol: { width: 92, gap: 6, justifyContent: 'flex-start', paddingTop: 4 },
});
