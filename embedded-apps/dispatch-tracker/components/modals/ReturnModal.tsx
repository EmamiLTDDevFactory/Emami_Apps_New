import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CenteredModal, ModalHeader } from '@/components/CenteredModal';
import {
  DateField,
  FieldLabel,
  FormError,
  GhostButton,
  ModalButtonRow,
  PrimaryButton,
  SelectField,
  TextField,
} from '@/components/Form';
import { colors, radius } from '@/constants/theme';
import { useData } from '@/contexts/DataContext';
import { ApiError, getRetVal, postReturn } from '@/lib/api';
import { isoDate, toDate, todayDate } from '@/lib/format';
import { CompletedInvoice } from '@/types/models';

/** Ported 1:1 from the "cp_ret_{inv_no}" popup inside render_completed(). */
const RETURN_TYPES = ['Full Return', 'Partial Refund'];

export function ReturnModal({
  visible,
  invoice,
  onClose,
  onDone,
}: {
  visible: boolean;
  invoice: CompletedInvoice | null;
  onClose: () => void;
  /** Fired once the return request settles — caller shows the flash message. */
  onDone: (message: string, type: 'success' | 'warning') => void;
}) {
  const { invalidate } = useData();

  const today = todayDate();
  const minDate = (invoice && toDate(invoice.actual_delivery_date)) || today;

  const [receivingDate, setReceivingDate] = useState<Date>(minDate);
  const [sapEntryDate, setSapEntryDate] = useState<Date>(minDate);
  const [returnType, setReturnType] = useState('Full Return');
  const [creditNote, setCreditNote] = useState('');
  const [retVal, setRetVal] = useState('');
  const [fetchingRetVal, setFetchingRetVal] = useState(false);
  const [pieces, setPieces] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !invoice) return;
    const base = toDate(invoice.actual_delivery_date) || todayDate();
    setReceivingDate(base);
    setSapEntryDate(base);
    setReturnType('Full Return');
    setCreditNote('');
    setRetVal('');
    setFetchingRetVal(false);
    setPieces('');
    setMaterialName('');
    setError(null);
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, invoice?.invoice_no]);

  if (!invoice) return null;
  // Re-bind to a `const` so nested closures below keep the non-null narrowing.
  const inv = invoice;

  const isPartial = returnType === 'Partial Refund';

  async function handleGetRetVal() {
    const cn = creditNote.trim();
    if (!cn) return;
    setFetchingRetVal(true);
    try {
      const v = await getRetVal(cn);
      setRetVal(v ?? '');
    } catch {
      setRetVal('');
    } finally {
      setFetchingRetVal(false);
    }
  }

  async function handleSave() {
    const errs: string[] = [];
    if (!receivingDate) errs.push('Receiving Date required.');
    if (!sapEntryDate) errs.push('SAP Entry Date required.');
    if (!creditNote.trim()) errs.push('Credit Note required.');
    if (isPartial) {
      if (!pieces || Number(pieces) <= 0) errs.push('Pieces Returned required.');
      if (!materialName.trim()) errs.push('Material Name required.');
    }
    if (errs.length) {
      setError(errs.join(' · '));
      return;
    }
    setError(null);
    setSaving(true);

    // Exact format required — the Returned tab parses this string.
    const lbl = isPartial ? 'PARTIAL' : 'FULL';
    const reason =
      `${lbl} | Credit:${creditNote.trim()} | SAP:${isoDate(sapEntryDate)}` +
      (isPartial ? ` | Pieces:${parseInt(pieces, 10)} | Mat:${materialName.trim()}` : '');

    try {
      await postReturn({
        invoice_no: inv.invoice_no,
        werks: inv.depot,
        row_data: inv as unknown as Record<string, unknown>,
        receiving_date: isoDate(receivingDate),
        cancel_reason: reason,
      });
      invalidate('comp', 'ret');
      onDone(`↩ ${inv.invoice_no} returned successfully`, 'success');
    } catch (e) {
      invalidate('comp', 'ret');
      const detail = e instanceof ApiError ? e.message : '';
      onDone(
        detail ? `⚠️ ${inv.invoice_no}: ${detail}` : `⚠️ ${inv.invoice_no} — SAP returned an error; please verify.`,
        'warning'
      );
    } finally {
      setSaving(false);
      onClose();
    }
  }

  return (
    <CenteredModal visible={visible} onClose={onClose} maxWidth={560}>
      <ModalHeader
        iconBg={colors.amberLt}
        icon="↩"
        title="Return Invoice"
        titleColor={colors.amberDk}
        subtitle={`Invoice · ${inv.invoice_no} · Completed → Returned`}
      />

      <FieldLabel text="Receiving Date" required />
      <DateField value={receivingDate} onChange={setReceivingDate} minimumDate={minDate} maximumDate={today} />

      <FieldLabel text="SAP Entry Date" required />
      <DateField value={sapEntryDate} onChange={setSapEntryDate} minimumDate={minDate} maximumDate={today} />

      <FieldLabel text="Return Type" required />
      <SelectField value={returnType} options={RETURN_TYPES} onChange={setReturnType} />

      <FieldLabel text="Credit Note" required />
      <View style={styles.creditRow}>
        <View style={{ flex: 1 }}>
          <TextField value={creditNote} onChangeText={setCreditNote} placeholder="Enter credit note no." />
        </View>
        <Pressable style={styles.getBtn} onPress={handleGetRetVal} disabled={fetchingRetVal}>
          <Text style={styles.getBtnText}>{fetchingRetVal ? '…' : 'Get'}</Text>
        </Pressable>
      </View>

      {retVal ? (
        <View style={styles.retValBox}>
          <Text style={styles.retValIcon}>🏷️</Text>
          <Text style={styles.retValLabel}>Return Value</Text>
          <Text style={styles.retValAmount}>{retVal}</Text>
        </View>
      ) : null}

      {isPartial && (
        <>
          <FieldLabel text="Pieces Returned" required />
          <TextField value={pieces} onChangeText={setPieces} placeholder="0" keyboardType="numeric" />

          <FieldLabel text="Material Name" required />
          <TextField value={materialName} onChangeText={setMaterialName} placeholder="Enter material name" />
        </>
      )}

      <FormError text={error} />

      <ModalButtonRow>
        <GhostButton label="✕ Close" onPress={onClose} />
        <PrimaryButton label="💾 Save" onPress={handleSave} color={colors.amber} loading={saving} />
      </ModalButtonRow>
    </CenteredModal>
  );
}

const styles = StyleSheet.create({
  creditRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  getBtn: {
    minWidth: 48,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.blueBd,
    backgroundColor: colors.blueLt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  getBtnText: { color: colors.blueDk, fontSize: 11, fontWeight: '700' },
  retValBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF08A',
    borderWidth: 2,
    borderColor: '#EAB308',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  retValIcon: { fontSize: 16 },
  retValLabel: { fontSize: 11, color: '#713F12', fontWeight: '600' },
  retValAmount: { fontSize: 14, fontWeight: '800', color: '#78350F' },
});
