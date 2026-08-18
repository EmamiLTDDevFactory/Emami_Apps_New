/**
 * Field names mirror streamlit_app/sap/*.py's to_dict() output exactly
 * (snake_case, same names as the Python dataclasses) since the API layer
 * (api/main.py) passes those dicts straight through as JSON. Keeping the
 * names identical is what makes this a 1:1 port rather than a rewrite.
 */

export type Role = 'depot' | 'hq';

export interface SapKpi {
  pend_no: number | null;
  disp_no: number | null;
  comp_no: number | null;
  canc_no: number | null;
  ret_no: number | null;
}

/** InvoiceSet — streamlit_app/sap/invoices.py */
export interface Invoice {
  invoice_no: string;
  depot: string;
  depot_name: string;
  zone: string;
  channel: string;
  division: string;
  customer_id: string;
  customer_name: string;
  town: string;
  route_code: string;
  order_receiving_date: string | null;
  invoice_date: string | null;
  payment_receiving_date: string | null;
  dispatch_date: string | null;
  edd: string | null;
  no_of_cases: number;
  gross_weight_kg: number;
  invoice_value: number;
  vehicle_no: string;
  vehicle_type: string;
  transporter: string;
  lr_no: string;
  agreed_tat: number;
  delay_dispatch: number;
  delay_delivery: number;
  total_delay: number;
  status: string;
  cancel_reason: string;
  source: string;
}

/** InvoicePendSet — streamlit_app/sap/invoices_pend.py */
export interface PendingInvoice {
  invoice_no: string;
  depot: string;
  zone: string;
  channel: string;
  division: string;
  customer_id: string;
  customer_name: string;
  town: string;
  route_code: string;
  order_receiving_date: string | null;
  invoice_date: string | null;
  payment_receiving_date: string | null;
  no_of_cases: number;
  gross_weight_kg: number;
  invoice_value: number;
  agreed_tat: number;
  delay_dispatch: number;
  distance_km: number;
  edd: string | null;
  status: string;
}

/** InvoiceDispSet — streamlit_app/sap/invoices_disp.py */
export interface DispatchDetail {
  invoice_no: string;
  depot: string;
  customer_name: string;
  town: string;
  no_of_cases: number;
  gross_weight_kg: number;
  invoice_value: number;
  edd: string | null;
  lr_no: string;
  dispatch_date: string | null;
  transporter: string;
  vehicle_no: string;
  vehicle_type: string;
  status: string;
  cancel_reason: string;
  invoice_date: string | null;
  order_receiving_date: string | null;
  payment_receiving_date: string | null;
}

/** InvoiceCompSet — streamlit_app/sap/invoices_comp.py (total_delay computed server-side) */
export interface CompletedInvoice {
  invoice_no: string;
  depot: string;
  customer_name: string;
  town: string;
  no_of_cases: number;
  gross_weight_kg: number;
  invoice_value: number;
  invoice_date: string | null;
  dispatch_date: string | null;
  actual_delivery_date: string | null;
  transporter: string;
  agreed_tat: number;
  total_delay: number;
  edd: string | null;
  status: string;
}

/** InvoiceRetSet — streamlit_app/sap/invoices_ret.py */
export interface ReturnedInvoice {
  invoice_no: string;
  depot: string;
  customer_name: string;
  town: string;
  no_of_cases: number;
  gross_weight_kg: number;
  invoice_value: number;
  invoice_date: string | null;
  actual_delivery_date: string | null;
  cancel_reason: string;
  receiving_date: string | null;
  status: string;
}

/** InvoiceCanSet — streamlit_app/sap/invoices_canc.py */
export interface CancelledInvoice {
  invoice_no: string;
  depot: string;
  customer_name: string;
  town: string;
  no_of_cases: number;
  gross_weight_kg: number;
  invoice_value: number;
  invoice_date: string | null;
  dispatch_date: string | null;
  cancel_reason: string;
  cancel_date: string | null;
  status: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  role: Role;
  name: string;
  depots: string[];
  depot_number: string;
  depot_name: string;
  sap_kpi: SapKpi;
  invoices: Invoice[];
}

/** Any row shape from the 5 status caches, for shared list/filter/format utilities. */
export type AnyInvoiceRow = Partial<
  Invoice & PendingInvoice & DispatchDetail & CompletedInvoice & ReturnedInvoice & CancelledInvoice
> & { invoice_no: string; status: string };
