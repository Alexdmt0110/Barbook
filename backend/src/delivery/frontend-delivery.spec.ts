import * as express from 'express';
import * as request from 'supertest';
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { frontendDelivery } from './frontend-delivery';

describe('compiled frontend HTTP delivery', () => {
  const root = mkdtempSync(join(tmpdir(), 'barbook-static-'));
  beforeAll(() => {
    writeFileSync(
      join(root, 'index.html'),
      '<!doctype html><title>Barbook</title>',
    );
    writeFileSync(join(root, 'main.js'), 'console.log(1)');
    writeFileSync(join(root, '.env'), 'SECRET');
    symlinkSync(root, join(root, 'linked'), 'junction');
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  function app() {
    const server = express();
    server.use(frontendDelivery(root));
    server.get('/api/probe', (_req, res) =>
      res.status(401).json({ code: 'SESSION_REQUIRED' }),
    );
    return server;
  }
  it('serves deep HTML navigation, HEAD and static assets with safe headers', async () => {
    for (const path of ['/', '/cocktails/recipe/edit']) {
      const result = await request(app()).get(path).accept('html').expect(200);
      expect(result.text).toContain('<title>Barbook');
      expect(result.headers['cache-control']).toBe('no-store');
      expect(result.headers['x-content-type-options']).toBe('nosniff');
    }
    await request(app()).head('/cocktails/recipe').accept('html').expect(200);
    await request(app()).get('/main.js').expect(200);
  });
  it('never masks API errors or unsafe methods', async () => {
    await request(app()).get('/api/probe').accept('html').expect(401);
    for (const path of [
      '/api',
      '/api/missing',
      '/API/missing',
      '/%61pi/missing',
    ])
      await request(app()).get(path).accept('html').expect(404);
    await request(app()).post('/cocktails').accept('html').expect(404);
    await request(app()).get('/cocktails').accept('json').expect(404);
  });
  it('does not disclose dotfiles, links, source maps or missing assets', async () => {
    for (const path of [
      '/.env',
      '/%2eenv',
      '/linked/index.html',
      '/missing.js',
      '/main.js.map',
      '/bad%00.txt',
      '/a%5c.env',
    ])
      await request(app()).get(path).accept('html').expect(404);
  });
  it('fails startup for invalid release paths', () => {
    expect(() => frontendDelivery('relative')).toThrow();
    expect(() => frontendDelivery(join(root, 'missing'))).toThrow();
  });
});
