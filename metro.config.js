const { getDefaultConfig } = require('expo/metro-config');
const { createProxyMiddleware } = require('http-proxy-middleware');

const config = getDefaultConfig(__dirname);

// Dev-only mirror of server/index.js's Non CTC Expense proxy — see that file
// for why this exists and why there's a separate Referer-based asset fallback.
const EXPENSE_PREFIX = '/apps/expense';
const EXPENSE_TARGET = 'https://non-ctc-expense.onrender.com';
const EXPENSE_ENTRY = '/zexpense/';

const expenseEntryProxy = createProxyMiddleware({
  target: EXPENSE_TARGET,
  changeOrigin: true,
  pathRewrite: { [`^${EXPENSE_PREFIX}`]: EXPENSE_ENTRY },
  on: {
    proxyRes: (proxyRes) => {
      const location = proxyRes.headers.location;
      if (location && location.startsWith('/') && !location.startsWith(EXPENSE_PREFIX)) {
        proxyRes.headers.location = EXPENSE_PREFIX + location;
      }
    },
  },
});

const expenseAssetProxy = createProxyMiddleware({
  target: EXPENSE_TARGET,
  changeOrigin: true,
});

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => (req, res, next) => {
    if (req.url.startsWith(EXPENSE_PREFIX)) {
      return expenseEntryProxy(req, res, next);
    }
    const referer = req.headers.referer || '';
    if (!req.url.startsWith('/apps/') && referer.includes(EXPENSE_PREFIX)) {
      return expenseAssetProxy(req, res, next);
    }
    return metroMiddleware(req, res, next);
  },
};

module.exports = config;
