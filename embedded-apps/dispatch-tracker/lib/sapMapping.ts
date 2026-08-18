import { Invoice } from '@/types/models';

export const parseFloatSafe = (val: any): number => {
    if (!val) return 0;
    const p = parseFloat(val);
    return isNaN(p) ? 0 : p;
};

export const parseIntSafe = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    const p = parseInt(val, 10);
    return isNaN(p) ? 0 : p;
};

export const parseDate = (val: any): string | null => {
    if (!val) return null;
    const match = val.match(/\/Date\((\d+)\)\//);
    if (match) return new Date(parseInt(match[1], 10)).toISOString().split('T')[0];
    return val;
};

export function normalizeInvoice(raw: any): Invoice {
    return {
        invoice_no: raw.Vbeln || '',
        invoice_date: parseDate(raw.Fkdat) || '',
        depot: raw.Werks || '',
        depot_name: raw.DepotName || '',
        zone: raw.Regio || '',
        channel: raw.Vtweg || '',
        division: raw.Spart || '',
        customer_id: raw.Kunnr || '',
        customer_name: raw.Name1 || '',
        town: raw.Ort01 || '',
        route_code: raw.Route || '',
        order_receiving_date: parseDate(raw.OrdErdat) || '',
        payment_receiving_date: parseDate(raw.PayErdat) || '',
        no_of_cases: parseFloatSafe(raw.Fkimg),
        invoice_value: parseFloatSafe(raw.Netwr),
        gross_weight_kg: parseFloatSafe(raw.GrossWt),
        edd: parseDate(raw.Edd) || '',
        transporter: (raw.Transporter || raw.Tdname || raw.CarrName || raw.Lifex || raw.ForwardAgent || '').trim(),
        lr_no: raw.LrNo || '',
        vehicle_type: raw.VehicleType || '',
        vehicle_no: raw.VehicleNo || '',
        dispatch_date: parseDate(raw.DispatchDate || raw.Disptdat || raw.Dispdat || raw.Wadat_ist),
        cancel_reason: raw.CanRsn || raw.CancelReason || '',
        agreed_tat: parseIntSafe(raw.Tat || raw.AgreedTat),
        delay_dispatch: parseIntSafe(raw.DelayDispatch),
        delay_delivery: parseIntSafe(raw.DelayDelivery),
        total_delay: parseIntSafe(raw.TotalDelay),
        status: raw.Status || 'Pending',
        source: raw.Source || 'sap_live'
    } as any;
}
