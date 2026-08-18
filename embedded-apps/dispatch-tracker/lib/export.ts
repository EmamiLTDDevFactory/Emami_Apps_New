/**
 * Ported 1:1 from render_reports()'s Excel export in dis_shared_components.py
 * §7.6 — same per-type column sets, the same header rename map, and the same
 * returned/cancelled special-cased columns. openpyxl -> xlsx (SheetJS);
 * st.download_button -> write to cache dir + expo-sharing share sheet.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { Platform } from 'react-native';
import { AnyInvoiceRow } from '@/types/models';
import { fd, toDate } from '@/lib/format';

export type ReportType = 'all' | 'pending' | 'dispatched' | 'completed' | 'returned' | 'cancelled';

const COLUMN_SETS: Record<ReportType, string[]> = {
  pending: [
    'invoice_no', 'depot', 'customer_name', 'town', 'invoice_date', 'order_receiving_date',
    'payment_receiving_date', '_edd', 'invoice_value', 'no_of_cases', 'gross_weight_kg',
    'division', 'distance_km', 'status',
  ],
  dispatched: [
    'invoice_no', 'depot', 'customer_name', 'town', 'division', 'distance_km', 'invoice_date',
    'dispatch_date', '_edd', 'invoice_value', 'no_of_cases', 'gross_weight_kg', 'lr_no',
    'transporter', 'vehicle_no', 'vehicle_type', 'status',
  ],
  completed: [
    'invoice_no', 'depot', 'customer_name', 'town', 'division', 'distance_km', 'invoice_date',
    'dispatch_date', 'actual_delivery_date', '_edd', 'invoice_value', 'no_of_cases',
    'transporter', 'total_delay', '_delay', 'status',
  ],
  returned: [
    'invoice_no', 'depot', 'customer_name', 'town', 'division', 'distance_km', 'invoice_date',
    'actual_delivery_date', 'receiving_date', 'invoice_value', 'no_of_cases', 'gross_weight_kg',
    'cancel_reason', 'status',
  ],
  cancelled: [
    'invoice_no', 'depot', 'customer_name', 'town', 'division', 'distance_km', 'invoice_date',
    'invoice_value', 'no_of_cases', 'gross_weight_kg', 'cancel_date', 'cancel_reason', 'status',
  ],
  all: ['invoice_no', 'depot', 'customer_name', 'town', 'division', 'distance_km', 'invoice_date', 'invoice_value', 'no_of_cases', 'status'],
};

const RENAME_MAP: Record<string, string> = {
  invoice_no: 'Invoice No',
  depot: 'Depot (Werks)',
  customer_name: 'Customer Name',
  town: 'Town',
  invoice_date: 'Invoice Date',
  _edd: 'Expected Delivery Date',
  dispatch_date: 'Dispatch Date',
  actual_delivery_date: 'Actual Delivery Date',
  receiving_date: 'Receiving Date',
  no_of_cases: 'No. of Cases',
  gross_weight_kg: 'Gross Weight (KG)',
  distance_km: 'Distance',
  division: 'Division',
  invoice_value: 'Invoice Value (₹)',
  transporter: 'Transporter',
  vehicle_no: 'Vehicle No',
  vehicle_type: 'Vehicle Type',
  lr_no: 'LR No',
  order_receiving_date: 'Order Date',
  payment_receiving_date: 'Payment Date',
  total_delay: 'Total Delay (Days)',
  _delay: 'Delay vs EDD (Days)',
  status: 'Status',
  cancel_reason: 'Reason',
  cancel_date: 'Cancel Date',
  return_type: 'Return Type',
  credit_note: 'Credit Note',
  sap_ret_date: 'SAP Return Date',
  pieces_returned: 'Pieces Returned',
  material_name: 'Material Name',
  ret_val: 'Return Value',
};

const DATE_COLUMNS = new Set([
  'invoice_date', '_edd', 'dispatch_date', 'actual_delivery_date', 'receiving_date',
  'order_receiving_date', 'payment_receiving_date', 'cancel_date', 'sap_ret_date',
]);

/** "FULL | Credit:{cn} | SAP:{date}" or "PARTIAL | Credit:{cn} | SAP:{date} | Pieces:{n} | Mat:{material}" */
function parseReturnReason(reason: string) {
  const parts = (reason || '').split('|').map((p) => p.trim());
  const kind = parts[0] || '';
  const kv: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const idx = p.indexOf(':');
    if (idx === -1) continue;
    kv[p.slice(0, idx).trim().toLowerCase()] = p.slice(idx + 1).trim();
  }
  return {
    return_type: kind === 'FULL' ? 'Full Return' : kind === 'PARTIAL' ? 'Partial Refund' : kind,
    credit_note: kv['credit'] ?? '',
    sap_ret_date: kv['sap'] ?? '',
    pieces_returned: kv['pieces'] ?? '',
    material_name: kv['mat'] ?? '',
  };
}

