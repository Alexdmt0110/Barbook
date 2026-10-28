const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const test = require('node:test');
const { loadNycConfig } = require('@istanbuljs/load-nyc-config');

test('NYC loads YAML inheritance and CommonJS with its scoped js-yaml override', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'barbook-nyc-compat-'));

  try {
    writeFileSync(join(cwd, 'package.json'), '{"private":true}');
    writeFileSync(
      join(cwd, 'base.yml'),
      'all: true\ninclude:\n  - "src/**/*.ts"\n',
    );
    writeFileSync(
      join(cwd, '.nycrc.yml'),
      'extends: ./base.yml\ncheck-coverage: true\n',
    );

    const yaml = await loadNycConfig({ cwd, nycrcPath: '.nycrc.yml' });

    assert.equal(yaml.all, true);
    assert.equal(yaml.checkCoverage, true);
    assert.deepEqual(yaml.include, ['src/**/*.ts']);

    writeFileSync(
      join(cwd, 'nyc.config.cjs'),
      'module.exports = { extension: [".ts"] };',
    );
    const commonjs = await loadNycConfig({ cwd, nycrcPath: 'nyc.config.cjs' });

    assert.deepEqual(commonjs.extension, ['.ts']);

    writeFileSync(
      join(cwd, 'unsafe.yml'),
      'value: !!js/function "function () {}"\n',
    );
    await assert.rejects(loadNycConfig({ cwd, nycrcPath: 'unsafe.yml' }));
  } finally {
    // Only remove the uniquely created compatibility fixture, never a project directory.
    rmSync(cwd, { recursive: true, force: true });
  }
});
