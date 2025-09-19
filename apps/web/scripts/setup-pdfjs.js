const fs = require('fs');
const path = require('path');

// Copy PDF.js worker file to public directory, matching the installed version
function setupPdfjsWorker() {
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  try {
    // Resolve installed pdfjs-dist root dynamically
    const pkgPath = require.resolve('pdfjs-dist/package.json', { paths: [path.join(__dirname, '..')] });
    const pkgDir = path.dirname(pkgPath);

    // Prefer min.mjs (ESM). Fallback to mjs, then classic js
    const candidates = [
      path.join(pkgDir, 'build/pdf.worker.min.mjs'),
      path.join(pkgDir, 'build/pdf.worker.mjs'),
      path.join(pkgDir, 'build/pdf.worker.min.js'),
      path.join(pkgDir, 'build/pdf.worker.js'),
    ];

    const src = candidates.find((p) => fs.existsSync(p));
    if (src) {
      const destName = path.extname(src) === '.mjs' ? 'pdf.worker.min.mjs' : 'pdf.worker.min.js';
      const dest = path.join(publicDir, destName);
      fs.copyFileSync(src, dest);
      console.log(`✅ PDF.js worker copied: ${path.relative(process.cwd(), src)} -> ${path.relative(process.cwd(), dest)}`);
      return;
    }

    console.warn('⚠️ Could not find a local pdf.worker file to copy. The app will use CDN fallback.');
  } catch (err) {
    console.warn('⚠️ Failed to resolve pdfjs-dist package:', err?.message || err);
    console.warn('   The app will use CDN fallback for the worker.');
  }
}

if (require.main === module) {
  setupPdfjsWorker();
}

module.exports = { setupPdfjsWorker };
