require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass self-signed/corporate SSL certificate issues

const express = require('express');
const cors = require('cors');
const path = require('path');
const { wrapper } = require('axios-cookiejar-support');
const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const multer = require('multer');

// Configure multer to keep uploaded files in memory and enforce a reasonable upload size limit
const MAX_ATTACHMENT_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB per file
const MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB total form payload

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE_BYTES,
    fieldSize: MAX_TOTAL_ATTACHMENT_SIZE_BYTES
  }
});

const app = express();
const port = process.env.BACKEND_PORT || 5000;

// Middleware — allow both local dev and production Amplify frontend
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://main.due5mcy3my82.amplifyapp.com',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true
}));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// --- Configuration ---
const SAP_BASE_URL = process.env.SAP_BASE_URL || 'https://emamiapi.emamigroup.com/api/NGD/ZRCPORTAL_SRV';
const AZURE_OAUTH_TOKEN_URL = process.env.AZURE_OAUTH_TOKEN_URL;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_SCOPE = process.env.AZURE_SCOPE;

// --- Master Dummy OTP Config (Set ALLOW_DUMMY_OTP=false in .env to disable anytime) ---
const ALLOW_DUMMY_OTP = process.env.ALLOW_DUMMY_OTP !== 'false'; // Enabled by default
const DUMMY_OTP_CODE = process.env.DUMMY_OTP_CODE || '123456';

// --- Token Caching ---
const tokenCache = {
  accessToken: null,
  expiresAt: 0,
  inflight: null
};

const isTokenValid = () => {
  return tokenCache.accessToken && Date.now() + 60000 < tokenCache.expiresAt;
};

const invalidateAzureToken = () => {
  tokenCache.accessToken = null;
  tokenCache.expiresAt = 0;
};

const refreshAzureToken = async () => {
  if (!AZURE_OAUTH_TOKEN_URL || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_SCOPE) {
    throw new Error('Azure OAuth credentials are not fully configured');
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', AZURE_CLIENT_ID);
  params.append('client_secret', AZURE_CLIENT_SECRET);
  params.append('scope', AZURE_SCOPE);

  const response = await axios.post(AZURE_OAUTH_TOKEN_URL, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 15000
  });

  const data = response.data || {};
  if (!data.access_token) {
    throw new Error(`Azure token fetch failed: ${data.error_description || data.error || 'missing access_token'}`);
  }

  const expiresIn = Number(data.expires_in || 3600);
  tokenCache.accessToken = data.access_token;
  tokenCache.expiresAt = Date.now() + (expiresIn * 1000) - 60000;
  return tokenCache.accessToken;
};

const getAzureAccessToken = async () => {
  if (isTokenValid()) {
    return tokenCache.accessToken;
  }
  if (tokenCache.inflight) {
    return tokenCache.inflight;
  }
  tokenCache.inflight = refreshAzureToken().finally(() => {
    tokenCache.inflight = null;
  });
  return tokenCache.inflight;
};

// --- Axios Client Setup ---
// Setting up the cookie jar to automatically manage SAP session cookies
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'DataServiceVersion': '2.0',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
}));

// Request interceptor to inject Azure AD bearer token
client.interceptors.request.use(async request => {
  if (!request.headers) {
    request.headers = {};
  }

  try {
    const token = await getAzureAccessToken();
    request.headers.Authorization = `Bearer ${token}`;
  } catch (tokenError) {
    console.error('[AUTH] Failed to acquire Azure token:', tokenError.message || tokenError);
    throw tokenError;
  }

  console.log('[DEBUG] Final URL to SAP:', client.getUri(request));
  return request;
});

