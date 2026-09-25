/* Tiny static server for local preview. No dependencies.
   Usage:  node tools/serve.js [port]      default 8090
   Supports Range requests so the MP4 clips can loop and seek. */
const http = require('http'), fs = require('fs'), path = require('path');

const root = path.join(__dirname, '..');
const port = Number(process.argv[2]) || 8090;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4':  'video/mp4',
  '.txt':  'text/plain; charset=utf-8',
  '.ico':  'image/x-icon'
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, url);
  // relative() catches "../Atlas automations site2" too, which startsWith would let through
  const rel = path.relative(root, file);
  if (rel.startsWith('..') || path.isAbsolute(rel)) { res.writeHead(403); return res.end('403'); }

  let stat;
  try {
    stat = fs.statSync(file);
    if (stat.isDirectory()) { file = path.join(file, 'index.html'); stat = fs.statSync(file); }
  } catch { res.writeHead(404); return res.end('404'); }

  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);

  if (range && (range[1] || range[2])) {
    const last = stat.size - 1;
    // "bytes=-500" means the final 500 bytes; clamp everything to the file
    let start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
    let end = range[1] && range[2] ? Math.min(Number(range[2]), last) : last;
    if (start > last || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      return res.end();
    }
    res.writeHead(206, {
      'Content-Type': type, 'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1
    });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Atlas preview on http://localhost:${port}`));
