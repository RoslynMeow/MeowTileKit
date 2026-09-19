// 零依赖静态服务器（monorepo 根）。
// 用法：node server.js [--no-open]
//   --no-open  不自动打开浏览器
// 环境变量：PORT（默认 5173）
// 先 `npm run build`（并 `npm run build:demo`）再启动。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
const OPEN = !process.argv.includes('--no-open');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/demo/';
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] 端口 ${PORT} 已被占用，可用 "PORT=5180 npm run dev" 换个端口`);
  } else {
    console.error('[server] 启动失败:', err.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`\n  MeowTileKit 示例画廊  →  http://localhost:${PORT}/demo/`);
  console.log(`  （元素示例 /demo/elements.html，极简 /demo/minimal.html，完整 /demo/classic.html）\n`);
  if (OPEN) openBrowser(`http://localhost:${PORT}/demo/`);
});

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'start ""'
    : process.platform === 'darwin' ? 'open'
      : 'xdg-open';
  try {
    spawn(cmd, [url], { shell: true, stdio: 'ignore', detached: true }).unref();
  } catch { /* ignore */ }
}

const shutdown = () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 500); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