// Response interceptor to handle token expiry / auto-retry on 401/403
client.interceptors.response.use(
  response => response,
  async error => {
    const status = error?.response?.status;
    const originalRequest = error?.config;

    if ((status === 401 || status === 403) && originalRequest && !originalRequest.__retry) {
      originalRequest.__retry = true;
      invalidateAzureToken();

      try {
        const token = await getAzureAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return client.request(originalRequest);
      } catch (retryError) {
        return Promise.reject(retryError);
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to encode OData filters
const encodeODataFilter = (filter) => encodeURIComponent(filter).replace(/%20/g, '%20');

// Helper function to fetch CSRF token (no-op for Azure AD OAuth proxy)
async function getCsrfToken() {
  return undefined;
}

// --- Routes ---

// GET all consultants with optional filter, orderby, module permissions (ta, tm, ld, od), and role
app.get('/api/consultants', async (req, res) => {
  try {
    jar.removeAllCookiesSync();
    
    const { $filter, $orderby, ta, tm, ld, od, Ta, Tm, Ld, Od, role, Role } = req.query;
    let url = `${SAP_BASE_URL}/consultantSet?$format=json`;
    
    const activeFilters = [];
    if ($filter) activeFilters.push($filter);

    const valTa = ta ?? Ta;
    const valTm = tm ?? Tm;
    const valLd = ld ?? Ld;
    const valOd = od ?? Od;
    const valRole = role ?? Role;

    if (valRole) activeFilters.push(`Role eq '${valRole}'`);
    if (valTa === 'X') activeFilters.push("Ta eq 'X'");
    if (valTm === 'X') activeFilters.push("Tm eq 'X'");
    if (valLd === 'X') activeFilters.push("Ld eq 'X'");
    if (valOd === 'X') activeFilters.push("Od eq 'X'");

    if (activeFilters.length > 0) {
      url += `&$filter=${encodeODataFilter(activeFilters.join(' and '))}`;
    }
    
    if ($orderby) url += `&$orderby=${encodeURIComponent($orderby)}`;
    
    console.log('[GET-CONSULTANTS] Role & Module permissions:', { role: valRole, ta: valTa, tm: valTm, ld: valLd, od: valOd });
    console.log('[GET-CONSULTANTS] URL:', url);
    const response = await client.get(url);
    
    const data = response.data.d?.results || response.data?.results || [];
    res.json(data);
  } catch (error) {
    console.error('[GET-CONSULTANTS] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({ error: 'Failed to fetch consultants from SAP' });
  }
});

// GET single consultant by ID
app.get('/api/consultants/:id', async (req, res) => {
  try {
    jar.removeAllCookiesSync();
    
    const { id } = req.params;
    // The GET_ENTITY method for consultantSet is failing in SAP Gateway with key predicates.
    // We use a $filter on GET_ENTITYSET which reliably returns the consultant data.
    const url = `${SAP_BASE_URL}/consultantSet?$filter=ConsultantId eq '${id}'&$format=json`;
    
    console.log('[GET-CONSULTANT] URL:', url);
    const response = await client.get(url);
    
    const results = response.data.d?.results || response.data?.results || [];
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: 'Consultant not found in SAP' });
    }
  } catch (error) {
    console.error('[GET-CONSULTANT] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({ error: 'Failed to fetch consultant from SAP' });
  }
});

// GET consultant detail with expanded closures and invoices
app.get('/api/consultants/:id/detail', async (req, res) => {
  try {
    jar.removeAllCookiesSync();
    
    const { id } = req.params;
    const expand = 'Nav_ConsIdToClos,NAV_ConsIdToInv';
    const url = `${SAP_BASE_URL}/ConsIdSet('${id}')?$format=json&$expand=${encodeURIComponent(expand)}`;
    
    console.log('[GET-CONSULTANT-DETAIL] URL:', url);
    const response = await client.get(url);
    
    const data = response.data.d || response.data;
    res.json(data);
  } catch (error) {
    console.error('[GET-CONSULTANT-DETAIL] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({ error: 'Failed to fetch consultant detail from SAP' });
  }
});

// POST create consultant
app.post('/api/consultants', upload.any(), async (req, res) => {
  console.log('\n=== [CREATE-CONSULTANT] NEW CONSULTANT SUBMISSION RECEIVED ===\n');
  try {
    jar.removeAllCookiesSync();
    
    const csrfToken = await getCsrfToken();
    
    let postData;
    try {
      postData = req.body.claimData ? JSON.parse(req.body.claimData) : req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON data' });
    }
    
    // Attach file if uploaded
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      postData.Filename = file.originalname;
      postData.Mimetype = file.mimetype;
      postData.Value = file.buffer.toString('base64');
    }

    // Ensure CreatedBy is string
    if (req.body.CreatedBy || req.body.createdBy || req.body.created_by || postData.CreatedBy) {
      postData.CreatedBy = String(postData.CreatedBy || req.body.CreatedBy || req.body.createdBy || req.body.created_by || '').trim();
    }
    
    const url = `${SAP_BASE_URL}/consultantSet`;
    console.log('[CREATE-CONSULTANT] POST URL:', url);
    console.log('[CREATE-CONSULTANT] Payload:', JSON.stringify(postData, null, 2));
    
    const response = await client.post(url, postData, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      }
    });
    
    const sapResponse = response.data.d || response.data;
    console.log('[CREATE-CONSULTANT] Response:', JSON.stringify(sapResponse, null, 2));
    
    res.json({
      success: true,
      data: sapResponse,
      message: 'Consultant created successfully'
    });
  } catch (error) {
    console.error('\n--- SAP CREATE ERROR ---');
    console.error(error?.response?.data?.error?.message?.value || error?.response?.data || error.message);
    console.error('-----------------------\n');
    res.status(error?.response?.status || 500).json({ error: error?.response?.data || 'Failed to create consultant in SAP' });
  }
});

// POST create or delete role assignment in UserSet
app.post('/api/roles', async (req, res) => {
  const isDelete = req.body?.Del === 'X';
  console.log(`\n=== [ROLE] ${isDelete ? 'DELETE' : 'CREATE'} ROLE REQUEST RECEIVED ===\n`);
  try {
    jar.removeAllCookiesSync();
    const csrfToken = await getCsrfToken();

    const postData = req.body;
    const url = `${SAP_BASE_URL}/UserSet`;
    console.log(`[ROLE] POST URL: ${url}`);
    console.log('[ROLE] Payload:', JSON.stringify(postData, null, 2));

    const response = await client.post(url, postData, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      }
    });

    const sapResponse = response.data.d || response.data;
    console.log('[ROLE] Response:', JSON.stringify(sapResponse, null, 2));

    res.json({
      success: true,
      data: sapResponse,
      message: isDelete ? 'Role assignment deleted successfully' : 'Role assignment saved successfully'
    });
  } catch (error) {
    console.error(`\n--- SAP ROLE ${isDelete ? 'DELETE' : 'CREATE'} ERROR ---`);
    console.error(error?.response?.data?.error?.message?.value || error?.response?.data || error.message);
    console.error('-----------------------\n');
    res.status(error?.response?.status || 500).json({ error: error?.response?.data || `Failed to ${isDelete ? 'delete' : 'save'} role assignment in SAP` });
  }
});

