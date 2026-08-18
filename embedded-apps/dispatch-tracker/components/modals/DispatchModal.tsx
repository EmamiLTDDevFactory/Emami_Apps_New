import { useEffect, useState } from 'react';
import { colors } from '@/constants/theme';
import { fd, fmtCw, isoDate, todayDate, toDate } from '@/lib/format';
import { ApiError, getTransporters, postDispatch } from '@/lib/api';
import { useData } from '@/contexts/DataContext';
import { PendingInvoice } from '@/types/models';
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

const VEHICLE_TYPE_PLACEHOLDER = '— Select —';
const VEHICLE_TYPE_OPTIONS = [VEHICLE_TYPE_PLACEHOLDER, 'FTL (Full Truck Load)', 'PTL (Part Truck Load)', 'Trip'];
const TRANSPORTER_PLACEHOLDER = '— Select Transporter —';
const VEHICLE_TYPE_SHORT: Record<string, string> = {
  'FTL (Full Truck Load)': 'FTL',
  'PTL (Part Truck Load)': 'PTL',
  Trip: 'Trip',
};

/** Ported 1:1 from the "dispatch" inline form in dis_shared_components.py render_pending() (§ _sh_action == "dispatch"). */
export function DispatchModal({
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

  const [dispatchDate, setDispatchDate] = useState<Date>(todayDate());
  const [lrNo, setLrNo] = useState('');
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPE_PLACEHOLDER);
  const [vehicleNo, setVehicleNo] = useState('');
  const [transporter, setTransporter] = useState(TRANSPORTER_PLACEHOLDER);
  const [transporterOptions, setTransporterOptions] = useState<string[]>([TRANSPORTER_PLACEHOLDER]);
  const [cases, setCases] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDispatchDate(todayDate());
    setLrNo('');
    setVehicleType(VEHICLE_TYPE_PLACEHOLDER);
    setVehicleNo('');
    setTransporter(TRANSPORTER_PLACEHOLDER);
    setCases(String(row.no_of_cases ?? 0));
    setError(null);
    setTransporterOptions([TRANSPORTER_PLACEHOLDER]);
    getTransporters(row.route_code)
      .then((opts) => setTransporterOptions([TRANSPORTER_PLACEHOLDER, ...opts]))
      .catch(() => setTransporterOptions([TRANSPORTER_PLACEHOLDER]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, row.invoice_no]);

  const isFtlOrTrip = vehicleType === 'FTL (Full Truck Load)' || vehicleType === 'Trip';

  async function handleSubmit() {
    const errs: string[] = [];
    if (!dispatchDate) errs.push('Dispatch Date required.');
    else if (invDate && dispatchDate < invDate) errs.push(`Date before Invoice Date (${fd(row.invoice_date)}).`);
    if (!lrNo.trim()) errs.push('LR Number required.');
    if (vehicleType === VEHICLE_TYPE_PLACEHOLDER) errs.push('Vehicle Type required.');
    if (isFtlOrTrip && !vehicleNo.trim())
      errs.push("Vehicle No is required for FTL/Trip — enter the vehicle number or 'NA' if not available.");
    if (!transporter || transporter === TRANSPORTER_PLACEHOLDER) errs.push('Transporter required.');

    if (errs.length) {
      setError(errs.join(' · '));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const casesNum = Number(cases);
      await postDispatch({
        invoice_no: row.invoice_no,
        werks: row.depot,
        row_data: row,
        dispatch_date: isoDate(dispatchDate),
        lr_no: lrNo.trim(),
        vehicle_no: vehicleNo.trim(),
        vehicle_type: vehicleType,
        transporter: transporter.trim(),
        cases: Number((Number.isFinite(casesNum) ? casesNum : 0).toFixed(2)),
      });
      invalidate('pend', 'disp', 'inv');
      const vtShort = VEHICLE_TYPE_SHORT[vehicleType] ?? vehicleType;
      onSuccess(`✓ ${row.invoice_no} dispatched via ${transporter} [${vtShort}]`);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not dispatch invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CenteredModal visible={visible} onClose={onClose}>
      <ModalHeader
        iconBg={colors.greenLt}
        icon="🚚"
        title="Dispatch Invoice"
        titleColor={colors.greenDk}
        subtitle={`Invoice · ${row.invoice_no} · ${fmtCw(row.no_of_cases, row.gross_weight_kg)} · ${fd(row.invoice_date)} · ${row.customer_name}, ${row.town}`}
      />

      <FieldLabel text="Dispatch Date" required />
      <DateField value={dispatchDate} onChange={setDispatchDate} minimumDate={invDate ?? undefined} maximumDate={todayDate()} />

      <FieldLabel text="LR Number" required />
      <TextField value={lrNo} onChangeText={setLrNo} placeholder="Enter LR number" />

      <FieldLabel text="Vehicle Type" required />
      <SelectField value={vehicleType} options={VEHICLE_TYPE_OPTIONS} onChange={setVehicleType} />

      <FieldLabel text="Vehicle No" required={isFtlOrTrip} />
      <TextField
        value={vehicleNo}
        onChangeText={setVehicleNo}
        placeholder={isFtlOrTrip ? 'e.g. WB12AB3456 or NA' : 'e.g. WB12AB3456'}
      />

      <FieldLabel text="Transporter" required />
      <SelectField value={transporter} options={transporterOptions} onChange={setTransporter} />

      <FieldLabel text="Cases" required />
      <TextField value={cases} onChangeText={setCases} placeholder="0.00" keyboardType="decimal-pad" />

      <FormError text={error} />

      <ModalButtonRow>
        <GhostButton label="✕ Cancel" onPress={onClose} />
        <PrimaryButton label="🚚 Dispatch" onPress={handleSubmit} color={colors.green} loading={submitting} />
      </ModalButtonRow>
    </CenteredModal>
  );
}
