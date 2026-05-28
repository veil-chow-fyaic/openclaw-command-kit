import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const useDist = args.includes('--dist');
const root = path.join(repoRoot, 'site', useDist ? 'dist' : '');
const portArg = args.find((arg) => arg.startsWith('--port='));
const preferredPort = portArg ? Number(portArg.split('=')[1]) : 4173;
const host = '127.0.0.1';

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
]);

async function ensureRoot() {
  const index = path.join(root, 'index.html');
  const result = await stat(index).catch(() => null);
  if (!result?.isFile()) {
    const hint = useDist ? 'Run `npm run site:build` before `npm run site:preview`.' : 'Check site/index.html.';
    throw new Error(`Cannot serve missing site entry: ${path.relative(repoRoot, index)}. ${hint}`);
  }
}

function resolvePath(requestUrl) {
  const url = new URL(requestUrl, `http://${host}`);
  const pathname = decodeURIComponent(url.pathname);
  const clean = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(root, clean));
  if (!filePath.startsWith(root)) {
    return null;
  }
  return filePath;
}

function createServer() {
  return http.createServer(async (request, response) => {
    const filePath = resolvePath(request.url ?? '/');
    if (!filePath) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    const result = await stat(filePath).catch(() => null);
    const target = result?.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const targetStat = await stat(target).catch(() => null);

    if (!targetStat?.isFile()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const contentType = types.get(path.extname(target)) ?? 'application/octet-stream';
    response.writeHead(200, { 'content-type': contentType });
    createReadStream(target).pipe(response);
  });
}

async function listen(server, port, attempts = 0) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      if (error.code === 'EADDRINUSE' && attempts < 20) {
        resolve(listen(createServer(), port + 1, attempts + 1));
        return;
      }
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve({ server, port });
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

await ensureRoot();
const { server, port } = await listen(createServer(), preferredPort);
console.log(`OpenClaw Command Kit site serving ${useDist ? 'dist' : 'source'} at http://${host}:${port}/`);

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