// POST create fee slab in FeesSet
app.post('/api/fees', async (req, res) => {
  console.log('\n=== [CREATE-FEE-SLAB] NEW SLAB RECEIVED ===\n');
  try {
    jar.removeAllCookiesSync();
    const csrfToken = await getCsrfToken();
    const postData = req.body;
    const url = `${SAP_BASE_URL}/FeesSet`;
    console.log('[CREATE-FEE-SLAB] POST URL:', url);
    console.log('[CREATE-FEE-SLAB] Payload:', JSON.stringify(postData, null, 2));

    const response = await client.post(url, postData, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      }
    });

    const sapResponse = response.data.d || response.data;
    console.log('[CREATE-FEE-SLAB] Response:', JSON.stringify(sapResponse, null, 2));

    res.json({
      success: true,
      data: sapResponse,
      message: 'Fee slab created successfully'
    });
  } catch (error) {
    console.error('\n--- SAP CREATE FEE ERROR ---');
    console.error(error?.response?.data?.error?.message?.value || error?.response?.data || error.message);
    console.error('-----------------------\n');
    res.status(error?.response?.status || 500).json({ error: error?.response?.data || 'Failed to create fee slab in SAP' });
  }
});

// GET fee slabs with optional filter
app.get('/api/fees', async (req, res) => {
  try {
    jar.removeAllCookiesSync();
    const { $filter } = req.query;
    let url = `${SAP_BASE_URL}/FeesSet?$format=json`;
    if ($filter) {
      url += `&$filter=${encodeURIComponent($filter)}`;
    }
    console.log('[GET-FEES] URL:', url);
    const response = await client.get(url);
    const data = response.data.d?.results || response.data?.results || [];
    res.json(data);
  } catch (error) {
    console.error('[GET-FEES] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({ error: 'Failed to fetch fee slabs from SAP' });
  }
});

// PUT update consultant
app.put('/api/consultants/:id', upload.any(), async (req, res) => {
  console.log('\n=== [UPDATE-CONSULTANT] UPDATE RECEIVED ===\n');
  try {
    jar.removeAllCookiesSync();
    
    const { id } = req.params;
    const csrfToken = await getCsrfToken();
    
    let putData;
    try {
      putData = req.body.claimData ? JSON.parse(req.body.claimData) : req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON data' });
    }
    
    // Attach file if uploaded
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      putData.Filename = file.originalname;
      putData.Mimetype = file.mimetype;
      putData.Value = file.buffer.toString('base64');
    }
    
    const url = `${SAP_BASE_URL}/consultantSet('${id}')`;
    console.log('[UPDATE-CONSULTANT] PUT URL:', url);
    console.log('[UPDATE-CONSULTANT] Payload:', JSON.stringify(putData, null, 2));
    
    const response = await client.put(url, putData, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      }
    });
    
    const sapResponse = response.data.d || response.data;
    console.log('[UPDATE-CONSULTANT] Response:', JSON.stringify(sapResponse, null, 2));
    
    res.json({
      success: true,
      data: sapResponse,
      message: 'Consultant updated successfully'
    });
  } catch (error) {
    console.error('\n--- SAP UPDATE ERROR ---');
    console.error(error?.response?.data?.error?.message?.value || error?.response?.data || error.message);
    console.error('-----------------------\n');
    res.status(error?.response?.status || 500).json({ error: error?.response?.data || 'Failed to update consultant in SAP' });
  }
});

// POST create closure
app.post('/api/closures', upload.any(), async (req, res) => {
  console.log('\n=== [CREATE-CLOSURE] NEW CLOSURE SUBMISSION RECEIVED ===\n');
  try {
    jar.removeAllCookiesSync();
    
    const csrfToken = await getCsrfToken();
    
    let postData;
    try {
      postData = req.body.claimData ? JSON.parse(req.body.claimData) : req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON data' });
    }
    
    // Attach file if uploaded
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      postData.Filename = file.originalname;
      postData.Mimetype = file.mimetype;
      postData.Value = file.buffer.toString('base64');
    }
    
    const url = `${SAP_BASE_URL}/CLOSURESet`;
    console.log('[CREATE-CLOSURE] POST URL:', url);
    console.log('[CREATE-CLOSURE] Payload:', JSON.stringify(postData, null, 2));
    
    const response = await client.post(url, postData, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      }
    });
    
    const sapResponse = response.data.d || response.data;
    console.log('[CREATE-CLOSURE] Response:', JSON.stringify(sapResponse, null, 2));
    
    res.json({
      success: true,
      data: sapResponse,
      message: 'Closure created successfully'
    });
  } catch (error) {
    console.error('\n--- SAP CLOSURE ERROR ---');
    console.error(error?.response?.data?.error?.message?.value || error?.response?.data || error.message);
    console.error('------------------------\n');
    res.status(error?.response?.status || 500).json({ error: error?.response?.data || 'Failed to create closure in SAP' });
  }
});

