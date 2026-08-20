// Patches dist/index.html on disk, right after `expo export` produces it, so
// the file itself carries the SEO tags — not just server/index.js's runtime
// response. This is what makes the tags show up under ANY hosting (a plain
// static host like Amplify/S3/CloudFront included, which never runs our
// Express server) instead of only when something happens to run
// server/index.js in front of the build.
const fs = require('fs');
const path = require('path');
const { injectSeoTags } = require('./seo-html');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'dist', 'index.html');

const raw = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
const patched = injectSeoTags(raw);
fs.writeFileSync(INDEX_HTML_PATH, patched);

console.log('SEO tags injected into dist/index.html (title, description, canonical, Open Graph, JSON-LD).');
