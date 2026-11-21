// Tiny static dev server for RigForge (Node 18+, no dependencies).
// Run with: npm run dev   then open http://localhost:5180
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5180;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const filePath = path.normalize(path.join(ROOT, rel));
    const relToRoot = path.relative(ROOT, filePath);
    if (!filePath.startsWith(ROOT + path.sep) || /(^|[\/])\.|node_modules|^server\.mjs|^package\.json/.test(relToRoot)) {
        res.writeHead(404); res.end('Not found'); return;
    }
    try {
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(data);
    } catch {
        res.writeHead(404); res.end('Not found');
    }
});

server.listen(PORT, () => console.log(`RigForge running at http://localhost:${PORT}`));
