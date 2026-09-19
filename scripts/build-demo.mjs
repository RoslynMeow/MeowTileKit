// 从 docs/index.html 生成一个“本地版本”的 Demo（用本地 meta 构建，而不是 CDN）。
// 输出到 repo 根 demo/index.html（该目录已在 .gitignore 中忽略）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const docsFile = resolve(root, 'docs/index.html');
const outDir = resolve(root, 'demo');
const outFile = resolve(outDir, 'index.html');

const CDN_TAG = '<script src="https://unpkg.com/meow-tile-kit"></script>';
const LOCAL_TAG = '<script src="../packages/meta/dist/index.global.js"></script>';

let html;
try {
  html = readFileSync(docsFile, 'utf8');
} catch {
  console.error(`[build-demo] 找不到 ${docsFile}`);
  process.exit(1);
}

if (!html.includes(CDN_TAG)) {
  console.error('[build-demo] docs/index.html 里没找到 unpkg 脚本标签，无法替换为本地构建');
  process.exit(1);
}

html = html.replace(CDN_TAG, LOCAL_TAG);
mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, html);
console.log(`[build-demo] 已生成 ${outFile}`);
