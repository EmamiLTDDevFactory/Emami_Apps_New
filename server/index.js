const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, '..', 'dist');
const SITE_URL = process.env.SITE_URL || 'https://www.emamiapps.in';

// SEO: Expo's web export has no editable HTML template, so the hub's
// index.html ships as a bare SPA shell with no <title>/description of its
// own — nothing for Google or link-unfurlers (Slack/Teams, which don't run
// JS) to read. Injected into the raw HTML once at startup, rather than only
// via client-side JS, so every crawler sees it, not just JS-executing ones.
const SEO_DESCRIPTION =
  "Emami Apps is the single sign-on portal for Emami Group's internal business applications — including Non CTC Expense, RC Portal, Dispatch Tracker, and MoldHealthCheck. Sign in with your Emami Microsoft work account.";
const SEO_HEAD_TAGS = `
    <meta name="description" content="${SEO_DESCRIPTION}">
    <link rel="canonical" href="${SITE_URL}/">
    <meta property="og:title" content="Emami Apps – Emami Group Employee Portal">
    <meta property="og:description" content="Single sign-on portal for Emami Group's internal business applications.">
    <meta property="og:url" content="${SITE_URL}/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Emami Apps">
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Emami Apps',
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: SEO_DESCRIPTION,
      publisher: { '@type': 'Organization', name: 'Emami Group', url: 'https://www.emamigroup.com' },
    })}</script>
`;

function buildIndexHtmlWithSeoTags() {
  const raw = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  const withTitle = raw.includes('<title>')
    ? raw.replace(/<title>[^<]*<\/title>/, '<title>Emami Apps – Emami Group Employee Portal</title>')
    : raw.replace('</head>', '  <title>Emami Apps – Emami Group Employee Portal</title>\n  </head>');
  return withTitle.replace('</head>', `${SEO_HEAD_TAGS}  </head>`);
}

// Built once at startup, not per-request — index.html doesn't change while
// the server is running. Falls back to the plain file if dist/ isn't built
// yet (e.g. server started before `npm run build:web`).
let indexHtmlWithSeoTags = null;
try {
  indexHtmlWithSeoTags = buildIndexHtmlWithSeoTags();
} catch {}

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
