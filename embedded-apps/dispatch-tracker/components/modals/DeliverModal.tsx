import { useEffect, useState } from 'react';
import { colors } from '@/constants/theme';
import { isoDate, todayDate, toDate } from '@/lib/format';
import { ApiError, postComplete } from '@/lib/api';
import { useData } from '@/contexts/DataContext';
import { DispatchDetail } from '@/types/models';
import { CenteredModal, ModalHeader } from '@/components/CenteredModal';
import { DateField, FieldLabel, GhostButton, ModalButtonRow, PrimaryButton } from '@/components/Form';

/**
 * Ported 1:1 from _confirm_delivery_modal() in dis_shared_components.py.
 * The POD file-upload field in the original is hard-disabled there
 * (`pod_file = None`, the uploader widget is commented out) — intentionally
 * dead code we do not resurrect here, so this modal is just the date field.
 *
 * Unlike PendingCancelModal/DispatchModal (which keep the modal open and
 * show an inline FormError on failure), the original SAP-Dispatched modals
 * ALWAYS close and flash a message — success or a warning — because "SAP
 * sometimes returns an internal error even when the POST succeeds; show it
 * as a warning banner rather than blocking the popup." That's why `onDone`
 * fires on both outcomes instead of a separate onSuccess/FormError split.
 */
export function DeliverModal({
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
  const minDate = toDate(row.dispatch_date) ?? toDate(row.invoice_date) ?? today;

  const [actualDeliveryDate, setActualDeliveryDate] = useState<Date>(today);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setActualDeliveryDate(todayDate());
    setSubmitting(false);
  }, [visible, row.invoice_no]);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await postComplete({
        invoice_no: row.invoice_no,
        werks: row.depot,
        row_data: row,
        actual_delivery_date: isoDate(actualDeliveryDate),
      });
      invalidate('disp', 'comp', 'inv');
      onDone(`✅ ${row.invoice_no} marked as delivered`, 'success');
    } catch (e) {
      invalidate('disp', 'comp', 'inv');
      const detail = e instanceof ApiError ? e.message : '';
      onDone(
        detail
          ? `⚠️ ${row.invoice_no}: ${detail}`
          : `⚠️ ${row.invoice_no} — SAP returned an error; please verify the delivery was recorded.`,
        'warning'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CenteredModal visible={visible} onClose={onClose} maxWidth={500}>
      <ModalHeader
        iconBg={colors.greenLt}
        icon="✅"
        title="Confirm Delivery"
        titleColor={colors.greenDk}
        subtitle={`Invoice · ${row.invoice_no}`}
      />

      <FieldLabel text="Actual Delivery Date" />
      <DateField value={actualDeliveryDate} onChange={setActualDeliveryDate} minimumDate={minDate} maximumDate={today} />

      <ModalButtonRow>
        <GhostButton label="✕ Close" onPress={onClose} />
        <PrimaryButton label="✅ Confirm Delivery" onPress={handleConfirm} color={colors.green} loading={submitting} />
      </ModalButtonRow>
    </CenteredModal>
  );
}
