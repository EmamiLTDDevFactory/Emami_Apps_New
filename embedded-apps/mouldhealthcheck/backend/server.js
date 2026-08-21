require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const { pool: pgPool, testConnection: testPgConnection } = require('./db');

const app = express();

// =========================================================
// 1. CRITICAL: CORS CONFIGURATION
// This allows your frontend (webapp2) to pull data from webapp1
// =========================================================
app.use(cors({
    //origin: 'https://emdcindpwebapp2-atd7bmfdcmbzf0hh.centralindia-01.azurewebsites.net',
    //origin: 'http://localhost:8081', // Allow requests from localhost:8081 for development
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true // Required if passing cookies/tokens across origins
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/*
   COOKIE JAR
*/
const jar = new CookieJar();

/*
   AXIOS CLIENT
   Configured specifically to force SAP to accept API calls
*/
const client = wrapper(
    axios.create({
        jar,
        params: {
            // CRITICAL: Forces SAP to use client 100
            'sap-client': '100',
            // Prevents SAP from trying to redirect to SAML SSO web logins
            'saml2': 'disabled'
        },
        headers: {
            // CRITICAL: Tells SAP this is an API, do not send HTML login pages
            'X-Requested-With': 'XMLHttpRequest',
            'DataServiceVersion': '2.0',
            'Accept': 'application/json'
        }
    })
);

/*
   AXIOS INTERCEPTOR (FOR DEBUGGING)
   This will print the exact headers going to SAP in your terminal
*/
client.interceptors.request.use(request => {
    console.log('\n--- SENDING TO SAP ---');
    console.log('URL:', request.url);
    console.log('HEADERS:', JSON.stringify(request.headers, null, 2));
    return request;
});

/*
   SAP CONFIG
*/
// const SAP_BASE_URL = 'https://emdcindpwebapp1-bag2gfhjd9d4gkh6.centralindia-01.azurewebsites.net/api/users/';
// const SAP_BASE_URL = 'https://emsygydev.emami.local:4430/sap/opu/odata/sap/ZMM_MOULD_CARE_SRV';
// const SAP_BASE_URL = 'https://emdcindpwebapp1-bag2gfhjd9d4gkh6.centralindia-01.azurewebsites.net/api/users';
// const SAP_BASE_URL = 'http://localhost:3001/ZMM_MOULD_CARE_SRV';
//const SAP_BASE_URL = 'https://emamiapi.emamigroup.com/api/NGD/ZMM_MOULD_CARE_SRV';
const SAP_BASE_URL = 'https://emdcindpwebapp1-bag2gfhjd9d4gkh6.centralindia-01.azurewebsites.net/api/NWP/ZMM_MOULD_CARE_SRV' //Production Link
// const SAP_BASE_URL = 'https://emdcindpwebapp1-bag2gfhjd9d4gkh6.centralindia-01.azurewebsites.net/api/NWQ/ZMM_MOULD_CARE_SRV' //Quality Link
///const SAP_BASE_URL = 'https://emdcindpwebapp1-bag2gfhjd9d4gkh6.centralindia-01.azurewebsites.net/api/NGD/ZMM_MOULD_CARE_SRV'; //Development Link
/*
   OAUTH CONFIG & TOKEN MANAGER
*/
const OAUTH_URL = 'https://login.microsoftonline.com/d016aebd-1f96-4dd1-a22b-eeb0201fb61e/oauth2/token?sap-client=100';
const CLIENT_ID = '6225aa6f-d228-4127-8f88-81b08e2aca69';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const SCOPE = 'api://6225aa6f-d228-4127-8f88-81b08e2aca69/Sap.Odata.Access';

let cachedToken = null;
let tokenExpiration = null;

// Helper function to get or refresh the OAuth token
async function getAccessToken() {
    // If we have a valid token that hasn't expired, return it
    if (cachedToken && tokenExpiration && Date.now() < tokenExpiration) {
        return cachedToken;
    }

    try {
        console.log('\nFetching new OAuth Access Token from Microsoft...');
        const payload = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            scope: SCOPE
        });

        const response = await axios.post(OAUTH_URL, payload.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        cachedToken = response.data.access_token;
        // Calculate expiration time (buffer by 5 minutes to prevent edge-case failures)
        const expiresInSeconds = response.data.expires_in || 3599;
        tokenExpiration = Date.now() + (expiresInSeconds - 300) * 1000;

        console.log('Microsoft Token Fetched Successfully.');
        return cachedToken;
    } catch (error) {
        console.error('Failed to fetch OAuth Token:', error.response?.data || error.message);
        throw new Error('OAuth authentication failed');
    }
}

/*
   REGISTER API
*/
// apiRouter.post('/register', async (req, res) => {
//     try {
//         console.log('STEP 1 -> FETCH TOKEN');
//         const accessToken = await getAccessToken();

//         /*
//            GET CSRF TOKEN
//         */
//         const tokenResponse = await client.get(
//             `${SAP_BASE_URL}/sap/opu/odata/sap/ZMM_MOULD_CARE_SRV/`,
//             {
//                 headers: {
//                     'X-CSRF-Token': 'Fetch',
//                     'Authorization': `Bearer ${accessToken}`
//                 }
//             }
//         );

//         /*
//            TOKEN
//         */
//         const csrfToken = tokenResponse.headers['x-csrf-token'];

//         console.log('CSRF TOKEN:', csrfToken);
//         console.log('STEP 2 -> POST TO SAP');

//         /*
//            POST TO SAP
//         */
//         const sapResponse = await client.post(
//             `${SAP_BASE_URL}/sap/opu/odata/sap/ZMM_MOULD_CARE_SRV/MouldUser001Set`,
//             req.body,
//             {
//                 headers: {
//                     'X-CSRF-Token': csrfToken,
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${accessToken}`
//                 }
//             }
//         );

//         console.log('SUCCESS');

//         res.json({
//             success: true,
//             data: sapResponse.data
//         });

//     } catch (error) {
//         console.log('===== ERROR =====');
//         const sapErrorDetail = error.response?.data?.error?.message?.value || error.response?.data || error.message;
//         console.log(sapErrorDetail);

//         res.status(500).json({
//             success: false,
//             error: sapErrorDetail
//         });
//     }
// });

const apiRouter = express.Router();
app.use('/', apiRouter);
app.use('/api/NGD', apiRouter);
app.use('/api/users', apiRouter);

/*
   EMAMIAPPS HUB LOGIN — Microsoft Entra ID via OAuth2/OIDC Authorization Code flow.
   Unrelated to mouldhealthcheck itself; co-hosted here only because this App Service is an
   existing, working Azure deployment — the EmamiApps hub's own AWS Lambda Function URL was
   blocked by an unresolved AWS-account-level access issue, so this sidesteps it entirely.
   Deliberately reuses the SAME app registration as the SAP client-credentials flow above
   (CLIENT_ID/CLIENT_SECRET) rather than a dedicated one — that was a conscious choice, not an
   oversight, since it's the app registration Infra already had configured for this purpose.
   The v2.0 endpoints + openid/profile/email scope used here are a different OAuth surface on
   that SAME app registration from the v1 client-credentials flow above; both coexist fine.
*/
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const crypto = require('crypto');

const HUB_TENANT_ID = 'd016aebd-1f96-4dd1-a22b-eeb0201fb61e';
const HUB_AUTHORIZE_URL = `https://login.microsoftonline.com/${HUB_TENANT_ID}/oauth2/v2.0/authorize`;
const HUB_TOKEN_URL = `https://login.microsoftonline.com/${HUB_TENANT_ID}/oauth2/v2.0/token`;
const HUB_ISSUER = `https://login.microsoftonline.com/${HUB_TENANT_ID}/v2.0`;
const HUB_SCOPE = 'openid profile email offline_access';
const HUB_ALLOWED_EMAIL_DOMAIN = (process.env.HUB_AUTH_EMAIL_DOMAIN || 'emamigroup.com').trim().toLowerCase();
const HUB_JWT_SECRET = process.env.HUB_AUTH_JWT_SECRET || '';
const HUB_FRONTEND_REDIRECT_URL = process.env.HUB_AUTH_FRONTEND_URL || 'https://www.emamiapps.in';

if (!HUB_JWT_SECRET) {
    console.warn('[hub-auth] HUB_AUTH_JWT_SECRET is not set — hub login will fail at the callback step. Set it in this App Service\'s environment settings.');
}

const hubJwks = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${HUB_TENANT_ID}/discovery/v2.0/keys`,
    cache: true,
    cacheMaxAge: 12 * 60 * 60 * 1000,
});

/** Fetches Microsoft's current signing key by `kid` — this is what actually proves the ID token came from Microsoft, not just whoever POSTed it. */
function getHubSigningKey(header, callback) {
    hubJwks.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        callback(null, key.getPublicKey());
    });
}

function verifyHubIdToken(idToken) {
    return new Promise((resolve, reject) => {
        jwt.verify(idToken, getHubSigningKey, {
            algorithms: ['RS256'],
            audience: CLIENT_ID,
            issuer: HUB_ISSUER,
        }, (err, decoded) => {
            if (err) return reject(err);
            resolve(decoded);
        });
    });
}

// CSRF/replay guard for the OAuth redirect — single-instance in-memory store is fine here (an App
// Service restart just means any in-flight login attempt has to restart too, same tradeoff the
// EmamiApps hub's own rate limiter already accepted for the same reason).
const hubAuthStates = new Map();
const HUB_STATE_TTL_MS = 10 * 60 * 1000;
function issueHubState() {
    const state = crypto.randomBytes(16).toString('hex');
    hubAuthStates.set(state, Date.now() + HUB_STATE_TTL_MS);
    return state;
}
function consumeHubState(state) {
    const expiry = hubAuthStates.get(state);
    hubAuthStates.delete(state);
    return !!expiry && Date.now() < expiry;
}

/** Built per-request so it always matches whatever host actually served the request (this App Service's real domain), not a hardcoded guess. */
function getHubRedirectUri(req) {
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0];
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${proto}://${host}/hub-auth/callback`;
}

/** Step 1 — redirect the browser to Microsoft to sign in. */
apiRouter.get('/hub-auth/login', (req, res) => {
    const state = issueHubState();
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: getHubRedirectUri(req),
        response_mode: 'query',
        scope: HUB_SCOPE,
        state,
    });
    res.redirect(`${HUB_AUTHORIZE_URL}?${params.toString()}`);
});