// GET single closure
app.get('/api/closures/:consultantId/:closureId', async (req, res) => {
  try {
    jar.removeAllCookiesSync();
    
    const { consultantId, closureId } = req.params;
    // SAP Gateway is failing on exact key predicates, and also returning empty for multiple filters.
    // The most reliable way is to fetch all closures for the consultant and filter in memory.
    const filterStr = `ConsultantId eq '${consultantId}'`;
    const url = `${SAP_BASE_URL}/CLOSURESet?$filter=${encodeODataFilter(filterStr)}&$format=json`;
    
    console.log('[GET-CLOSURE] URL:', url);
    const response = await client.get(url);
    
    const results = response.data.d?.results || response.data?.results || [];
    const closure = results.find(c => c.ClosureId === closureId);
    
    if (closure) {
      res.json(closure);
    } else {
      res.status(404).json({ error: 'Closure not found in SAP' });
    }
  } catch (error) {
    console.error('[GET-CLOSURE] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({ error: 'Failed to fetch closure from SAP' });
  }
});

// PUT update closure
app.put('/api/closures/:consultantId/:closureId', upload.any(), async (req, res) => {
  console.log('\n=== [UPDATE-CLOSURE] UPDATE RECEIVED ===\n');
  try {
    jar.removeAllCookiesSync();
    
    const { consultantId, closureId } = req.params;
    const csrfToken = await getCsrfToken();
    
    let putData;
    try {
      putData = req.body.claimData ? JSON.parse(req.body.claimData) : req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON data' });
    }
    
    // Attach file if uploaded
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      putData.Filename = file.originalname;
      putData.Mimetype = file.mimetype;
      putData.Value = file.buffer.toString('base64');
    }
    
    // Add keys into the payload as requested by SAP backend team
    putData.ConsultantId = consultantId;
    putData.ClosureId = closureId;

    // Call /CLOSURESet via POST without key predicates in the URL
    const url = `${SAP_BASE_URL}/CLOSURESet`;
    console.log('[UPDATE-CLOSURE] POST URL (Resubmit):', url);
    console.log('[UPDATE-CLOSURE] Payload (Resubmit):', JSON.stringify(putData, null, 2));
    
    const response = await client.post(url, putData, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      }
    });
    
    const sapResponse = response.data.d || response.data;
    console.log('[UPDATE-CLOSURE] Response:', JSON.stringify(sapResponse, null, 2));
    
    res.json({
      success: true,
      data: sapResponse,
      message: 'Closure updated successfully'
    });
  } catch (error) {
    console.error('\n--- SAP CLOSURE UPDATE ERROR ---');
    console.error(error?.response?.data?.error?.message?.value || error?.response?.data || error.message);
    console.error('------------------------\n');
    res.status(error?.response?.status || 500).json({ error: error?.response?.data || 'Failed to update closure in SAP' });
  }
});

