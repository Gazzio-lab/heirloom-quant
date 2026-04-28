#!/usr/bin/env node
/**
 * Build the renderer:
 *   1. Compile src/app/renderer/index.ts -> dist/app/renderer/index.js (ES module)
 *   2. Copy index.html and styles.css into dist/app/renderer/
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RENDERER_SRC = path.join(ROOT, 'src', 'app', 'renderer');
const RENDERER_OUT = path.join(ROOT, 'dist', 'app', 'renderer');

function copy(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log(`copy ${path.relative(ROOT, src)} -> ${path.relative(ROOT, dst)}`);
}

console.log('compiling renderer (tsc -p tsconfig.renderer.json)…');
execSync('npx tsc -p tsconfig.renderer.json', { stdio: 'inherit', cwd: ROOT });

console.log('copying renderer assets…');
copy(path.join(RENDERER_SRC, 'index.html'), path.join(RENDERER_OUT, 'index.html'));
copy(path.join(RENDERER_SRC, 'styles.css'), path.join(RENDERER_OUT, 'styles.css'));

console.log('renderer build complete.');
