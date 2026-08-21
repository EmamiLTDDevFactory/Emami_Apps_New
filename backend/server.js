require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./db');

const app = express();
const port = process.env.PORT || 4000;

// This Lambda previously ran a SAML SP for login, then briefly moved login to OAuth2 on the
// mouldhealthcheck Azure App Service — that turned out to be Basis-owned infra provisioned for
// Mould's SAP APIs specifically, not something this team can deploy unrelated code onto. Login
// is back here now (see ./hub-auth.js), fronted by API Gateway instead of a Lambda Function URL
// (which was blocked by an unresolved AWS-account-level access issue). The Manage Access
// endpoints below (backed by Postgres) have been here the whole time.
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGIN || 'http://localhost:8081')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({ origin: FRONTEND_ORIGINS, methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '10kb' }));

const apiRouter = express.Router();
app.use('/api', apiRouter);

apiRouter.use(require('./hub-auth'));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Manage Access — list every authorized user with the app ids granted to them. */
apiRouter.get('/access/users', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT au.email,
                   COALESCE(array_agg(a.app_id) FILTER (WHERE a.app_id IS NOT NULL), '{}') AS app_ids
            FROM emami_apps.authorized_users au
            LEFT JOIN emami_apps.authorized_user_apps a ON a.email = au.email
            GROUP BY au.email, au.created_at
            ORDER BY au.created_at ASC
        `);
        res.json({ success: true, users: rows.map((r) => ({ email: r.email, appIds: r.app_ids })) });
    } catch (err) {
        console.error('[access] Failed to list authorized users:', err.message);
        res.status(500).json({ success: false, error: 'Could not load authorized users.' });
    }
});

/** Grant a brand-new email access to the hub (with no apps granted yet). */
apiRouter.post('/access/users', async (req, res) => {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ success: false, error: 'Enter a valid email address.' });
    }
    try {
        const { rows } = await pool.query(
            'INSERT INTO emami_apps.authorized_users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING email',
            [email]
        );
        if (rows.length === 0) {
            return res.status(409).json({ success: false, error: 'This email already has access.' });
        }
        res.json({ success: true, email, appIds: [] });
    } catch (err) {
        console.error('[access] Failed to add authorized user:', err.message);
        res.status(500).json({ success: false, error: 'Could not add this user.' });
    }
});

/** Revoke a user entirely — cascades to remove all of their app grants too. */
apiRouter.delete('/access/users/:email', async (req, res) => {
    try {
        await pool.query('DELETE FROM emami_apps.authorized_users WHERE email = $1', [req.params.email.toLowerCase()]);
        res.json({ success: true });
    } catch (err) {
        console.error('[access] Failed to remove authorized user:', err.message);
        res.status(500).json({ success: false, error: 'Could not remove this user.' });
    }
});

/** Grant one app to an existing authorized user. */
apiRouter.post('/access/users/:email/apps/:appId', async (req, res) => {
    try {
        await pool.query(
            'INSERT INTO emami_apps.authorized_user_apps (email, app_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.params.email.toLowerCase(), req.params.appId]
        );
        res.json({ success: true });
    } catch (err) {
        if (err.code === '23503') {
            return res.status(404).json({ success: false, error: 'That user is not authorized.' });
        }
        console.error('[access] Failed to grant app access:', err.message);
        res.status(500).json({ success: false, error: 'Could not grant access.' });
    }
});

/** Revoke one app from an existing authorized user. */
apiRouter.delete('/access/users/:email/apps/:appId', async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM emami_apps.authorized_user_apps WHERE email = $1 AND app_id = $2',
            [req.params.email.toLowerCase(), req.params.appId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[access] Failed to revoke app access:', err.message);
        res.status(500).json({ success: false, error: 'Could not revoke access.' });
    }
});

apiRouter.get('/health', (req, res) => res.json({ success: true }));

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Emami Apps hub auth backend listening on port ${port}`);
        testConnection();
    });
}

module.exports = app;
