const fs = require('fs');
const path = require('path');
const express = require('express');
const { injectSeoTags } = require('../scripts/seo-html');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, '..', 'dist');

// `npm run build:web` already bakes these tags into dist/index.html on disk
// (scripts/inject-seo-tags.js) — that's what makes them show up under any
// static host too, not just here. This is a redundant safety net for
// whoever/whatever actually runs this server: injectSeoTags() is idempotent,
// so re-running it on an already-patched file is a no-op, not a duplicate.
// Built once at startup, not per-request — index.html doesn't change while
// the server is running. Falls back to the plain file if dist/ isn't built
// yet (e.g. server started before `npm run build:web`).
let indexHtmlWithSeoTags = null;
try {
  indexHtmlWithSeoTags = injectSeoTags(fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8'));
} catch (err) {
  console.error('Could not read/patch dist/index.html at startup — serving the raw file instead:', err.message);
}

function sendIndexHtml(res) {
  if (indexHtmlWithSeoTags) {
    res.type('html').send(indexHtmlWithSeoTags);
  } else {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  }
}

// Static web build. `extensions: ['html']` lets extensionless URLs like
// /apps/expense/login match the on-disk login.html — without it, every
// embedded-app route silently falls through to the hub's own SPA fallback
// below instead of the embedded app's actual page. `index: false` stops it
// serving the raw index.html for "/" — the routes below serve the
// SEO-tagged version instead.
app.use(express.static(DIST_DIR, { extensions: ['html'], index: false }));

app.get(['/', '/index.html'], (req, res) => sendIndexHtml(res));

// Pure client-side SPA embedded apps (e.g. RC Portal) only ship one
// index.html — every one of their own routes (/consultants/:id, etc.) needs
// to fall back to THAT index.html, not the hub's own. Written by
// scripts/build-embedded-apps.js. This is local-testing only; Amplify needs
// the equivalent wildcard rewrite rules configured manually (see that
// script's printed warnings).
const spaAppsManifest = path.join(DIST_DIR, '.spa-apps.json');
const spaApps = fs.existsSync(spaAppsManifest) ? JSON.parse(fs.readFileSync(spaAppsManifest, 'utf-8')) : [];
for (const appName of spaApps) {
  app.use(`/apps/${appName}`, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'apps', appName, 'index.html'));
  });
}

// SPA fallback — any other path (deep links, refreshes on client-side routes)
// serves the app shell so React Navigation's web linking can take over.
app.use((req, res) => {
  sendIndexHtml(res);
});

app.listen(PORT, () => {
  console.log(`Emami Hub server listening on port ${PORT}`);
});
