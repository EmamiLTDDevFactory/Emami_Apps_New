const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EMBEDDED_APPS_DIR = path.join(__dirname, '..', 'embedded-apps');
const MAIN_DIST = path.join(__dirname, '..', 'dist');

// _expo/ and assets/ are shared static folders using content-hashed
// filenames, so merging them from any embedded app can't collide with the
// hub's own files or another embedded app's.
const SHARED_FOLDERS = ['_expo', 'assets'];

function copyRecursive(src, dest) {
  if (fs.statSync(src).isFile()) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

/**
 * Static hosts (S3/CloudFront/Amplify — no custom server, unlike our
 * server/index.js which only exists for local testing) resolve directory
 * URLs like /apps/expense/login/ to a login/index.html automatically, but
 * never auto-append ".html" to an extensionless URL like /apps/expense/login.
 * Expo Router's static export emits flat files (login.html) instead, so we
 * rewrite them here: every "name.html" becomes "name/index.html". Already-
 * correct index.html files are left alone.
 *
 * This does NOT solve dynamic segments like claim/[id].html — a real claim
 * id such as /apps/expense/claim/12345/ has no matching file on disk no
 * matter how it's restructured. That one still needs an explicit wildcard
 * rewrite rule at the hosting level (see the warning this script prints).
 */
function restructureFlatHtmlToDirectories(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      restructureFlatHtmlToDirectories(full);
    } else if (entry.name.endsWith('.html') && entry.name !== 'index.html') {
      const routeName = entry.name.slice(0, -'.html'.length);
      const routeDir = path.join(dir, routeName);
      fs.mkdirSync(routeDir, { recursive: true });
      fs.renameSync(full, path.join(routeDir, 'index.html'));
    }
  }
}

// Flags any route folder whose name looks like a dynamic segment ("[id]",
// "[slug]", etc.) — these need a wildcard rewrite rule added manually at the
// hosting level; static restructuring can't fix them.
function findDynamicRoutes(dir, routePath, warnings) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const childPath = `${routePath}/${entry.name}`;
    if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
      warnings.push(childPath);
    }
    findDynamicRoutes(path.join(dir, entry.name), childPath, warnings);
  }
}

// A true client-side SPA (e.g. RC Portal — Vite + react-router-dom) only
// ever produces one index.html; every other "route" (/consultants/:id, etc.)
// exists purely in client-side JS, never as a file on disk. Detected by:
// the route source dir has no other .html files and no route-shaped
// subfolders besides shared asset dirs. These need a full wildcard fallback
// for the whole app prefix, not just specific dynamic segments.
function isPureSpa(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const htmlFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.html'));
  const nonSharedDirs = entries.filter((e) => e.isDirectory() && !SHARED_FOLDERS.includes(e.name));
  return htmlFiles.length === 1 && htmlFiles[0].name === 'index.html' && nonSharedDirs.length === 0;
}

if (!fs.existsSync(EMBEDDED_APPS_DIR)) {
  console.log('No embedded-apps/ directory found, skipping.');
  process.exit(0);
}

const apps = fs
  .readdirSync(EMBEDDED_APPS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

if (apps.length === 0) {
  console.log('No embedded apps to build.');
  process.exit(0);
}

const dynamicRouteWarnings = [];
const spaFallbackApps = [];

for (const app of apps) {
  const appDir = path.join(EMBEDDED_APPS_DIR, app);
  console.log(`\n=== Building embedded app: ${app} ===`);
  execSync('npm install --legacy-peer-deps', { cwd: appDir, stdio: 'inherit' });
  execSync('npm run build', { cwd: appDir, stdio: 'inherit' });

  const appDist = path.join(appDir, 'dist');

  // Two possible shapes coming out of an embedded app's own `dist/`:
  //
  // 1. Folder-based (e.g. Non-CTC-Expense): its own routes already live
  //    under `dist/apps/<name>/`, because the app's route folder itself was
  //    renamed to match, but its asset/link references are NOT prefixed
  //    (e.g. "/_expo/static/..."). So `_expo`/`assets` merge at the hub's
  //    dist root, shared across everything, same as the hub's own.
  //
  // 2. baseUrl-based (e.g. DispatchTracker, via Expo Router's
  //    `experiments.baseUrl`): ALL references — routes, JS bundle, assets —
  //    are already prefixed with /apps/<name>/, but the output *files* still
  //    land at the dist root (dist/login.html, dist/_expo/, etc.) — baseUrl
  //    only rewrites references, not where Expo Router writes files. So here
  //    WE nest everything (routes AND _expo/assets) under dist/apps/<name>/
  //    ourselves, to match what the HTML actually expects to find there.
  const appsRoot = path.join(appDist, 'apps');
  const isFolderBased = fs.existsSync(appsRoot);
  const routeSourceDir = isFolderBased ? appsRoot : appDist;
  const mergeTarget = isFolderBased ? path.join(MAIN_DIST, 'apps') : path.join(MAIN_DIST, 'apps', app);

  console.log(`Restructuring ${app}'s flat .html routes into route/index.html...`);
  restructureFlatHtmlToDirectories(routeSourceDir);

  const routePrefix = isFolderBased ? '/apps' : `/apps/${app}`;
  findDynamicRoutes(routeSourceDir, routePrefix, dynamicRouteWarnings);

  if (!isFolderBased && isPureSpa(routeSourceDir)) {
    spaFallbackApps.push(app);
  }

  console.log(`Merging ${app}'s routes into ${path.relative(MAIN_DIST, mergeTarget) || '.'}...`);
  for (const entry of fs.readdirSync(routeSourceDir, { withFileTypes: true })) {
    if (isFolderBased && SHARED_FOLDERS.includes(entry.name)) continue;
    copyRecursive(path.join(routeSourceDir, entry.name), path.join(mergeTarget, entry.name));
  }

  if (isFolderBased) {
    console.log(`Merging ${app}'s shared {${SHARED_FOLDERS.join(',')}} into the hub's dist/ root...`);
    for (const folder of SHARED_FOLDERS) {
      const src = path.join(appDist, folder);
      if (fs.existsSync(src)) {
        copyRecursive(src, path.join(MAIN_DIST, folder));
      }
    }
  }
  // For baseUrl-based apps, _expo/assets were already copied in the loop
  // above (they're just more entries under appDist alongside the routes),
  // landing correctly under dist/apps/<name>/_expo and dist/apps/<name>/assets.
}

// Written so server/index.js (local testing only — Amplify needs the actual
// rewrite rules below configured manually) knows which app prefixes need a
// full catch-all fallback to their own index.html, without hardcoding names.
fs.writeFileSync(path.join(MAIN_DIST, '.spa-apps.json'), JSON.stringify(spaFallbackApps));

console.log('\nEmbedded apps merged successfully.');

if (dynamicRouteWarnings.length > 0) {
  console.log('\n⚠ Dynamic route(s) need a manual wildcard rewrite rule in Amplify Hosting:');
  for (const route of dynamicRouteWarnings) {
    const wildcard = route.replace(/\/\[[^\]]+\]$/, '/*');
    console.log(`  ${wildcard}  ->  ${route}/index.html  (200, rewrite)`);
  }
}

if (spaFallbackApps.length > 0) {
  console.log('\n⚠ Pure client-side SPA(s) need a full wildcard fallback rule in Amplify Hosting:');
  for (const app of spaFallbackApps) {
    console.log(`  /apps/${app}/*  ->  /apps/${app}/index.html  (200, rewrite)`);
  }
}