/** Step 2 — Microsoft redirects back here with a code. Exchange it, verify the ID token's signature, then bounce the browser to the frontend with a session token (or an error code) in the query string. */
apiRouter.get('/hub-auth/callback', async (req, res) => {
    const { code, state, error: oauthError } = req.query;
    if (oauthError || !code || !state || !consumeHubState(String(state))) {
        return res.redirect(`${HUB_FRONTEND_REDIRECT_URL}/?ssoError=invalid_response`);
    }
    if (!HUB_JWT_SECRET) {
        return res.redirect(`${HUB_FRONTEND_REDIRECT_URL}/?ssoError=not_configured`);
    }
    try {
        const tokenRes = await axios.post(HUB_TOKEN_URL, new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: String(code),
            redirect_uri: getHubRedirectUri(req),
            scope: HUB_SCOPE,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const idToken = tokenRes.data?.id_token;
        if (!idToken) throw new Error('Token response had no id_token');

        const claims = await verifyHubIdToken(idToken);
        const email = String(claims.email || claims.preferred_username || claims.upn || '').trim().toLowerCase();
        if (!email || !email.endsWith(`@${HUB_ALLOWED_EMAIL_DOMAIN}`)) {
            return res.redirect(`${HUB_FRONTEND_REDIRECT_URL}/?ssoError=domain_not_allowed`);
        }

        const sessionToken = jwt.sign({ email }, HUB_JWT_SECRET, { expiresIn: '12h' });
        return res.redirect(`${HUB_FRONTEND_REDIRECT_URL}/?ssoToken=${encodeURIComponent(sessionToken)}`);
    } catch (err) {
        console.error('[hub-auth] callback failed:', err.response?.data || err.message);
        return res.redirect(`${HUB_FRONTEND_REDIRECT_URL}/?ssoError=invalid_response`);
    }
});

/** Step 3 — the frontend exchanges the token it got back for confirmation before flipping into the logged-in state. */
apiRouter.post('/hub-auth/session/verify', (req, res) => {
    const token = String(req.body?.token || '').trim();
    if (!token || !HUB_JWT_SECRET) {
        return res.status(400).json({ success: false, error: 'Invalid session.' });
    }
    try {
        const payload = jwt.verify(token, HUB_JWT_SECRET);
        if (!payload?.email || !String(payload.email).endsWith(`@${HUB_ALLOWED_EMAIL_DOMAIN}`)) {
            return res.status(401).json({ success: false, error: 'Invalid session.' });
        }
        return res.json({ success: true, email: payload.email });
    } catch {
        return res.status(401).json({ success: false, error: 'Invalid or expired session.' });
    }
});

apiRouter.get("/admin/log", async (req, res) => {

    try {

        const accessToken = await getAccessToken();
        const { Email } = req.query;

        if (!Email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        // SINGLE ODATA API

        const url =
            `${SAP_BASE_URL}/ZMouldLogSet?$filter=ReviewedBy eq '${Email}' or ApprovedBy eq '${Email}'&$format=json`;

        console.log(url)

        const response = await client.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        //console.log(response);
        const results =
            response.data?.d?.results || [];
        console.log(results);
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No dropdown data found",
            });
        }

        const mouldreport = results.map((item) => ({
            LIFNR: item.Lifnr,
            MATNR: item.Matnr,
            MAKTX: item.Maktx,
            ZSTAT: item.Zstat,
            REV_FLAG: item.RevStat,
            APRV_FLAG: item.AprvStat,
            APPROVED_ON: item.ApprovedOn,
            APPROVED_BY: item.ApprovedBy,
            REVIEWED_ON: item.ReviewedOn,
            REVIEWED_BY: item.ReviewedBy,
            SUBDATE: item.ZsubDate,
        }));

        console.log(mouldreport);
        return res.json({
            success: true,
            mouldreport,
        });

    } catch (error) {

        console.log(
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

apiRouter.get("/vendor/log", async (req, res) => {

    try {

        const accessToken = await getAccessToken();
        const { Lifnr } = req.query;

        if (!Lifnr) {
            return res.status(400).json({
                success: false,
                message: "Vendor ID is required",
            });
        }

        // SINGLE ODATA API

        const url =
            `${SAP_BASE_URL}/ZMouldLogSet?$filter=Lifnr eq '${Lifnr}'&$format=json`;

        console.log(url)

        const response = await client.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        //console.log(response);
        const results =
            response.data?.d?.results || [];
        console.log(results);
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No dropdown data found",
            });
        }

        const mouldreport = results.map((item) => ({
            LIFNR: item.Lifnr,
            MATNR: item.Matnr,
            MAKTX: item.Maktx,
            ZSTAT: item.Zstat,
            REV_FLAG: item.RevStat,
            APRV_FLAG: item.AprvStat,
            APPROVED_ON: item.ApprovedOn,
            APPROVED_BY: item.ApprovedBy,
            REVIEWED_ON: item.ReviewedOn,
            REVIEWED_BY: item.ReviewedBy,
            SUBDATE: item.ZsubDate,
        }));

        console.log(mouldreport);
        return res.json({
            success: true,
            mouldreport,
        });

    } catch (error) {

        console.log(
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

apiRouter.get("/admin/reports", async (req, res) => {

    try {

        const accessToken = await getAccessToken();
        const { Email } = req.query;

        if (!Email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        // SINGLE ODATA API

        const url =
            `${SAP_BASE_URL}/ZmouldDataReportSet?$filter=Email eq '${Email}'&$format=json`;

        console.log(url)

        const response = await client.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        //console.log(response);
        const results =
            response.data?.d?.results || [];
        console.log(results);
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No dropdown data found",
            });
        }

        const mouldreport = results.map((item) => ({
            LIFNR: item.Lifnr,
            MATNR: item.Matnr,
            MAKTX: item.Maktx,
            COMPLETED_FLAG: item.CompletedFlag,
            DRAFT_FLAG: item.DraftFlag,
            CREATED_ON: item.CreatedOn,
            CREATED_BY: item.CreatedBy,
            CHANGED_ON: item.ChangedOn,
            CHANGED_BY: item.ChangedBy,
            SUBDATE: item.ZsubDate,
            CRITICALITY: item.Zcriticality
        }));

        console.log('Report', mouldreport);
        return res.json({
            success: true,
            mouldreport,
        });

    } catch (error) {

        console.log(
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

apiRouter.post('/approve', async (req, res) => {

    try {
        console.log('STEP 1 -> FETCH TOKEN');
        const accessToken = await getAccessToken();

        /*
           GET CSRF TOKEN & COOKIES
        */
        const tokenResponse = await client.get(
            `${SAP_BASE_URL}/ZMouldLogSet`,
            {
                headers: {
                    'X-CSRF-Token': 'Fetch',
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        /*
           TOKEN & COOKIES
        */
        const csrfToken = tokenResponse.headers['x-csrf-token'];
        const cookies = tokenResponse.headers['set-cookie']; // CRITICAL: Extract SAP Session Cookie

        console.log('CSRF TOKEN:', csrfToken);
        console.log('STEP 2 -> FORMAT DEEP ENTITY DATA & POST TO SAP');

        // Extract the payload sent from your React Native app
        const { Lifnr, Matnr, Zstat, Zdate, Ztime, ApprovedBy, ApprovedOn, CreatedBy, CreatedOn, RevStat, AprvStat, ReviewedBy, ReviewedOn, Zsubdate } = req.body;

        // if (!ZmouldItemSet || !Array.isArray(ZmouldItemSet)) {
        //     return res.status(400).json({
        //         success: false,
        //         error: "Invalid payload format. actionMatrix array required."
        //     });
        // }

        // Formatting Date for SAP OData V2 (e.g., "/Date(1623849123000)/")
        const currentDate = new Date();
        const sapDateString = `\/Date(${currentDate.getTime()})\/`;

        /*
           CONSTRUCT DEEP ENTITY PAYLOAD
           One Header Object containing an array of Items
        */
        const sapPayload = {
            // ================= HEADER DETAILS =================
            Lifnr: Lifnr,
            Matnr: Matnr,
            Zstat: Zstat,
            Zdate: Zdate,
            Ztime: Ztime,
            ApprovedBy: ApprovedBy,
            ApprovedOn: ApprovedOn,
            ReviewedBy: ReviewedBy,
            ReviewedOn: ReviewedOn,
            RevStat: RevStat,
            AprvStat: AprvStat,
            Zsubdate: Zsubdate,
        };

        /*
           SINGLE POST TO SAP HEADER SET
        */
        const sapResponse = await client.post(
            `${SAP_BASE_URL}/ZMouldLogSet`,
            sapPayload,
            {
                headers: {
                    'X-CSRF-Token': csrfToken,
                    'Cookie': cookies, // Pass the session cookie here
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        console.log('SUCCESS: DEEP INSERT COMPLETED');

        res.json({
            success: true,
            message: "Action matrix successfully saved to SAP!",
            data: sapResponse.data
        });

    } catch (error) {

        console.log('===== ERROR =====');

        console.log(error.message);

        // Dig deeper into SAP's specific OData error message format
        const sapErrorDetail = error.response?.data?.error?.message?.value || error.response?.data;
        console.log(sapErrorDetail);

        res.status(500).json({
            success: false,
            error: sapErrorDetail || error.message
        });
    }
});

// Call SAP LoginSet to Verify OTP (Using POST)
apiRouter.post('/api/verify-otp', async (req, res) => {
    try {
        console.log('STEP 1 -> FETCH TOKEN');
        const accessToken = await getAccessToken();

        /*
           GET CSRF TOKEN & COOKIES
        */
        const tokenResponse = await client.get(
            `${SAP_BASE_URL}/ZmouldLoginSet`,
            {
                headers: {
                    'X-CSRF-Token': 'Fetch',
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        /*
           TOKEN & COOKIES
        */
        const csrfToken = tokenResponse.headers['x-csrf-token'];
        const cookies = tokenResponse.headers['set-cookie']; // CRITICAL: Extract SAP Session Cookie

        console.log('CSRF TOKEN:', csrfToken);
        console.log('STEP 2 -> FORMAT DEEP ENTITY DATA & POST TO SAP');

        const { Otp, Email } = req.body;

        if (!Email || !Otp) {
            return res.status(400).json({
                success: false,
                error: "Invalid payload format. Email and OTP are required."
            });
        }

        // Construct the verification payload using Email
        const payload = {
            Otp: Otp,
            Email: Email || "",
        };
        // POST to LoginSet for verification
        const response = await client.post(`${SAP_BASE_URL}/ZmouldLoginSet`, payload, {
            headers: {
                'X-CSRF-Token': csrfToken,
                'Cookie': cookies, // Pass the session cookie here
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const sapResponse = response.data?.d || response.data || {};
        const sapRole = mapSapRole(sapResponse.Role || sapResponse.role);
        const autoRole = normalizeRole(await detectUserRole(Email));
        const detectedRole = sapRole || autoRole;

        console.log(`[AUTH] SAP role for ${Email}: ${sapResponse.Role || sapResponse.role}`);
        console.log(`[AUTH] Detected role for ${Email}: ${detectedRole}`);

        const sapErrorType = (sapResponse.Type || sapResponse.type || '').toString().toUpperCase();
        const sapMessage = sapResponse.Message || sapResponse.message || '';

        if (sapErrorType === 'E') {
            return res.status(401).json({
                error: sapMessage || 'Invalid OTP',
                role: detectedRole,
                roleSource: sapRole ? 'sap' : (ENABLE_ROLE_AUTO_DETECTION ? 'auto-detect' : 'fallback'),
                sapResponse,
            });
        }

        res.json({
            ...sapResponse,
            role: detectedRole,
            roleSource: sapRole ? 'sap' : (ENABLE_ROLE_AUTO_DETECTION ? 'auto-detect' : 'fallback')
        });
    } catch (error) {
        console.error('Error in POST /api/verify-otp:', error?.response?.data || error.message);
        res.status(500).json({ error: 'Failed to verify OTP in SAP' });
    }
});

apiRouter.get('/login', async (req, res) => {
    try {
        const { Email } = req.query;

        if (!Email) {
            return res.status(400).json({
                success: false,
                message: 'Missing parameters'
            });
        }

        const accessToken = await getAccessToken();
        console.log("Access Token:", accessToken);
        console.log("Email:", Email)
        //console.log(url);
        //const url = `${SAP_BASE_URL}/ZmouldLoginSet?$filter=Email eq '${Email}'&$format=json`;

        const url = `${SAP_BASE_URL}/ZmouldLoginSet(Email='${Email}')?$format=json`;
        console.log(url);
        const response = await client.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const users = response.data?.d?.results || [];

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];
        console.log("Login success:", user);

        return res.json({
            success: true,
            user
        });

    } catch (error) {
        const sapErrorDetail = error.response?.data?.error?.message?.value || error.response?.data || error.message;
        console.log(sapErrorDetail);
        return res.status(500).json({
            success: false,
            error: sapErrorDetail
        });
    }
});

apiRouter.get("/dashboard", async (req, res) => {
    try {
        const { SMTP_ADDR } = req.query;

        console.log("Received dashboard request for:", SMTP_ADDR);
        if (!SMTP_ADDR) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const accessToken = await getAccessToken();
        const url = `${SAP_BASE_URL}/ZMouldDetailsSet?$filter=SmtpAddr eq '${SMTP_ADDR}'&$format=json`;

        const response = await client.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
        });

        const results = response.data?.d?.results || [];

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No dashboard data found",
            });
        }

        // Vendor Details from First Record
        const vendor = {
            vendorCode: results[0].Lifnr,
            vendorName: results[0].Name1,
            email: results[0].SmtpAddr,
            matnr: results[0].Matnr,
        };

        const materials = results.map((item) => ({
            materialCode: item.Matnr,
            materialDescription: item.Maktx,
            componentPart: item.ZzcompPart,
            runnerType: item.Zzrunner,
            granulesGrade: item.Zzgran,
            machineCode: item.Zzmach,
            cavity: item.ZzcavityNo,
            runningCavity: item.ZzrunCavity,
            cycleTime: item.ZzcycTime,
            efficiency: item.ZzfacProd,
            hoursPerDay: item.ZzhoursDay,
            designCode: item.ZzmdsCode,
            mouldLife: item.ZzmoldLife,
            mouldShots: item.ZzmoldShots,
            planningCode: item.ZzplanCode,
            fgDesignCode: item.ZzfgCode,
        }));

        return res.json({
            success: true,
            vendor,
            materials,
        });

    } catch (error) {
        const sapErrorDetail = error.response?.data?.error?.message?.value || error.response?.data || error.message;
        console.log(sapErrorDetail);
        return res.status(500).json({
            success: false,
            error: sapErrorDetail,
        });
    }
});

apiRouter.get("/dropdown", async (req, res) => {
    try {
        const { ZmouldCatId, ZmouldHeadId } = req.query;

        if (!ZmouldCatId || !ZmouldHeadId) {
            return res.status(400).json({
                success: false,
                message: "Mould Category ID and Mould Header ID are required",
            });
        }

        const accessToken = await getAccessToken();
        const url = `${SAP_BASE_URL}/ZMouldDropDownSet?$filter=ZmouldCatId eq '${ZmouldCatId}' and ZmouldHeadId eq '${ZmouldHeadId}'&$format=json`;

        const response = await client.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
        });

        const results = response.data?.d?.results || [];

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No dropdown data found",
            });
        }

        const dropdowns = results.map((item) => ({
            Zmouldfield: item.ZmouldField,
        }));

        return res.json({
            success: true,
            dropdowns,
        });

    } catch (error) {
        const sapErrorDetail = error.response?.data?.error?.message?.value || error.response?.data || error.message;
        console.log(sapErrorDetail);
        return res.status(500).json({
            success: false,
            error: sapErrorDetail,
        });
    }
});

apiRouter.get("/headerdropdown", async (req, res) => {
    try {
        const { ZmouldCatId, ZmouldHeadId } = req.query;

        if (!ZmouldCatId || !ZmouldHeadId) {
            return res.status(400).json({
                success: false,
                message: "Mould Category ID and Mould Header ID are required",
            });
        }

        const accessToken = await getAccessToken();
        const url = `${SAP_BASE_URL}/ZMouldHeaderSet?$filter=ZmouldCatId eq '${ZmouldCatId}' and ZmouldHeadId eq '${ZmouldHeadId}'&$format=json`;

        const response = await client.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
        });

        const results = response.data?.d?.results || [];
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No dropdown data found",
            });
        }

        const dropdowns = results.map((item) => ({
            Zmouldfield: item.ZmouldField,
            Zroute: item.Zroute
        }));

        return res.json({
            success: true,
            dropdowns,
        });

    } catch (error) {
        const sapErrorDetail = error.response?.data?.error?.message?.value || error.response?.data || error.message;
        console.log(sapErrorDetail);
        return res.status(500).json({
            success: false,
            error: sapErrorDetail,
        });
    }
});

/*
   SUBMIT API
*/
apiRouter.post('/submit', async (req, res) => {
    try {
        console.log('STEP 1 -> FETCH TOKEN');
        const accessToken = await getAccessToken();

        /*
           GET CSRF TOKEN & COOKIES
        */
        const tokenResponse = await client.get(
            `${SAP_BASE_URL}/ZMouldDataHeaderSet`,
            {
                headers: {
                    'X-CSRF-Token': 'Fetch',
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        /*
           TOKEN & COOKIES
        */
        const csrfToken = tokenResponse.headers['x-csrf-token'];
        const cookies = tokenResponse.headers['set-cookie']; // CRITICAL: Extract SAP Session Cookie

        console.log('CSRF TOKEN:', csrfToken);
        console.log('STEP 2 -> FORMAT DEEP ENTITY DATA & POST TO SAP');

        const { Lifnr, Name1, ZsubDate, CreatedBy, CreatedOn, ChangedBy, ChangedOn, DraftFlag, CompletedFlag, Zcriticality, Matnr, ZmouldItemSet } = req.body;

        if (!ZmouldItemSet || !Array.isArray(ZmouldItemSet)) {
            return res.status(400).json({
                success: false,
                error: "Invalid payload format. actionMatrix array required."
            });
        }

        /*
           EXTRACT ATTACHMENTS (Base64)
           TODO: Forward to SAP once the SAP OData Attachment Endpoint is provided.
        */
        const attachments = [];
        ZmouldItemSet.forEach(row => {
            if (row.Attachments && row.Attachments.length > 0) {
                attachments.push({
                    taskId: row.ZmouldColId,
                    files: row.Attachments
                });
            }
        });
        if (attachments.length > 0) {
            console.log(`[ATTACHMENTS] Received ${attachments.length} task(s) with file attachments!`);
            // Example: attachments[0].files[0].base64 contains the file data
        }

        /*
           CONSTRUCT DEEP ENTITY PAYLOAD
        */
        const sapPayload = {
            Lifnr: Lifnr,
            Name1: (Name1 || "").substring(0, 30),
            ZsubDate: ZsubDate,
            CreatedBy: (CreatedBy || "").substring(0, 10),
            CreatedOn: CreatedOn,
            ChangedBy: ChangedBy,
            ChangedOn: ChangedOn,
            DraftFlag: DraftFlag,
            CompletedFlag: CompletedFlag,
            Zcriticality: (Zcriticality || " ").substring(0, 10),
            Matnr: Matnr,
            ZmouldItemSet: ZmouldItemSet.map((row) => ({
                Lifnr: row.Lifnr,
                Name1: row.Name1,
                ZsubDate: row.ZsubDate,
                ZmouldCat: row.ZmouldCat,
                ZmouldCatIdH: row.ZmouldCatIdH,
                ZmouldHeadIdH: row.ZmouldHeadIdH,
                ZmouldColHead: row.ZmouldColHead,
                ZmouldColId: row.ZmouldColId,
                ZmouldColName: row.ZmouldColName,
                ZmouldColVal1: (row.ZmouldColVal1 || "").substring(0, 100),
                ZmouldColVal2: (row.ZmouldColVal2 || "").substring(0, 100),
                ZmouldColVal3: (row.ZmouldColVal3 || "").substring(0, 100)
            }))
        };

        /*
           SINGLE POST TO SAP HEADER SET
        */
        const sapResponse = await client.post(
            `${SAP_BASE_URL}/ZMouldDataHeaderSet`,
            sapPayload,
            {
                headers: {
                    'X-CSRF-Token': csrfToken,
                    'Cookie': cookies, // Pass the session cookie here
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        console.log('SUCCESS: DEEP INSERT COMPLETED');

        res.json({
            success: true,
            message: "Action matrix successfully saved to SAP!",
            data: sapResponse.data
        });

    } catch (error) {
        console.log('===== ERROR =====');
        const sapErrorDetail = error.response?.data?.error?.message?.value || error.response?.data || error.message;
        console.log(sapErrorDetail);

        res.status(500).json({
            success: false,
            error: sapErrorDetail
        });
    }
});

apiRouter.get("/getdetails", async (req, res) => {
    try {
        const { Matnr, Lifnr } = req.query;

        if (!Matnr || !Lifnr) {
            return res.status(400).json({
                success: false,
                message: "Material Number and Supplier Number are required",
            });
        }

        const accessToken = await getAccessToken();
        const url = `${SAP_BASE_URL}/ZMouldGetDataSet?$filter=Matnr eq '${Matnr}' and Lifnr eq '${Lifnr}'&$format=json`;

        const response = await client.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
        });

        const results = response.data?.d?.results || [];
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No dropdown data found",
            });
        }

        const moulddetails = results.map((item) => ({
            LIFNR: item.Lifnr,
            MATNR: item.Matnr,
            ZMOULD_COL_HEAD: item.ZmouldColHead,
            ZMOULD_COL_ID: item.ZmouldColId,
            ZMOULD_COL_NAME: item.ZmouldColName,
            ZMOULD_COL_VAL1: item.ZmouldColVal1,
            ZMOULD_COL_VAL2: item.ZmouldColVal2,
            ZMOULD_COL_VAL3: item.ZmouldColVal3
        }));

        return res.json({
            success: true,
            moulddetails,
        });

    } catch (error) {
        const sapErrorDetail = error.response?.data?.error?.message?.value || error.response?.data || error.message;
        console.log(sapErrorDetail);
        return res.status(500).json({
            success: false,
            error: sapErrorDetail,
        });
    }
});

apiRouter.get("/getreport", async (req, res) => {

    try {

        const { Lifnr } = req.query;

        if (!Lifnr) {
            return res.status(400).json({
                success: false,
                message: "Supplier Number is required",
            });
        }

        // SINGLE ODATA API
        const accessToken = await getAccessToken();

        const url =
            `${SAP_BASE_URL}/ZmouldDataReportSet?$filter=Lifnr eq '${Lifnr}'&$format=json`;

        console.log(url)

        const response = await client.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
        });

        //console.log(response);
        const results =
            response.data?.d?.results || [];
        console.log(results);
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No dropdown data found",
            });
        }

        const mouldreport = results.map((item) => ({
            LIFNR: item.Lifnr,
            MATNR: item.Matnr,
            MAKTX: item.Maktx,
            COMPLETED_FLAG: item.CompletedFlag,
            DRAFT_FLAG: item.DraftFlag,
            CREATED_ON: item.CreatedOn,
            CREATED_BY: item.CreatedBy,
            CHANGED_ON: item.ChangedOn,
            CHANGED_BY: item.ChangedBy,
            SUBDATE: item.ZsubDate,
        }));

        console.log('sReport', mouldreport);
        return res.json({
            success: true,
            mouldreport,
        });

    } catch (error) {

        console.log(
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
apiRouter.get("/getvenddashboard", async (req, res) => {
    try {
        const { Lifnr, Matnr } = req.query;

        const accessToken = await getAccessToken();

        let filterQuery = "";
        if (Lifnr && Matnr) {
            filterQuery = `?$filter=Lifnr eq '${Lifnr}' and Matnr eq '${Matnr}'&$format=json`;
        } else if (Lifnr) {
            filterQuery = `?$filter=Lifnr eq '${Lifnr}'&$format=json`;
        } else {
            filterQuery = `?$format=json`;
        }

        const url = `${SAP_BASE_URL}/ZVendDashboardSet?$format=json`;
        console.log(url);

        const response = await client.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
        });

        const results = response.data?.d?.results || [];

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No dashboard data found",
            });
        }

        const dashboardData = results.map((item) => ({
            LIFNR: item.Lifnr,
            MATNR: item.Matnr,
            COUNTRY: item.Country,
            STATE: item.State,
            VEND_REGION: item.VendRegion,
            VEND_REG_NAME: item.VendRegName,
            NAME1: item.Name1,
            VEND_CITY: item.VendCity,
            VEND_COUNTRY: item.VendCountry,
            MAKTX: item.Maktx,
            ZRUNNING: item.Zrunning,
            ZNPA: item.Znpa,
            BRANDDESC: item.BrandDesc || item.Branddesc || item.BrandDesc || "",
        }));

        return res.json({
            success: true,
            dashboardData,
        });

    } catch (error) {
        const sapErrorDetail = error.response?.data?.error?.message?.value || error.response?.data || error.message;
        console.log(sapErrorDetail);
        return res.status(500).json({
            success: false,
            error: sapErrorDetail,
        });
    }
});

/*
   POSTGRES HEALTH CHECK — confirms the Dev DB connection is alive and usable from the app.
*/
apiRouter.get('/db/health', async (req, res) => {
    try {
        const { rows } = await pgPool.query('SELECT NOW() AS now, current_database() AS db');
        return res.json({ success: true, ...rows[0] });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

/*
   START SERVER
*/
app.listen(3001, '0.0.0.0', () => {
    console.log('Server running on port 3001');
    testPgConnection();
});
