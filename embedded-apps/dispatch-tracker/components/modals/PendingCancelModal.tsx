import { useEffect, useState } from 'react';
import { colors } from '@/constants/theme';
import { isoDate, todayDate, toDate } from '@/lib/format';
import { ApiError, postCancel } from '@/lib/api';
import { useData } from '@/contexts/DataContext';
import { PendingInvoice } from '@/types/models';
import { CenteredModal, ModalHeader } from '@/components/CenteredModal';
import { DateField, FieldLabel, FormError, GhostButton, ModalButtonRow, PrimaryButton, TextField } from '@/components/Form';

/** Ported 1:1 from the "cancel" inline form in dis_shared_components.py render_pending() (§ _sh_action == "cancel"). */
export function PendingCancelModal({
  visible,
  row,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  row: PendingInvoice;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const { invalidate } = useData();
  const invDate = toDate(row.invoice_date);
  const minDate = invDate ?? todayDate();

  const [cancelDate, setCancelDate] = useState<Date>(todayDate());
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCancelDate(todayDate());
    setReason('');
    setError(null);
  }, [visible, row.invoice_no]);

  async function handleSave() {
    if (!reason.trim()) {
      setError('Please enter a reason.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await postCancel({
        invoice_no: row.invoice_no,
        werks: row.depot,
        row_data: row,
        cancel_date: isoDate(cancelDate),
        cancel_reason: reason.trim(),
      });
      invalidate('pend', 'canc');
      onSuccess(`✓ ${row.invoice_no} cancelled`);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not cancel invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CenteredModal visible={visible} onClose={onClose} maxWidth={480}>
      <ModalHeader iconBg={colors.redLt} icon="✕" title="Cancel Invoice" titleColor={colors.redDk} subtitle={`Invoice · ${row.invoice_no}`} />

      <FieldLabel text="Cancel Date" required />
      <DateField value={cancelDate} onChange={setCancelDate} minimumDate={minDate} maximumDate={todayDate()} />

      <FieldLabel text="Reason" required />
      <TextField value={reason} onChangeText={setReason} placeholder="Enter reason for cancelling…" multiline />

      <FormError text={error} />

      <ModalButtonRow>
        <GhostButton label="✕ Close" onPress={onClose} />
        <PrimaryButton label="💾 Save" onPress={handleSave} color={colors.red} loading={submitting} />
      </ModalButtonRow>
    </CenteredModal>
  );
}