function relabelCancelReason(reason: string): string {
  if (reason?.startsWith('FULL')) return 'Full Return';
  if (reason?.startsWith('PARTIAL')) return 'Partial Return';
  return reason ?? '';
}

function computeDelay(row: AnyInvoiceRow): number | null {
  const a = toDate(row.actual_delivery_date);
  const e = toDate(row.edd);
  if (!a || !e) return null;
  return Math.round((a.getTime() - e.getTime()) / 86400000);
}

export async function exportReportToExcel(opts: {
  depotNo: string;
  type: ReportType;
  rows: AnyInvoiceRow[];
  getRetVal: (creditNote: string) => Promise<string>;
}): Promise<void> {
  const { depotNo, type, rows, getRetVal } = opts;
  const columns = [...COLUMN_SETS[type]];

  let retValCache: Record<string, string> = {};
  if (type === 'returned') {
    const uniqueCreditNotes = new Set<string>();
    for (const row of rows) {
      const { credit_note } = parseReturnReason(row.cancel_reason ?? '');
      if (credit_note) uniqueCreditNotes.add(credit_note);
    }
    for (const cn of uniqueCreditNotes) {
      try {
        retValCache[cn] = await getRetVal(cn);
      } catch {
        retValCache[cn] = '';
      }
    }
    const idx = columns.indexOf('cancel_reason');
    columns.splice(idx, 1, 'return_type', 'credit_note', 'sap_ret_date', 'pieces_returned', 'material_name', 'ret_val');
  }

  const sheetRows = rows.map((row) => {
    const record: Record<string, unknown> = { ...row };
    if (type === 'pending' || type === 'dispatched' || type === 'completed') {
      record._edd = fd(row.edd);
    }
    if (type === 'completed') {
      record._delay = computeDelay(row);
    }
    if (type === 'returned') {
      const parsed = parseReturnReason(row.cancel_reason ?? '');
      Object.assign(record, parsed, { ret_val: retValCache[parsed.credit_note] ?? '' });
    }
    if (type === 'cancelled') {
      record.cancel_reason = relabelCancelReason(row.cancel_reason ?? '');
    }
    if ('distance_km' in record) {
      const km = Number(record.distance_km);
      record.distance_km = km ? `${Math.round(km)} km` : '—';
    }
    const out: Record<string, unknown> = {};
    for (const col of columns) {
      const header = RENAME_MAP[col] ?? col;
      let value = record[col];
      if (DATE_COLUMNS.has(col) && col !== '_edd') value = fd(value);
      if (col === '_delay') value = value === null || value === undefined ? '—' : `${value}d`;
      out[header] = value ?? '—';
    }
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, type.slice(0, 31));
  const stamp = new Date();
  const ymd = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}`;
  const filename = `${depotNo}_${type}_${ymd}.xlsx`;

  if (Platform.OS === 'web') {
    XLSX.writeFile(workbook, filename);
    return;
  }

  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: filename,
    });
  }
}
