/**
 * Thin client for direct communication with SAP OData and Microsoft OAuth.
 * Bypasses any Node.js proxy to connect directly from the frontend.
 */
import * as storage from '@/lib/storage';
import {
  CancelledInvoice,
  CompletedInvoice,
  DispatchDetail,
  Invoice,
  LoginResponse,
  PendingInvoice,
  ReturnedInvoice,
} from '@/types/models';
import { normalizeInvoice } from './sapMapping';

const TOKEN_KEY = 'dis_session_token';
export const API_BASE_URL = 'https://emdcindpwebapp1-bag2gfhjd9d4gkh6.centralindia-01.azurewebsites.net/api/NGQ/ZIT_DISP_INTL_ANALYTICS_SRV';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function getToken(): Promise<string | null> {
  return storage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) await storage.setItem(TOKEN_KEY, token);
  else await storage.deleteItem(TOKEN_KEY);
}

// Format Date for SAP
const formatSAPDate = (dateStr?: string | null): string | null => {
  if (!dateStr) return null;
  return `\\/Date(${new Date(dateStr).getTime()})\\/`;
};

// Generic API Request (For GETs mostly, not for POST Actions that need CSRF)
async function requestSap<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined)
  };

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    const bodyText = await res.text();
    let body: any = {};
    try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { }

    if (!res.ok) {
      let errMessage = 'Request failed';
      if (body?.error?.message?.value) errMessage = body.error.message.value;
      throw new ApiError(errMessage, res.status);
    }

    return body as T;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Cannot reach the SAP API. Check your network connection.', 0);
  }
}

// -------------------------------------------------------------------------
// Auth
// -------------------------------------------------------------------------

export async function sendOtp(email: string): Promise<{ sent: boolean }> {
  await requestSap(`/OtpGenSet(Email='${email}')?$format=json`);
  return { sent: true };
}

