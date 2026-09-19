// 从 docs/ 生成“本地版”示例到 demo/（把 unpkg 固定版本替换为本地构建的相对路径）。
// - 复制 docs/ 下所有 .html 到 demo/（含 legacy/）
// - 非 legacy 页面：`https://unpkg.com/meow-tile-kit@<meta版本>` → 相对路径 `.../packages/meta/dist`
// - legacy 页面保持 unpkg 固定版本（旧版只能从 CDN 取）
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { dirname, resolve, relative, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const docsDir = resolve(root, 'docs');
const outDir = resolve(root, 'demo');
const metaVersion = JSON.parse(readFileSync(resolve(root, 'packages/meta/package.json'), 'utf8')).version;
const CDN_PREFIX = `https://unpkg.com/meow-tile-kit@${metaVersion}/dist`;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

rmSync(outDir, { recursive: true, force: true });

let count = 0;
let replaced = 0;
for (const file of walk(docsDir)) {
  if (!file.endsWith('.html')) continue;
  const rel = relative(docsDir, file);
  const isLegacy = rel.split(sep)[0] === 'legacy';

  let html = readFileSync(file, 'utf8');
  if (!isLegacy && html.includes(CDN_PREFIX)) {
    // demo/<rel> 到 repo 根的相对前缀
    const depth = rel.split(sep).length;         // 顶层文件为 1
    const up = '../'.repeat(depth);
    html = html.split(CDN_PREFIX).join(`${up}packages/meta/dist`);
    replaced++;
  }

  const out = resolve(outDir, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  count++;
}

console.log(`[build-demo] generated ${count} file(s) in ${outDir} (rewrote ${replaced}, meta@${metaVersion})`);
