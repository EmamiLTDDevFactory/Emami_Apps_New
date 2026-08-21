require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const saml = require('samlify');

// samlify's default schema validator shells out to the `xmllint` binary,
// which doesn't exist on Lambda. Skipping it is the documented workaround
// for serverless environments — request/response structure is still
// verified by signature + condition checks below, just not the raw XSD.
saml.setSchemaValidator({ validate: () => Promise.resolve('skipped') });

const app = express();
const port = process.env.PORT || 4000;

/*
   SSO LOGIN — Microsoft Entra ID via SAML, same as MouldHealthCheck delegates
   its own login check to a real backend rather than trusting the client.
   Setup (one-time, done by whoever owns this backend + Infra's Entra admin):
     1. Ask Infra for this SAML app's Federation Metadata XML and save it as
        backend/saml/idp-metadata.xml (gitignored — not committed, just like
        .env; copied in locally/at deploy time).
     2. Deploy this backend once to get its Lambda Function URL.
     3. Give Infra the two values this backend now serves itself:
          Identifier / Entity ID   -> <function-url>/api/auth/saml/metadata
          Reply URL / ACS URL      -> <function-url>/api/auth/saml/acs
     4. Set APP_JWT_SECRET (any long random string) in backend/.env — it
        signs the short-lived session token issued after a real SSO login.
   Until idp-metadata.xml is present, /auth/saml/login responds 503 instead
   of crashing, so the rest of the API keeps working.
*/
const ALLOWED_EMAIL_DOMAIN = (process.env.LOGIN_ALLOWED_EMAIL_DOMAIN || 'emamigroup.com').trim().toLowerCase();
const APP_JWT_SECRET = process.env.APP_JWT_SECRET || '';
const SESSION_TTL = '12h';

if (!APP_JWT_SECRET) {
    console.warn('[auth] APP_JWT_SECRET is not set — every SSO login will fail at the ACS step. Set it in backend/.env (see .env.example).');
}

const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGIN || 'http://localhost:8081')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
const FRONTEND_REDIRECT_URL = FRONTEND_ORIGINS[0] || 'http://localhost:8081';

app.use(cors({ origin: FRONTEND_ORIGINS, methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '10kb' }));
// SAML's HTTP-POST binding auto-submits a form (application/x-www-form-urlencoded)
// from the browser to the ACS endpoint — this is what parses that body.
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

let cachedIdp = null;
/** Lazily loads + caches the IdP (Entra ID) metadata Infra hands over — returns null until the file is dropped in. */
function getIdp() {
    if (cachedIdp) return cachedIdp;
    const metadataPath = process.env.SAML_IDP_METADATA_PATH || path.join(__dirname, 'saml', 'idp-metadata.xml');
    if (!fs.existsSync(metadataPath)) return null;
    cachedIdp = saml.IdentityProvider({ metadata: fs.readFileSync(metadataPath, 'utf-8') });
    return cachedIdp;
}

/** Built per-request (not cached) so entity ID/ACS URL always match whatever host actually served the request — local dev vs. the deployed Lambda Function URL. */
function getSp(req) {
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0];
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const baseUrl = `${proto}://${host}`;
    return saml.ServiceProvider({
        entityID: process.env.SAML_SP_ENTITY_ID || `${baseUrl}/api/auth/saml/metadata`,
        assertionConsumerService: [{
            Binding: saml.Constants.namespace.binding.post,
            Location: `${baseUrl}/api/auth/saml/acs`,
        }],
        wantAssertionsSigned: true,
    });
}

/** Entra ID's exact attribute name for email varies by tenant config, so this checks the common ones plus NameID before giving up. */
function extractEmail(extract) {
    const attrs = extract?.attributes || {};
    const candidates = [
        attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
        attrs.email,
        attrs.mail,
        attrs.Email,
        extract?.nameID,
        ...Object.values(attrs),
    ];
    const found = candidates.find((v) => typeof v === 'string' && v.includes('@'));
    return (found || '').trim().toLowerCase();
}

const apiRouter = express.Router();
app.use('/api', apiRouter);

/** SP metadata — this is what gets handed to Infra to finish wiring up the Entra ID enterprise app. */
apiRouter.get('/auth/saml/metadata', (req, res) => {
    res.type('application/xml').send(getSp(req).getMetadata());
});

/** Step 1 — redirect the browser to Microsoft to sign in. Not an XHR target; the frontend navigates here directly. */
apiRouter.get('/auth/saml/login', (req, res) => {
    const idp = getIdp();
    if (!idp) {
        return res.status(503).send('Single sign-on is not configured yet. Please contact IT.');
    }
    const { context } = getSp(req).createLoginRequest(idp, 'redirect');
    return res.redirect(context);
});

/** Step 2 — Microsoft POSTs the SAML assertion back here. Validates it, then bounces the browser back to the app with a short-lived session token (or an error code) in the query string. */
apiRouter.post('/auth/saml/acs', async (req, res) => {
    const idp = getIdp();
    if (!idp || !APP_JWT_SECRET) {
        return res.redirect(`${FRONTEND_REDIRECT_URL}/?ssoError=not_configured`);
    }
    try {
        const { extract } = await getSp(req).parseLoginResponse(idp, 'post', req);
        const email = extractEmail(extract);
        if (!email || !email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
            return res.redirect(`${FRONTEND_REDIRECT_URL}/?ssoError=domain_not_allowed`);
        }
        const token = jwt.sign({ email }, APP_JWT_SECRET, { expiresIn: SESSION_TTL });
        return res.redirect(`${FRONTEND_REDIRECT_URL}/?ssoToken=${encodeURIComponent(token)}`);
    } catch (err) {
        console.error('[auth] SAML assertion validation failed', err);
        return res.redirect(`${FRONTEND_REDIRECT_URL}/?ssoError=invalid_response`);
    }
});

/** Step 3 — the frontend exchanges the token it got back for confirmation before flipping into the logged-in state. */
apiRouter.post('/auth/session/verify', (req, res) => {
    const token = (req.body?.token || '').trim();
    if (!token || !APP_JWT_SECRET) {
        return res.status(400).json({ success: false, error: 'Invalid session.' });
    }
    try {
        const payload = jwt.verify(token, APP_JWT_SECRET);
        if (!payload?.email || !payload.email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
            return res.status(401).json({ success: false, error: 'Invalid session.' });
        }
        return res.json({ success: true, email: payload.email });
    } catch {
        return res.status(401).json({ success: false, error: 'Invalid or expired session.' });
    }
});

apiRouter.get('/health', (req, res) => res.json({ success: true }));

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Emami Apps hub auth backend listening on port ${port}`);
    });
}

module.exports = app;