export async function login(email: string, otp: string): Promise<LoginResponse> {
  const payload = {
    Email: email,
    Otp: otp,
    Type: "",
    Message: "",
    Role: "",
    Name: "",
    PendNo: "",
    RetNo: "",
    CompNo: "",
    CancNo: "",
    DispNo: "",
    NAV_LoginToDepot: { results: [{ Werks: "" }] },
    NAV_LoginToInv: {
      results: [{
        Vbeln: "", Fkdat: null, Werks: "", Regio: "", Vtweg: "", Spart: "", Kunnr: "", Name1: "",
        Bzirk: "", OrdErdat: null, OrdErzet: null, PayErdat: null, PayErzet: null,
        Fkimg: null, Netwr: null, GrossWt: null
      }]
    }
  };

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const res = await fetch(`${API_BASE_URL}/LoginSet`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const bodyText = await res.text();
  let raw: any = {};
  try { raw = JSON.parse(bodyText); } catch { }
  raw = raw.d || raw;

  if (raw.Type === 'E') {
    throw new ApiError(raw.Message || 'Invalid OTP', 401);
  }

  const roleMap: Record<string, any> = { "D": "depot", "H": "hq" };
  const role = roleMap[raw.Role] || "depot";
  await setToken(email);

  const invList = (raw.NAV_LoginToInv?.results || []).map(normalizeInvoice);
  let werksList = (raw.NAV_LoginToDepot?.results || []).map((r: any) => r.Werks).filter(Boolean);
  if (!werksList.length) {
    werksList = Array.from(new Set(invList.map((inv: any) => inv.depot).filter(Boolean))).sort();
  }

  const parseIntSafe = (val: any) => {
    if (val === null || val === undefined || String(val).trim() === '') return null;
    const p = parseInt(val, 10);
    return isNaN(p) ? null : p;
  };

  return {
    token: email,
    role: role,
    email: email,
    name: raw.Name || email,
    depots: werksList,
    depot_number: werksList[0] || "",
    depot_name: werksList[0] || "",
    sap_kpi: {
      pend_no: parseIntSafe(raw.PendNo),
      disp_no: parseIntSafe(raw.DispNo),
      comp_no: parseIntSafe(raw.CompNo),
      canc_no: parseIntSafe(raw.CancNo),
      ret_no: parseIntSafe(raw.RetNo)
    },
    invoices: invList
  };
}

// -------------------------------------------------------------------------
// Invoice status caches
// -------------------------------------------------------------------------

async function fetchInvoicesRaw(entitySet: string, email: string): Promise<Invoice[]> {
  const res: any = await requestSap(`/${entitySet}?$filter=Email eq '${email}'&$format=json`);
  const results = res.d?.results || [];
  return results.map(normalizeInvoice);
}

export async function refreshInvoices(): Promise<Invoice[]> {
  const email = await getToken();
  if (!email) throw new ApiError("Not logged in", 401);

  const [pend, disp, comp, ret, canc] = await Promise.all([
    fetchInvoicesRaw("InvoicePendSet", email).catch(() => []),
    fetchInvoicesRaw("InvoiceDispSet", email).catch(() => []),
    fetchInvoicesRaw("InvoiceCompSet", email).catch(() => []),
    fetchInvoicesRaw("InvoiceRetSet", email).catch(() => []),
    fetchInvoicesRaw("InvoiceCanSet", email).catch(() => [])
  ]);

  const mapStatus = (arr: Invoice[], status: string) => arr.map(i => ({ ...i, status }));

  return [
    ...mapStatus(pend, 'Pending'),
    ...mapStatus(disp, 'Dispatched'),
    ...mapStatus(comp, 'Completed'),
    ...mapStatus(ret, 'Returned'),
    ...mapStatus(canc, 'Cancelled')
  ];
}

export const getPending = () => refreshInvoices().then(i => i.filter(x => x.status === 'Pending') as unknown as PendingInvoice[]);
export const getDispatched = () => refreshInvoices().then(i => i.filter(x => x.status === 'Dispatched') as unknown as DispatchDetail[]);
export const getCompleted = () => refreshInvoices().then(i => i.filter(x => x.status === 'Completed') as unknown as CompletedInvoice[]);
export const getReturned = () => refreshInvoices().then(i => i.filter(x => x.status === 'Returned') as unknown as ReturnedInvoice[]);
export const getCancelled = () => refreshInvoices().then(i => i.filter(x => x.status === 'Cancelled') as unknown as CancelledInvoice[]);

// -------------------------------------------------------------------------
// Actions (depot role only)
// -------------------------------------------------------------------------

async function postSapAction(entitySet: string, payload: any): Promise<{ ok: true }> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const res = await fetch(`${API_BASE_URL}/${entitySet}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const bodyText = await res.text();
    let errMessage = `Request failed (HTTP ${res.status})`;
    try {
      const body = JSON.parse(bodyText);
      if (body?.error?.message?.value) errMessage = body.error.message.value;
    } catch { }
    throw new ApiError(errMessage, res.status);
  }
  return { ok: true };
}

export interface DispatchPayload { invoice_no: string; werks: string; row_data: object; dispatch_date: string; lr_no: string; vehicle_no: string; vehicle_type: string; transporter: string; cases: number; }
export const postDispatch = (body: DispatchPayload) => postSapAction('InvoiceDispSet', {
  Vbeln: body.invoice_no,
  Werks: body.werks,
  DispatchDate: formatSAPDate(body.dispatch_date),
  LrNo: body.lr_no,
  VehicleNo: body.vehicle_no,
  VehicleType: body.vehicle_type,
  Transporter: body.transporter,
  Fkimg: body.cases ? body.cases.toString() : ""
});

export interface CompletePayload { invoice_no: string; werks: string; row_data: object; actual_delivery_date: string; }
export const postComplete = (body: CompletePayload) => postSapAction('InvoiceCompSet', {
  Vbeln: body.invoice_no,
  Werks: body.werks,
  ActDelDate: formatSAPDate(body.actual_delivery_date)
});

export interface ReturnPayload { invoice_no: string; werks: string; row_data: object; receiving_date: string; cancel_reason: string; }
export const postReturn = (body: ReturnPayload) => postSapAction('InvoiceRetSet', {
  Vbeln: body.invoice_no,
  Werks: body.werks,
  RecDate: formatSAPDate(body.receiving_date),
  CanRsn: body.cancel_reason
});

export interface CancelPayload { invoice_no: string; werks: string; row_data: object; cancel_date: string; cancel_reason: string; }
export const postCancel = (body: CancelPayload) => postSapAction('InvoiceCanSet', {
  Vbeln: body.invoice_no,
  Werks: body.werks,
  CanDate: formatSAPDate(body.cancel_date),
  CanRsn: body.cancel_reason
});

// -------------------------------------------------------------------------
// Lookups
// -------------------------------------------------------------------------

export const getTransporters = async (routeCode: string): Promise<string[]> => {
  const res: any = await requestSap(`/TransportSet?$filter=Route eq '${encodeURIComponent(routeCode)}'&$format=json`);
  const results = res.d?.results || [];
  return results.map((r: any) => (r.Transporter || '').trim()).filter(Boolean);
};

export const getRetVal = async (creditNote: string): Promise<string> => {
  const res: any = await requestSap(`/CreditSet('${encodeURIComponent(creditNote)}')?$format=json`);
  return res.d?.RetVal || '';
};