// GET agreement PDF
app.get('/api/agreements/:consultantId', async (req, res) => {
  try {
    jar.removeAllCookiesSync();
    
    const { consultantId } = req.params;
    const url = `${SAP_BASE_URL}/AgreementPdfSet(ConsultantId='${consultantId}')?$format=json`;
    
    console.log('[GET-AGREEMENT] URL:', url);
    const response = await client.get(url);
    
    const data = response.data.d || response.data;
    res.json(data);
  } catch (error) {
    console.error('[GET-AGREEMENT] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({ error: 'Failed to fetch agreement PDF from SAP' });
  }
});

// GET invoice PDF
app.get('/api/invoices/:consultantId/:invNumber', async (req, res) => {
  try {
    jar.removeAllCookiesSync();
    
    const { consultantId, invNumber } = req.params;
    const url = `${SAP_BASE_URL}/InvoicePdfSet(ConsultantId='${consultantId}',InvNumber='${invNumber}')?$format=json`;
    
    console.log('[GET-INVOICE] URL:', url);
    const response = await client.get(url);
    
    const data = response.data.d || response.data;
    res.json(data);
  } catch (error) {
    console.error('[GET-INVOICE] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({ error: 'Failed to fetch invoice PDF from SAP' });
  }
});

// GET /api/employees (Triggers EmpSet GET_ENTITYSET in SAP OData)
app.get('/api/employees', async (req, res) => {
  console.log('\n=== [GET-EMPLOYEES] GET EMPSET REQUEST RECEIVED ===\n');
  try {
    jar.removeAllCookiesSync();
    const url = `${SAP_BASE_URL}/EmpSet?$format=json`;
    console.log('[GET-EMPLOYEES] GET URL:', url);
    
    const response = await client.get(url);
    const results = response.data.d?.results || response.data?.results || [];
    console.log('[GET-EMPLOYEES] SAP Response count:', results.length);
    res.json(results);
  } catch (error) {
    console.error('[GET-EMPLOYEES] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({ error: 'Failed to fetch employee list from SAP EmpSet' });
  }
});

// STEP 1 - Request OTP: GET /LoginSet('EMP123')
app.get('/api/user/:id', async (req, res) => {
  console.log('\n=== [STEP 1: REQUEST OTP] GET /LoginSet(ID) ===\n');
  try {
    jar.removeAllCookiesSync();
    const { id } = req.params;
    const cleanId = String(id).trim();

    // Call GET /LoginSet('cleanId') in SAP
    const loginUrl = `${SAP_BASE_URL}/LoginSet('${cleanId}')?$format=json`;
    console.log('[STEP 1] GET URL:', loginUrl);

    try {
      const response = await client.get(loginUrl);
      const data = response.data.d || response.data;
      console.log('[STEP 1] SAP Response:', JSON.stringify(data, null, 2));

      // Check if SAP returned Error Type ('E') or an Error Message inside GET body
      if (data.Type === 'E' || (data.Message && /invalid|error|failed/i.test(data.Message))) {
        return res.status(400).json({ success: false, error: data.Message || 'Invalid Employee ID' });
      }

      return res.json({
        success: true,
        login_id: data.LoginId || data.login_id || cleanId,
        email: data.Email || data.email || ''
      });
    } catch (e) {
      console.warn('[STEP 1] GET /LoginSet(ID) failed:', e?.response?.data || e.message);
    }

    // Fallback: Try UserSet if entity set is UserSet
    try {
      const userUrl = `${SAP_BASE_URL}/UserSet('${cleanId}')?$format=json`;
      console.log('[STEP 1 Fallback] GET URL:', userUrl);
      const response = await client.get(userUrl);
      const data = response.data.d || response.data;
      return res.json({
        success: true,
        login_id: data.LoginId || data.emp_id || cleanId,
        email: data.Email || ''
      });
    } catch (e) {
      console.warn('[STEP 1 Fallback] GET /UserSet(ID) failed:', e?.response?.data || e.message);
    }

    return res.status(404).json({ success: false, error: 'Invalid Employee ID' });
  } catch (error) {
    console.error('[STEP 1] Error:', error?.response?.data || error.message);
    res.status(400).json({ success: false, error: 'Invalid Employee ID' });
  }
});

// POST /api/login (Triggers LoginSet create_entity in SAP OData)
app.post('/api/login', async (req, res) => {
  console.log('\n=== [LOGIN] SAP LOGINSET REQUEST RECEIVED ===\n');
  try {
    jar.removeAllCookiesSync();
    
    const { loginId, login_id, otp } = req.body;
    const cleanId = String(loginId || login_id).trim();
    const cleanOtp = String(otp || '').trim();

    if (!cleanId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    // Step 0: Check for Master Dummy OTP (123456)
    if (ALLOW_DUMMY_OTP && cleanOtp === DUMMY_OTP_CODE) {
      console.log(`[LOGIN] 🔑 Master Dummy OTP (${DUMMY_OTP_CODE}) used for Employee ID: ${cleanId}`);
      try {
        const csrfToken = await getCsrfToken();
        const verifyPostData = { LoginId: cleanId, Otp: '' };
        const verifyUrl = `${SAP_BASE_URL}/LoginSet`;

        const verifyRes = await client.post(verifyUrl, verifyPostData, {
          headers: {
            'X-CSRF-Token': csrfToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        const result = verifyRes.data.d || verifyRes.data;
        const isUserFound = Boolean((result.Role && result.Role.trim()) || (result.Name && result.Name.trim()));

        if (!isUserFound) {
          console.error(`[LOGIN Dummy OTP] Employee ID ${cleanId} NOT found in SAP database`);
          return res.status(400).json({ success: false, error: 'Invalid Employee ID' });
        }

        console.log(`[LOGIN Dummy OTP Success] ID: ${cleanId}, Name: ${result.Name}, Role: ${result.Role}`);
        return res.json({
          success: true,
          login_id: result.LoginId || cleanId,
          name: result.Name || `Employee ${cleanId}`,
          role: result.Role || 'U',
          email: result.Email || '',
          ta: result.Ta || '',
          tm: result.Tm || '',
          ld: result.Ld || '',
          od: result.Od || '',
          message: 'Login successful via Master OTP',
          ...result
        });
      } catch (err) {
        console.warn(`[LOGIN Dummy OTP Warning] SAP verification fallback for ${cleanId}:`, err?.message);
        return res.json({
          success: true,
          login_id: cleanId,
          name: `Employee ${cleanId}`,
          role: 'S',
          ta: 'X', tm: 'X', ld: 'X', od: 'X',
          message: 'Login successful via Master OTP fallback'
        });
      }
    }

    const csrfToken = await getCsrfToken();

    const postData = {
      LoginId: cleanId,
      Otp: cleanOtp
    };

    const url = `${SAP_BASE_URL}/LoginSet`;
    console.log('[LOGIN] POST URL:', url);
    console.log('[LOGIN] Payload:', JSON.stringify(postData, null, 2));

    const response = await client.post(url, postData, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const result = response.data.d || response.data;
    console.log('[LOGIN] SAP Response:', JSON.stringify(result, null, 2));

    // Step 1: Request OTP / Verify Employee ID (when OTP is empty)
    if (!cleanOtp) {
      console.log(`[LOGIN Step 1] Verifying Employee ID ${cleanId}: Role="${result.Role}", Name="${result.Name}", Type="${result.Type}", Message="${result.Message}"`);

      // Employee ID is valid ONLY IF found in zrc_user_role (Role) or pa0001 (Name)
      const isUserFound = Boolean((result.Role && result.Role.trim()) || (result.Name && result.Name.trim()));

      if (!isUserFound) {
        console.error(`[LOGIN Step 1] Employee ID ${cleanId} NOT found in SAP database (zrc_user_role / pa0001)`);
        return res.status(400).json({
          success: false,
          error: 'Invalid Employee ID'
        });
      }

      console.log(`[LOGIN Step 1] Employee ID ${cleanId} verified successfully! Name: ${result.Name}, Role: ${result.Role}`);
      return res.json({
        success: true,
        login_id: result.LoginId || cleanId,
        name: result.Name || '',
        role: result.Role || '',
        email: result.Email || '',
        ta: result.Ta || '',
        tm: result.Tm || '',
        ld: result.Ld || '',
        od: result.Od || '',
        message: 'Employee ID verified, OTP sent',
        ...result
      });
    }

    // Step 2: OTP Verification (when OTP is provided)

    if (result.Type === 'E' || (result.Message && /invalid|error|failed/i.test(result.Message))) {
      console.error(`[LOGIN] OTP validation failed: Type=${result.Type}, Message=${result.Message}`);
      return res.status(400).json({
        success: false,
        error: result.Message || 'Invalid OTP code'
      });
    }

    res.json({
      success: true,
      login_id: result.LoginId || result.login_id || cleanId,
      name: result.Name || result.Ename || `Employee ${cleanId}`,
      role: result.Role || 'USER',
      email: result.Email || '',
      ta: result.Ta || '',
      tm: result.Tm || '',
      ld: result.Ld || '',
      od: result.Od || '',
      ...result
    });
  } catch (error) {
    console.error('\n--- SAP LOGIN ERROR ---');
    const sapErr = error?.response?.data?.error?.message?.value || error?.response?.data || error.message;
    console.error(sapErr);
    console.error('-----------------------\n');
    res.status(error?.response?.status || 400).json({ 
      error: typeof sapErr === 'string' ? sapErr : 'Invalid Employee ID' 
    });
  }
});




// GET /api/roles (Triggers UserSet GET_ENTITYSET in SAP OData)
app.get('/api/roles', async (req, res) => {
  console.log('\n=== [GET-ROLES] SAP USERSET GET_ENTITYSET REQUEST RECEIVED ===\n');
  try {
    jar.removeAllCookiesSync();
    const url = `${SAP_BASE_URL}/UserSet?$format=json`;
    console.log('[GET-ROLES] GET URL:', url);

    const response = await client.get(url);
    const results = response.data.d?.results || response.data?.results || [];
    console.log('[GET-ROLES] SAP UserSet Response count:', results.length);
    res.json(results);
  } catch (error) {
    console.error('[GET-ROLES] Error fetching UserSet from SAP:', error?.response?.data || error.message);
    res.json([]);
  }
});

// POST /api/roles (Triggers UserSet create_entity in SAP OData)
app.post('/api/roles', async (req, res) => {
  console.log('\n=== [CREATE-ROLE] SAP USERSET CREATE_ENTITY REQUEST RECEIVED ===\n');
  try {
    jar.removeAllCookiesSync();
    const csrfToken = await getCsrfToken();

    const { EmpId, emp_id, Name, name, Role, role, Status, status, Del, del, Ta, Tm, Ld, Od } = req.body;
    const cleanEmpId = String(EmpId || emp_id || '').trim();
    const cleanName = String(Name || name || '').trim();
    const rawRole = String(Role || role || '').trim();
    const rawStatus = String(Status || status || Del || del || '').trim();

    // Mapping rules:
    // Role: Superadmin -> 'S', Admin / TA -> 'A'
    const roleValue = (rawRole === 'S' || rawRole.toLowerCase() === 'superadmin') ? 'S' : 'A';

    // Del (Status): Active -> '', Inactive -> 'X'
    const delValue = (rawStatus === 'X' || rawStatus.toLowerCase() === 'inactive') ? 'X' : '';

    const postData = {
      EmpId: cleanEmpId,
      Name: cleanName,
      Role: roleValue,
      Del: delValue, // SAP SEGW property name is 'Del' (not 'Status')
      Ta: Ta === 'X' || Ta === true ? 'X' : '',
      Tm: Tm === 'X' || Tm === true ? 'X' : '',
      Ld: Ld === 'X' || Ld === true ? 'X' : '',
      Od: Od === 'X' || Od === true ? 'X' : ''
    };

    const url = `${SAP_BASE_URL}/UserSet`;
    console.log('[CREATE-ROLE] POST URL:', url);
    console.log('[CREATE-ROLE] Payload:', JSON.stringify(postData, null, 2));

    const response = await client.post(url, postData, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      }
    });

    const sapResponse = response.data.d || response.data;
    console.log('[CREATE-ROLE] SAP Response:', JSON.stringify(sapResponse, null, 2));

    res.json({
      success: true,
      data: sapResponse,
      message: 'Role created successfully in SAP UserSet'
    });
  } catch (error) {
    console.error('\n--- SAP USERSET CREATE ERROR ---');
    console.error(error?.response?.data?.error?.message?.value || error?.response?.data || error.message);
    console.error('--------------------------------\n');
    res.status(error?.response?.status || 500).json({
      error: error?.response?.data || 'Failed to create role in SAP UserSet'
    });
  }
});

// GET /api/files (Triggers FileSet GET_ENTITYSET in SAP OData)
app.get('/api/files', async (req, res) => {
  console.log('\n=== [GET-FILES] SAP FILESET GET_ENTITYSET REQUEST RECEIVED ===\n');
  try {
    jar.removeAllCookiesSync();
    const url = `${SAP_BASE_URL}/FileSet?$format=json`;
    console.log('[GET-FILES] GET URL:', url);

    const response = await client.get(url);
    const results = response.data.d?.results || response.data?.results || [];
    console.log('[GET-FILES] SAP FileSet Response count:', results.length);
    res.json(results);
  } catch (error) {
    console.error('[GET-FILES] Error fetching FileSet from SAP:', error?.response?.data || error.message);
    // Fallback: try DOCUMENTSet if FileSet name differs
    try {
      const docUrl = `${SAP_BASE_URL}/DOCUMENTSet?$format=json`;
      console.log('[GET-FILES Fallback] GET URL:', docUrl);
      const docResp = await client.get(docUrl);
      const docResults = docResp.data.d?.results || docResp.data?.results || [];
      return res.json(docResults);
    } catch (err2) {
      console.error('[GET-FILES Fallback] Error fetching DOCUMENTSet:', err2.message);
      res.json([]);
    }
  }
});





// --- FEE SLAB MATRIX ENDPOINTS (FeeSet / FEESSET_UPDATE_ENTITY) ---

// GET /api/fees (Triggers FEESSET_GET_ENTITYSET in SAP OData)
app.get('/api/fees', async (req, res) => {
  const filter = req.query.$filter || '';
  console.log(`\n=== [GET-FEES] SAP FEESSET_GET_ENTITYSET REQUEST ($filter: ${filter}) ===\n`);
  try {
    jar.removeAllCookiesSync();
    // Try FeesSet first (SAP SEGW entity set name with 's'), fallback to FeeSet
    let url = `${SAP_BASE_URL}/FeesSet?$format=json`;
    if (filter) {
      url += `&$filter=${encodeURIComponent(filter)}`;
    }
    console.log('[GET-FEES] GET URL:', url);

    try {
      const response = await client.get(url);
      const results = response.data.d?.results || response.data?.results || [];
      console.log('[GET-FEES] SAP FeesSet Response count:', results.length);
      return res.json(results);
    } catch (err1) {
      console.warn('[GET-FEES] FeesSet GET failed, trying FeeSet:', err1?.message);
      let url2 = `${SAP_BASE_URL}/FeeSet?$format=json`;
      if (filter) url2 += `&$filter=${encodeURIComponent(filter)}`;
      const response2 = await client.get(url2);
      const results2 = response2.data.d?.results || response2.data?.results || [];
      return res.json(results2);
    }
  } catch (error) {
    console.warn('[GET-FEES] Error fetching FeeSet from SAP:', error?.response?.data || error.message);
    res.json([]);
  }
});

// PUT /api/fees/:consultantId (Triggers FEESSET_UPDATE_ENTITY in SAP OData)
app.put('/api/fees/:consultantId', async (req, res) => {
  const { consultantId } = req.params;
  const { slabs } = req.body;
  const cleanConsultantId = String(consultantId || '').padStart(10, '0');
  console.log(`\n=== [UPDATE-FEES] SAP FEESSET_UPDATE_ENTITY REQUEST FOR ConsultantId: ${cleanConsultantId} ===\n`);
  try {
    jar.removeAllCookiesSync();
    const csrfToken = await getCsrfToken();

    const slabList = Array.isArray(slabs) ? slabs : [];
    const updateResults = [];

    for (const slab of slabList) {
      const rawFeeId = String(slab.FeeId || slab.feeId || '').trim();
      const cleanFeeId = rawFeeId ? rawFeeId.padStart(10, '0') : '';
      
      const numFrom = parseFloat(slab.FromAmount || slab.fromAmount || 0);
      const numTo = parseFloat(slab.ToAmount || slab.toAmount || 99999999);
      const numPercent = parseFloat(slab.FeePercent || slab.FeePersent || slab.feePercent || 0);

      const fromAmount = numFrom.toFixed(2);
      const toAmount = numTo.toFixed(2);
      const feePersent = numPercent.toFixed(2);

      // Construct full exact SAP OData payload as required by ABAP backend
      const payload = {
        FeeId: cleanFeeId,
        ConsultantId: cleanConsultantId,
        FeePersent: feePersent,
        FromAmount: fromAmount,
        ToAmount: toAmount
      };

      // SAP OData URL options: try FeesSet('0000000007') first
      const primaryUrl = cleanFeeId 
        ? `${SAP_BASE_URL}/FeesSet('${cleanFeeId}')`
        : `${SAP_BASE_URL}/FeesSet(ConsultantId='${cleanConsultantId}')`;

      console.log('[UPDATE-FEES] Sending payload to SAP:', primaryUrl, JSON.stringify(payload, null, 2));

      try {
        const response = await client.put(primaryUrl, payload, {
          headers: {
            'X-CSRF-Token': csrfToken,
            'Content-Type': 'application/json'
          }
        });
        updateResults.push({ slab, status: 'SUCCESS', sapData: response.data?.d || response.data });
      } catch (err1) {
        console.warn(`[UPDATE-FEES Warning] FeesSet PUT failed (${err1?.message}), trying secondary key format...`);
        try {
          const secondaryUrl = `${SAP_BASE_URL}/FeesSet(ConsultantId='${cleanConsultantId}',FeeId='${cleanFeeId}')`;
          const response2 = await client.put(secondaryUrl, payload, {
            headers: {
              'X-CSRF-Token': csrfToken,
              'Content-Type': 'application/json'
            }
          });
          updateResults.push({ slab, status: 'SUCCESS', sapData: response2.data?.d || response2.data });
        } catch (err2) {
          console.warn(`[UPDATE-FEES Warning] Secondary format failed (${err2?.message}), trying FeeSet...`);
          try {
            const fallbackUrl = `${SAP_BASE_URL}/FeeSet('${cleanFeeId}')`;
            const response3 = await client.put(fallbackUrl, payload, {
              headers: {
                'X-CSRF-Token': csrfToken,
                'Content-Type': 'application/json'
              }
            });
            updateResults.push({ slab, status: 'SUCCESS', sapData: response3.data?.d || response3.data });
          } catch (err3) {
            console.error(`[UPDATE-FEES Error] All PUT attempts failed for FeeId ${cleanFeeId}:`, err3?.response?.data || err3?.message);
            updateResults.push({ slab, status: 'ERROR', error: err3?.response?.data?.error?.message?.value || err3?.message });
          }
        }
      }
    }

    res.json({
      success: true,
      message: `CTC Slab Matrix updated successfully in SAP FEESSET_UPDATE_ENTITY`,
      results: updateResults
    });
  } catch (error) {
    console.error('\n--- SAP FEESSET_UPDATE_ENTITY ERROR ---');
    console.error(error?.response?.data || error.message);
    console.error('---------------------------------------\n');
    res.status(error?.response?.status || 500).json({
      error: error?.response?.data?.error?.message?.value || error?.response?.data || 'Failed to update fee slabs in SAP FeeSet'
    });
  }
});

// POST /api/files (Triggers FileSet CREATE_ENTITY in SAP OData)
app.post('/api/files', async (req, res) => {
  console.log('\n=== [UPLOAD-FILE] SAP FILESET CREATE_ENTITY REQUEST RECEIVED ===\n');
  try {
    jar.removeAllCookiesSync();
    const csrfToken = await getCsrfToken();

    const { filename, Filename, value, Value, mimetype, Mimetype, consultantId, ConsultantId } = req.body;
    const cleanFilename = String(Filename || filename || '').trim();
    let cleanValue = String(Value || value || '').trim();
    // Strip Data URI prefix (e.g. data:application/pdf;base64,) if present
    cleanValue = cleanValue.replace(/^data:.*?;base64,/, '');
    // Remove all line breaks, carriage returns, and whitespace
    cleanValue = cleanValue.replace(/[\r\n\s]/g, '');

    const cleanMimetype = String(Mimetype || mimetype || 'application/pdf').trim();
    const cleanConsultantId = String(ConsultantId || consultantId || '').trim();

    // Validation: Filename character limit <= 40
    if (!cleanFilename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    if (cleanFilename.length > 40) {
      return res.status(400).json({ error: `Filename character length must not exceed 40 characters (current length: ${cleanFilename.length})` });
    }

    const postData = {
      Filename: cleanFilename,
      Value: cleanValue,
      Mimetype: cleanMimetype
    };

    const url = `${SAP_BASE_URL}/FileSet`;
    console.log('[UPLOAD-FILE] POST URL:', url);
    console.log('[UPLOAD-FILE] Filename:', cleanFilename, '| Mimetype:', cleanMimetype, '| Length:', cleanFilename.length);

    const response = await client.post(url, postData, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      }
    });

    const sapResponse = response.data.d || response.data;
    console.log('[UPLOAD-FILE] SAP Response:', JSON.stringify(sapResponse, null, 2));

    res.json({
      success: true,
      data: sapResponse,
      message: 'File uploaded successfully to SAP FileSet (FILESET_CREATE_ENTITY)'
    });
  } catch (error) {
    console.error('\n--- SAP FILESET CREATE_ENTITY ERROR ---');
    console.error(error?.response?.data || error.message);
    console.error('---------------------------------------\n');
    res.status(error?.response?.status || 500).json({
      error: error?.response?.data?.error?.message?.value || error?.response?.data || 'Failed to upload file to SAP FileSet'
    });
  }
});

// DELETE /api/files/:fileNo (Triggers FILESET_DELETE_ENTITY in SAP OData)
app.delete('/api/files/:fileNo', async (req, res) => {
  const { fileNo } = req.params;
  console.log(`\n=== [DELETE-FILE] SAP FILESET_DELETE_ENTITY REQUEST FOR FileNo: ${fileNo} ===\n`);
  try {
    jar.removeAllCookiesSync();
    const csrfToken = await getCsrfToken();

    const url = `${SAP_BASE_URL}/FileSet(FileNo='${encodeURIComponent(fileNo)}')`;
    console.log('[DELETE-FILE] DELETE URL:', url);

    const response = await client.delete(url, {
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    console.log(`[DELETE-FILE] FileNo ${fileNo} deleted successfully from SAP FileSet.`);
    res.json({ success: true, message: `File ${fileNo} deleted successfully from SAP FileSet` });
  } catch (error) {
    console.error('\n--- SAP FILESET_DELETE_ENTITY ERROR ---');
    console.error(error?.response?.data || error.message);
    console.error('---------------------------------------\n');
    res.status(error?.response?.status || 500).json({
      error: error?.response?.data?.error?.message?.value || error?.response?.data || `Failed to delete file ${fileNo} from SAP`
    });
  }
});

// POST /api/files/batch-delete (Bulk deletion for multiple FileNos)
app.post('/api/files/batch-delete', async (req, res) => {
  const { fileNos } = req.body;
  if (!Array.isArray(fileNos) || fileNos.length === 0) {
    return res.status(400).json({ error: 'fileNos array is required for bulk deletion' });
  }

  console.log(`\n=== [BULK-DELETE-FILES] SAP FILESET_DELETE_ENTITY FOR ${fileNos.length} FILES ===\n`);
  try {
    jar.removeAllCookiesSync();
    const csrfToken = await getCsrfToken();

    const results = [];
    for (const fileNo of fileNos) {
      try {
        const url = `${SAP_BASE_URL}/FileSet(FileNo='${encodeURIComponent(fileNo)}')`;
        console.log('[BULK-DELETE-FILES] Deleting:', url);
        await client.delete(url, {
          headers: {
            'X-CSRF-Token': csrfToken
          }
        });
        results.push({ fileNo, status: 'SUCCESS' });
      } catch (err) {
        console.error(`[BULK-DELETE-FILES] Error deleting FileNo ${fileNo}:`, err?.response?.data || err.message);
        results.push({ fileNo, status: 'FAILED', error: err?.response?.data?.error?.message?.value || err.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('[BULK-DELETE-FILES] Server error:', error);
    res.status(500).json({ error: 'Bulk deletion failed' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'RC Portal Backend is running' });
});

// Debug paths endpoint
app.get('/api/debug-paths', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const targetDir = path.join(__dirname, '../dist');
    const dirExists = fs.existsSync(targetDir);
    let files = [];
    if (dirExists) {
      files = fs.readdirSync(targetDir);
    }
    res.json({
      cwd: process.cwd(),
      dirname: __dirname,
      targetDir,
      dirExists,
      files
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Serve Static Files & SPA Routing Fallback ---
// Serve static frontend files from Vite build 'dist' directory sitting next to backend
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback middleware for Single Page Application (SPA) routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// --- Start Server (local dev) or export for Lambda ---
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  // Running on Lambda — export the app (lambda.js handles the rest)
  module.exports = app;
} else {
  // Running locally with `node server.js`
  app.listen(port, () => {
    console.log(`\n✓ RC Portal Backend listening on port ${port}`);
    console.log(`✓ SAP Base URL: ${SAP_BASE_URL}`);
    console.log(`✓ CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`\nAPI Endpoints available:`);
    console.log(`  POST   /api/login (SAP LoginSet)`);
    console.log(`  GET    /api/consultants`);
    console.log(`  GET    /api/consultants/:id`);
    console.log(`  GET    /api/consultants/:id/detail`);
    console.log(`  POST   /api/consultants`);
    console.log(`  PUT    /api/consultants/:id`);
    console.log(`  GET    /api/closures/:consultantId/:closureId`);
    console.log(`  POST   /api/closures`);
    console.log(`  PUT    /api/closures/:consultantId/:closureId`);
    console.log(`  GET    /api/agreements/:consultantId`);
    console.log(`  GET    /api/invoices/:consultantId/:invNumber`);
    console.log(`  GET    /api/health\n`);
  });
}


