import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (window.location.port === '3000' ? 'http://localhost:5000/api' : '/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  // Lambda Function URLs reject raw '+' characters in query strings
  // (InvalidQueryStringException). Axios's default serializer encodes
  // spaces as '+'; force %20 encoding instead via encodeURIComponent.
  paramsSerializer: {
    serialize: (params) =>
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&'),
  },
});

export async function getConsultants(filter, orderby) {
  const params = {};
  if (filter) params.$filter = filter;
  if (orderby) params.$orderby = orderby;

  // Read login module flags and role from localStorage
  const ta = localStorage.getItem('employeeTa');
  const tm = localStorage.getItem('employeeTm');
  const ld = localStorage.getItem('employeeLd');
  const od = localStorage.getItem('employeeOd');
  const role = localStorage.getItem('employeeRole');

  if (ta !== null) params.ta = ta;
  if (tm !== null) params.tm = tm;
  if (ld !== null) params.ld = ld;
  if (od !== null) params.od = od;
  if (role) params.role = role;

  const response = await apiClient.get('/consultants', { params });
  return response.data || [];
}

export async function getConsultant(id) {
  const response = await apiClient.get(`/consultants/${id}`);
  return response.data || {};
}

export async function createConsultant(payload) {
  const response = await apiClient.post('/consultants', payload);
  return response.data;
}

export async function getRoles() {
  const response = await apiClient.get('/roles');
  return response.data || [];
}

export async function createRole(payload) {
  const response = await apiClient.post('/roles', payload);
  return response.data;
}

export async function deleteRole(payload) {
  const response = await apiClient.post('/roles', payload);
  return response.data;
}

export async function updateConsultant(id, payload) {
  const response = await apiClient.put(`/consultants/${id}`, payload);
  return response.data;
}

export async function updateConsultantStatus(id, status) {
  const filter = `ConsultantId eq '${id}' and Status eq '${status}'`;
  const response = await apiClient.get('/consultants', { params: { $filter: filter } });
  return response.data;
}

export async function getConsultantDetail(id) {
  const response = await apiClient.get(`/consultants/${id}/detail`);
  return response.data || {};
}

export async function createClosure(payload) {
  const response = await apiClient.post('/closures', payload);
  return response.data;
}

export async function getClosure(consultantId, closureId) {
  const response = await apiClient.get(`/closures/${consultantId}/${closureId}`);
  return response.data || {};
}

export async function updateClosure(consultantId, closureId, payload) {
  const response = await apiClient.put(`/closures/${consultantId}/${closureId}`, payload);
  return response.data;
}

export async function getAgreementPdf(id) {
  const response = await apiClient.get(`/agreements/${id}`);
  return response.data || {};
}

export async function getEmployees() {
  const response = await apiClient.get('/employees');
  return response.data || [];
}

export async function getInvoicePdf(id, invNo) {
  const response = await apiClient.get(`/invoices/${id}/${invNo}`);
  return response.data || {};
}

export async function verifyUser(loginId) {
  const response = await apiClient.get(`/user/${loginId}`);
  return response.data;
}

export async function loginUser(loginId, otp) {
  const response = await apiClient.post('/login', { loginId, otp });
  return response.data;
}

export async function createFeeSlab(payload) {
  const response = await apiClient.post('/fees', payload);
  return response.data;
}

export async function getFeeSlabs(consultantId) {
  const filter = `ConsultantId eq '${consultantId}'`;
  const response = await apiClient.get('/fees', { params: { $filter: filter } });
  return response.data || [];
}

export async function updateFeeSlabs(consultantId, slabs) {
  const response = await apiClient.put(`/fees/${consultantId}`, { consultantId, slabs });
  return response.data;
}


