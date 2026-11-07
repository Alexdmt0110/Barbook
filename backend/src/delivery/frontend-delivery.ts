import { RequestHandler } from 'express';
import { isAbsolute, join, relative, sep, extname } from 'node:path';
import { lstatSync, realpathSync } from 'node:fs';

const publicExtensions = new Set([
  '.html',
  '.js',
  '.css',
  '.json',
  '.ico',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.woff',
  '.woff2',
  '.ttf',
  '.txt',
]);

/** Opt-in trusted build directory only; never point this at sources or uploads. */
export function frontendDelivery(directory: string): RequestHandler {
  if (!isAbsolute(directory))
    throw new Error('FRONTEND_DIST_DIR must be absolute.');
  const root = realpathSync(directory);
  if (!lstatSync(root).isDirectory() || !safeFile('index.html'))
    throw new Error('FRONTEND_DIST_DIR must contain a regular index.html.');

  function safeFile(name: string): boolean {
    const parts = name.split('/');
    if (parts.some((part) => !part || part.startsWith('.'))) return false;
    const file = join(root, ...parts);
    const inside = relative(root, file);
    if (inside.startsWith(`..${sep}`) || isAbsolute(inside)) return false;
    try {
      let current = root;
      for (const part of parts) {
        current = join(current, part);
        if (lstatSync(current).isSymbolicLink()) return false;
      }
      return lstatSync(file).isFile();
    } catch {
      return false;
    }
  }

  return (request, response, next) => {
    let path: string;
    try {
      path = decodeURIComponent(request.path);
    } catch {
      response.sendStatus(400);
      return;
    }
    if (/^\/api(?:\/|$)/i.test(path)) {
      next();
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      next();
      return;
    }
    if (
      path.includes('\\') ||
      path.includes('\0') ||
      path.includes('//') ||
      path.split('/').some((part) => part.startsWith('.'))
    ) {
      response.sendStatus(404);
      return;
    }
    const name = path.slice(1);
    const extension = extname(name).toLowerCase();
    const file =
      publicExtensions.has(extension) && safeFile(name)
        ? name
        : !extension && request.accepts('html')
          ? 'index.html'
          : undefined;
    if (!file) {
      response.sendStatus(404);
      return;
    }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.sendFile(
      join(root, file),
      { dotfiles: 'deny', cacheControl: false },
      (error) => {
        if (error) next(error);
      },
    );
  };
}
