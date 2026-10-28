const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { gzipSync } = require('node:zlib');

test('Angular build Undici override preserves real HTTP gzip responses', async () => {
  const { fetch, Agent } = require('undici');
  const agent = new Agent();
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' });
    response.end(gzipSync(Buffer.from('{"healthy":true}')));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}`, { dispatcher: agent });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { healthy: true });
  } finally {
    await agent.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('Angular CLI can initialize and list its read-only local MCP tools with the patched SDK', { timeout: 15000 }, async () => {
  const child = spawn(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'mcp', '--read-only', '--local-only'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const lines = createInterface({ input: child.stdout });
  let stderr = '';
  child.stderr.on('data', (part) => { stderr = (stderr + part.toString()).slice(-2000); });
  let timer;
  try {
    await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Angular MCP compatibility handshake timed out')), 10000);
      child.on('error', reject);
      child.on('exit', (code) => reject(new Error(`Angular MCP exited early (${code}): ${stderr}`)));
      lines.on('line', (line) => {
        try {
          const message = JSON.parse(line);
          if (message.error) throw new Error(JSON.stringify(message.error));
          if (message.id === 1) {
            assert.ok(message.result.serverInfo.name);
            child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
            child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');
          }
          if (message.id === 2) {
            assert.ok(Array.isArray(message.result.tools));
            assert.ok(message.result.tools.length > 0);
            resolve();
          }
        } catch (error) { reject(error); }
      });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
        protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'barbook-compatibility-test', version: '1.0.0' },
      } }) + '\n');
    });
  } finally {
    clearTimeout(timer);
    lines.close();
    child.stdin.end();
    child.kill('SIGTERM');
  }
});
