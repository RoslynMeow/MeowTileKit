import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.map':  'application/json',
};

function serve(res, filePath) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];

  // serve dist/ library files
  if (url.startsWith('/dist/')) {
    return serve(res, path.join(__dirname, url));
  }

  // serve public/ app files
  if (url === '/') url = '/index.html';
  return serve(res, path.join(__dirname, 'public', url));
});

server.listen(PORT, () => {
  console.log(`\n  🗺 MeowTileKit App\n`);
  console.log(`  Local:   http://localhost:${PORT}/\n`);
});
