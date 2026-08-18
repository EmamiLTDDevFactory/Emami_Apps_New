import { useEffect, useState } from 'react';
import { colors } from '@/constants/theme';
import { isoDate, todayDate, toDate } from '@/lib/format';
import { ApiError, postCancel } from '@/lib/api';
import { useData } from '@/contexts/DataContext';
import { DispatchDetail } from '@/types/models';
import { CenteredModal, ModalHeader } from '@/components/CenteredModal';
import { DateField, FieldLabel, FormError, GhostButton, ModalButtonRow, PrimaryButton, TextField } from '@/components/Form';

/**
 * Ported 1:1 from _dispatch_cancel_modal() in dis_shared_components.py —
 * the Cancel dialog for already-dispatched invoices (cancel date range is
 * dispatch_date → today, unlike the Pending tab's cancel modal which ranges
 * from invoice_date → today).
 *
 * A blank Reason is a client-side validation failure and keeps the modal
 * open with a FormError (matches the original's inline "Please enter a
 * reason." + rerun without closing). Once the reason is non-blank, the API
 * call ALWAYS closes the modal and flashes success or a warning — same
 * "never block the popup on a possible SAP quirk" behavior as DeliverModal.
 */
export function DispatchCancelModal({
  visible,
  row,
  onClose,
  onDone,
}: {
  visible: boolean;
  row: DispatchDetail;
  onClose: () => void;
  onDone: (message: string, kind: 'success' | 'warning') => void;
}) {
  const { invalidate } = useData();
  const today = todayDate();
  const minDate = toDate(row.dispatch_date) ?? today;

  const [cancelDate, setCancelDate] = useState<Date>(today);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCancelDate(todayDate());
    setReason('');
    setError(null);
    setSubmitting(false);
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
      invalidate('disp', 'canc');
      onDone(`✕ ${row.invoice_no} cancelled`, 'success');
    } catch (e) {
      invalidate('disp', 'canc');
      const detail = e instanceof ApiError ? e.message : '';
      onDone(
        detail
          ? `⚠️ ${row.invoice_no}: ${detail}`
          : `⚠️ ${row.invoice_no} — SAP returned an error; please verify the cancellation was recorded.`,
        'warning'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CenteredModal visible={visible} onClose={onClose} maxWidth={520}>
      <ModalHeader
        iconBg={colors.redLt}
        icon="✕"
        title="Cancel Invoice"
        titleColor={colors.redDk}
        subtitle={`Invoice · ${row.invoice_no}`}
      />

      <FieldLabel text="Cancel Date" required />
      <DateField value={cancelDate} onChange={setCancelDate} minimumDate={minDate} maximumDate={today} />

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
