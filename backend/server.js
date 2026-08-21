require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 4000;

/*
   The one allowed email + OTP live ONLY here, in server-side env vars
   (backend/.env, gitignored — see .env.example). They are never sent to the
   client: request-otp always replies the same way regardless of whether the
   email matches (so the response itself can't be used to enumerate the
   valid email), and verify-otp returns one generic error for every failure
   reason (wrong email, wrong OTP, or both) so the client can't tell which
   part was wrong.
*/
const ALLOWED_EMAIL = (process.env.LOGIN_ALLOWED_EMAIL || '').trim().toLowerCase();
const VALID_OTP = (process.env.LOGIN_OTP || '').trim();

if (!ALLOWED_EMAIL || !VALID_OTP) {
    console.warn('[auth] LOGIN_ALLOWED_EMAIL / LOGIN_OTP are not set — every login attempt will fail. Set them in backend/.env (see .env.example).');
}

const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGIN || 'http://localhost:8081')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({ origin: FRONTEND_ORIGINS, methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '10kb' }));

/*
   MINIMAL BRUTE-FORCE GUARD
   The OTP is a fixed 6-digit code (not time-limited/rotating), so without
   some throttle it would be trivially guessable. In-memory + per-IP is a
   best-effort mitigation only — on Lambda this resets on cold start and
   isn't shared across concurrent instances, so it's defense-in-depth, not a
   hard guarantee. Good enough for this app's actual risk level; a real rate
   limiter (e.g. backed by the Postgres dev DB or DynamoDB) would be
   overkill here.
*/
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 8;
const attemptsByIp = new Map();

function isRateLimited(ip) {
    const now = Date.now();
    const entry = attemptsByIp.get(ip);
    if (!entry || now > entry.resetAt) {
        attemptsByIp.set(ip, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
        return false;
    }
    entry.count += 1;
    return entry.count > MAX_ATTEMPTS_PER_WINDOW;
}

const apiRouter = express.Router();
app.use('/api', apiRouter);

/*
   STEP 1 — request an OTP for an email.
   Always responds the same way whether or not the email is the allowed
   one, so the response can't be used to discover the valid address.
*/
apiRouter.post('/auth/request-otp', (req, res) => {
    const email = (req.body?.email || '').trim();
    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required.' });
    }
    return res.json({ success: true, message: 'If this email is registered, a one-time code has been issued.' });
});

/*
   STEP 2 — verify the email + OTP pair. This is the only place the actual
   check happens, and it happens entirely server-side.
*/
apiRouter.post('/auth/verify-otp', (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if (isRateLimited(ip)) {
        return res.status(429).json({ success: false, error: 'Too many attempts. Please try again later.' });
    }

    const email = (req.body?.email || '').trim().toLowerCase();
    const otp = (req.body?.otp || '').trim();

    const isValid = !!ALLOWED_EMAIL && !!VALID_OTP && email === ALLOWED_EMAIL && otp === VALID_OTP;
    if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid email or OTP.' });
    }

    return res.json({ success: true });
});

apiRouter.get('/health', (req, res) => res.json({ success: true }));

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Emami Apps hub auth backend listening on port ${port}`);
    });
}

module.exports = app;
