import { build as viteBuild } from 'vite';
import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import zlib from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');

async function runBuild() {
  console.log('[build] Starting Snippo Extension Build...');

  // 1. Clean dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // 2. Build UI Pages (Popup, Manager, Onboarding) with Vite
  console.log('[build] Building UI Pages (Popup, Manager, Onboarding)...');
  await viteBuild({
    root: rootDir,
    base: '',
    build: {
      outDir: distDir,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: resolve(rootDir, 'src/ui/popup/index.html'),
          manager: resolve(rootDir, 'src/ui/manager/index.html'),
          onboarding: resolve(rootDir, 'src/ui/onboarding/index.html'),
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  });

  // Ensure HTML files are placed at root-relative paths expected by manifest.json (ui/popup/index.html, etc.)
  const htmlMappings = [
    { src: 'dist/src/ui/popup/index.html', dest: 'dist/ui/popup/index.html' },
    { src: 'dist/src/ui/manager/index.html', dest: 'dist/ui/manager/index.html' },
    { src: 'dist/src/ui/onboarding/index.html', dest: 'dist/ui/onboarding/index.html' },
  ];

  for (const m of htmlMappings) {
    const fullSrc = resolve(rootDir, m.src);
    const fullDest = resolve(rootDir, m.dest);
    if (fs.existsSync(fullSrc)) {
      fs.mkdirSync(dirname(fullDest), { recursive: true });
      let content = fs.readFileSync(fullSrc, 'utf8');
      // Fix relative path: ../../../assets/ -> ../../assets/
      content = content.replace(/\.\.\/\.\.\/\.\.\/assets\//g, '../../assets/');
      fs.writeFileSync(fullDest, content, 'utf8');
    }
  }

  // Remove redundant dist/src
  if (fs.existsSync(resolve(distDir, 'src'))) {
    fs.rmSync(resolve(distDir, 'src'), { recursive: true, force: true });
  }

  // 3. Build Content Script (IIFE single standalone bundle)
  console.log('[build] Bundling Content Script (IIFE) with esbuild...');
  await esbuild.build({
    entryPoints: [resolve(rootDir, 'src/content/entry.ts')],
    outfile: resolve(distDir, 'content/entry.js'),
    bundle: true,
    format: 'iife',
    minify: true,
    target: ['chrome110'],
  });

  // 4. Build Background Service Worker (ES module)
  console.log('[build] Bundling Background Service Worker with esbuild...');
  await esbuild.build({
    entryPoints: [resolve(rootDir, 'src/background/worker.ts')],
    outfile: resolve(distDir, 'background/worker.js'),
    bundle: true,
    format: 'esm',
    minify: true,
    target: ['chrome110'],
  });

  // 5. Copy manifest.json & assets to dist
  console.log('[build] Copying manifest.json and icons to dist...');
  fs.copyFileSync(resolve(rootDir, 'manifest.json'), resolve(distDir, 'manifest.json'));

  // Copy assets folder
  const copyDir = (src, dest) => {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      const s = resolve(src, item);
      const d = resolve(dest, item);
      if (fs.statSync(s).isDirectory()) {
        copyDir(s, d);
      } else {
        fs.copyFileSync(s, d);
      }
    }
  };

  if (fs.existsSync(resolve(rootDir, 'assets/icons'))) {
    copyDir(resolve(rootDir, 'assets/icons'), resolve(distDir, 'assets/icons'));
  }

  // 6. Mirror compiled files to project root so loading either the root directory
  // or the dist/ folder in chrome://extensions works seamlessly
  console.log('[build] Mirroring runtime files to project root for direct loading...');
  copyDir(resolve(distDir, 'content'), resolve(rootDir, 'content'));
  copyDir(resolve(distDir, 'background'), resolve(rootDir, 'background'));
  copyDir(resolve(distDir, 'ui'), resolve(rootDir, 'ui'));
  copyDir(resolve(distDir, 'assets'), resolve(rootDir, 'assets'));

  // 7. Check Size Budgets
  console.log('\n[stats] Verifying Performance and Size Budgets:');
  const contentScriptPath = resolve(distDir, 'content/entry.js');
  if (fs.existsSync(contentScriptPath)) {
    const rawContent = fs.readFileSync(contentScriptPath);
    const rawSizeKb = (rawContent.length / 1024).toFixed(2);
    const gzipped = zlib.gzipSync(rawContent);
    const gzSizeKb = (gzipped.length / 1024).toFixed(2);

    console.log(`- Content Script Raw Size: ${rawSizeKb} KB`);
    console.log(`- Content Script Gzipped: ${gzSizeKb} KB (Budget: < 15.00 KB)`);

    if (gzipped.length > 15 * 1024) {
      console.error(`[error] Content script size exceeds 15 KB budget: ${gzSizeKb} KB`);
      process.exit(1);
    } else {
      console.log(`[ok] Content script within size budget! (${gzSizeKb} KB / 15.00 KB)`);
    }
  }

  console.log('\n[success] Build Complete! Unpacked extension ready at ./dist\n');
}

runBuild().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
