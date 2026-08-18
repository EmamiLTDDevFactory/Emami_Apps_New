const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Static web build. `extensions: ['html']` lets extensionless URLs like
// /apps/expense/login match the on-disk login.html — without it, every
// embedded-app route silently falls through to the hub's own SPA fallback
// below instead of the embedded app's actual page.
app.use(express.static(DIST_DIR, { extensions: ['html'] }));

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
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Emami Hub server listening on port ${PORT}`);
});
