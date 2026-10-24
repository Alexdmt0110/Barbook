const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const uri = require('fast-uri');

test('URI references preserve ordinary resolution without decoding an encoded scheme into javascript', () => {
  assert.equal(uri.resolve('https://example.test/a/', '../b'), 'https://example.test/b');
  assert.notEqual(uri.parse('%6Aavascript:alert(1)').scheme, 'javascript');
  assert.notEqual(uri.normalize('%6Aavascript:alert(1)'), 'javascript:alert(1)');
});

test('compressed JSON with trailing bytes cannot terminate the HTTP parser process', () => {
  // Isolate the process: the vulnerable parser throws after responding, outside
  // a request error handler. A subsequent real request must still succeed.
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const http = require('node:http');
    const { gzipSync } = require('node:zlib');
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.post('/', (req, res) => res.json(req.body));
    app.use((error, req, res, next) => res.status(400).end());
    const server = app.listen(0, '127.0.0.1', async () => {
      const send = (body) => new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port: server.address().port,
          path: '/', method: 'POST', headers: { 'Content-Type': 'application/json',
          'Content-Encoding': 'gzip', 'Content-Length': body.length } }, res => {
          let data = ''; res.on('data', x => data += x);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject); req.end(body);
      });
      try {
        const json = gzipSync(Buffer.from('{"healthy":true}'));
        const malformed = await send(Buffer.concat([json, Buffer.from('trailing junk')]));
        assert.ok([200, 400].includes(malformed.status));
        await new Promise(resolve => setTimeout(resolve, 100));
        const healthy = await send(json);
        assert.equal(healthy.status, 200);
        assert.deepEqual(JSON.parse(healthy.data), { healthy: true });
        server.close();
      } catch (error) { console.error(error); server.close(); process.exitCode = 1; }
    });
  `], { encoding: 'utf8', timeout: 5000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});
