const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Non CTC Expense is the one app actually deployed on Render right now.
// Routed through a same-origin path so the web build's <iframe> embedding
// works (browsers can be picky about cross-origin frames; native WebView has
// no such requirement and hits the real URL directly instead — see
// src/data/mockData.ts).
const EXPENSE_PREFIX = '/apps/expense';
const EXPENSE_TARGET = 'https://non-ctc-expense.onrender.com';
const EXPENSE_ENTRY = '/zexpense/';

const expenseEntryProxy = createProxyMiddleware({
  pathFilter: EXPENSE_PREFIX,
  target: EXPENSE_TARGET,
  changeOrigin: true,
  // Trailing slash avoids an extra redirect round-trip — the target 302s
  // "/zexpense" -> "/zexpense/" otherwise.
  pathRewrite: { [`^${EXPENSE_PREFIX}`]: EXPENSE_ENTRY },
  on: {
    // The target app doesn't know it's being served under /apps/expense, so
    // any redirect it sends (root-relative Location header) needs that
    // prefix added back on, or the browser ends up back at the hub root.
    proxyRes: (proxyRes) => {
      const location = proxyRes.headers.location;
      if (location && location.startsWith('/') && !location.startsWith(EXPENSE_PREFIX)) {
        proxyRes.headers.location = EXPENSE_PREFIX + location;
      }
    },
  },
});

// Non CTC Expense's own HTML references its JS/CSS bundle via a root-relative
// path (e.g. "/_expo/static/js/web/entry-<hash>.js"), not one scoped to
// /apps/expense/ — it wasn't built with that base path in mind. Those asset
// requests hit the hub's own root, not /apps/expense, so they can't be routed
// by path alone. Instead, forward any asset request whose Referer says it
// came from the embedded expense page — everything else still falls through
// to the hub's own static files below.
const expenseAssetProxy = createProxyMiddleware({
  target: EXPENSE_TARGET,
  changeOrigin: true,
});

app.use(expenseEntryProxy);

app.use((req, res, next) => {
  const referer = req.headers.referer || '';
  if (!req.path.startsWith('/apps/') && referer.includes(EXPENSE_PREFIX)) {
    return expenseAssetProxy(req, res, next);
  }
  next();
});

// Static web build.
app.use(express.static(DIST_DIR));

// SPA fallback — any other path (deep links, refreshes on client-side routes)
// serves the app shell so React Navigation's web linking can take over.
app.use((req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Emami Hub server listening on port ${PORT}`);
});
