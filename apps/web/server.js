import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5173;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Target microservices
// Use environment variables when deployed (Render), fall back to localhost for dev
const TARGETS = {
  '/api/core':    process.env.API_URL      || 'http://localhost:3000',
  '/api/routing': process.env.ROUTING_URL  || 'http://localhost:3001',
  '/api/ml':      process.env.ML_URL       || 'http://localhost:8000',
};

function proxyRequest(req, res, targetBase, targetPath) {
  try {
    const targetUrl = new URL(targetPath, targetBase);
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'access-control-allow-headers': '*',
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error', details: err.message }));
    });

    req.pipe(proxyReq);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy failure', details: err.message }));
  }
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    res.end();
    return;
  }

  // API Proxies
  for (const [prefix, targetBase] of Object.entries(TARGETS)) {
    if (req.url.startsWith(prefix)) {
      const strippedPath = req.url.slice(prefix.length) || '/';
      proxyRequest(req, res, targetBase, strippedPath);
      return;
    }
  }

  // Static File Serving
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(__dirname, 'index.html');
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      const contentType = MIME_TYPES[ext] || 'text/html; charset=UTF-8';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n  ⚡ VOLT Web Dashboard live at: http://localhost:${PORT}\n`);
});
