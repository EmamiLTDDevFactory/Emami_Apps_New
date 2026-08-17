const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, '..', 'dist');

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
