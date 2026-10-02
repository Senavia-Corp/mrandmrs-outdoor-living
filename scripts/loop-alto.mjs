/** Alto de una ruta del build a 479/768/991/1440, headless: node scripts/loop-alto.mjs <ruta> -> JSON */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const E = path.join(RAIZ, '.vercel/output/static');
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const c = [path.join(E, u), path.join(E, u, 'index.html')].find((f) => fs.existsSync(f) && fs.statSync(f).isFile()); if (!c) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': T[path.extname(c)] || 'application/octet-stream' }); fs.createReadStream(c).pipe(r); });
await new Promise((r) => srv.listen(4745, r)); const { chromium } = await import('playwright'); const nav = await chromium.launch(); const out = {};
for (const [w, h] of [[479, 850], [768, 1024], [991, 800], [1440, 900]]) { const ctx = await nav.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); await p.goto('http://localhost:4745' + process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(300); out[w] = await p.evaluate(() => document.documentElement.scrollHeight); await ctx.close(); }
await nav.close(); srv.close(); process.stdout.write(JSON.stringify(out));
