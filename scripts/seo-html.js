// Shared by scripts/inject-seo-tags.js (build-time — patches dist/index.html
// on disk so ANY static host serves correct tags, no server required) and
// server/index.js (runtime — a redundant safety net for local/Render
// testing). One definition, so the two never drift out of sync.
const SITE_URL = process.env.SITE_URL || 'https://www.emamiapps.in';

const SEO_TITLE = 'Emami Apps – Emami Group Employee Portal';
const SEO_DESCRIPTION =
  "Emami Apps is the single sign-on portal for Emami Group's internal business applications — including Non CTC Expense, RC Portal, Dispatch Tracker, and MoldHealthCheck. Sign in with your Emami Microsoft work account.";

function buildSeoHeadTags() {
  return `
    <meta name="description" content="${SEO_DESCRIPTION}">
    <link rel="canonical" href="${SITE_URL}/">
    <meta property="og:title" content="${SEO_TITLE}">
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
}

// Idempotent: if the description tag is already present (e.g. the file was
// already patched at build time, and this runs again at server startup),
// returns the HTML unchanged instead of appending a second copy of everything.
function injectSeoTags(html) {
  if (html.includes('name="description"')) return html;

  const withTitle = html.includes('<title>')
    ? html.replace(/<title>[^<]*<\/title>/, `<title>${SEO_TITLE}</title>`)
    : html.replace('</head>', `  <title>${SEO_TITLE}</title>\n  </head>`);

  return withTitle.replace('</head>', `${buildSeoHeadTags()}  </head>`);
}

module.exports = { injectSeoTags, SEO_TITLE, SEO_DESCRIPTION, SITE_URL };
