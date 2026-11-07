const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const root = createRequire(join(process.cwd(), 'package.json'));
const backend = root('./package.json').name === 'backend';
const from = (name) => {
  try { return createRequire(root.resolve(`${name}/package.json`)); }
  catch (error) {
    if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
    return createRequire(root.resolve(name));
  }
};

const globConsumers = backend
  ? ['@nestjs/cli', 'jest-config', 'jest-runtime', '@jest/reporters', 'test-exclude']
  : ['@npmcli/package-json', 'cacache'];
for (const consumer of globConsumers) {
  test(`${consumer} resolves corrected glob with real traversal/exclusion/abort`, async () => {
    const requireConsumer = from(consumer);
    const glob = requireConsumer('glob');
    assert.equal(requireConsumer('glob/package.json').version, '14.0.3');
    const cwd = mkdtempSync(join(tmpdir(), 'barbook-glob-'));
    try {
      mkdirSync(join(cwd, 'src'));
      writeFileSync(join(cwd, 'src/a.ts'), '');
      writeFileSync(join(cwd, 'src/a.spec.ts'), '');
      writeFileSync(join(cwd, 'src/readme.md'), '');
      const options = { cwd, ignore: ['**/*.spec.ts'] };
      assert.deepEqual(glob.globSync('src/**/*.ts', options), ['src/a.ts']);
      assert.deepEqual(await glob.glob('src/**/*.ts', options), ['src/a.ts']);
      assert.deepEqual(glob.globSync('src\\*.ts', {...options, windowsPathsNoEscape: true}), ['src/a.ts']);
      const controller = new AbortController();
      controller.abort(new Error('fixture cancellation'));
      await assert.rejects(glob.glob('**/*', {cwd, signal:controller.signal}), /fixture cancellation/);
    } finally { rmSync(cwd, {recursive:true,force:true}); }
  });
}

const minimatchConsumers = backend
  ? ['@typescript-eslint/typescript-estree', 'test-exclude']
  : ['@typescript-eslint/typescript-estree', '@eslint/config-array', 'ignore-walk'];
for (const consumer of minimatchConsumers) {
  test(`${consumer} resolves corrected minimatch preserving matching and exclusions`, () => {
    const requireConsumer = from(consumer);
    assert.equal(requireConsumer('minimatch/package.json').version, '11.0.4');
    const { minimatch, Minimatch } = requireConsumer('minimatch');
    assert.equal(minimatch('src/a.ts', 'src/**/*.ts'), true);
    assert.equal(minimatch('src/a.spec.ts', '!**/*.spec.ts'), false);
    assert.equal(new Minimatch('src\\*.ts', {windowsPathsNoEscape:true}).match('src/a.ts'), true);
    assert.equal(minimatch('.env', '*'), false);
    assert.equal(minimatch('src/a.js', '**/*.ts'), false);
  });
}

if (backend) {
  for (const consumer of ['jest-config', 'fork-ts-checker-webpack-plugin']) {
    test(`${consumer} merger preserves config semantics and prevents prototype poisoning`, () => {
      const requireConsumer = from(consumer);
      const merge = requireConsumer('deepmerge');
      assert.equal(requireConsumer('deepmerge/package.json').name, '@stackline/deepmerge');
      assert.equal(requireConsumer('deepmerge/package.json').version, '1.1.2');
      const target = {nested:{one:1}, list:[{first:true}], fn:Math.abs};
      const source = {nested:{two:2}, list:[{second:true}]};
      const output = merge(target, source);
      assert.deepEqual(output, {nested:{one:1,two:2},list:[{first:true},{second:true}],fn:Math.abs});
      assert.notEqual(output.nested, target.nested);
      assert.deepEqual(target.nested,{one:1});
      assert.deepEqual(merge.all([{globals:{a:1}},{globals:{b:2}}]),{globals:{a:1,b:2}});
      assert.deepEqual(merge({list:[1]},{list:[2]},{arrayMerge:(_left,right)=>right}),{list:[2]});
      assert.deepEqual(merge({nested:{a:1}},{nested:{b:2}},{customMerge:key=>key==='nested'?()=>({chosen:true}):undefined}),{nested:{chosen:true}});
      const symbol = Symbol('config');
      assert.deepEqual(merge({[symbol]:{a:1}},{[symbol]:{b:2}})[symbol],{a:1,b:2});
      for (const target of [JSON.parse('{"__proto__":{"polluted":true}}'), Object.assign(Object.create(null), JSON.parse('{"__proto__":{"polluted":true}}'))]) {
        const result = merge(target, JSON.parse('{"__proto__":{"polluted":true},"safe":1}'));
        assert.equal(Object.getPrototypeOf(result), Object.prototype);
        assert.equal(result.polluted, undefined);
        assert.equal(Object.hasOwn(result,'__proto__'), false);
        assert.equal(result.safe,1);
      }
      assert.equal({}.polluted,undefined);
    });
  }
  test('real Jest preset globals are resolved through the replacement merger', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'barbook-jest-config-'));
    try {
      writeFileSync(join(cwd,'package.json'),'{"private":true}');
      writeFileSync(join(cwd,'preset.js'),'module.exports={globals:{fixture:{a:1}},testMatch:["**/*.spec.js"]}');
      writeFileSync(join(cwd,'jest-preset.js'),'module.exports=require("./preset")');
      const {readConfig} = root('jest-config');
      writeFileSync(join(cwd,'jest.config.cjs'), 'module.exports={rootDir:__dirname,preset:require("node:path").join(__dirname,"jest-preset.js"),globals:{fixture:{b:2}},testEnvironment:"node"}');
      const {projectConfig} = await readConfig({_:[], $0:'fixture',config:join(cwd,'jest.config.cjs')},cwd);
      assert.deepEqual(projectConfig.globals.fixture,{a:1,b:2});
      assert.deepEqual(projectConfig.testMatch,['**/*.spec.js']);
    } finally {rmSync(cwd,{recursive:true,force:true});}
  });
  test('Istanbul test-exclude actually traverses and filters through glob14', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'barbook-coverage-'));
    try {
      mkdirSync(join(cwd,'src'));
      writeFileSync(join(cwd,'src/a.ts'),'');
      writeFileSync(join(cwd,'src/a.spec.ts'),'');
      const Exclude = root('test-exclude');
      const exclude = new Exclude({cwd,include:['src/**/*.ts'],exclude:['**/*.spec.ts'],extension:['.ts']});
      assert.deepEqual(exclude.globSync(cwd),['src/a.ts']);
      assert.deepEqual(await exclude.glob(cwd),['src/a.ts']);
    } finally {rmSync(cwd,{recursive:true,force:true});}
  });
  test('fork-ts-checker uses the replacement to merge actual plugin options', () => {
    const Plugin = root('fork-ts-checker-webpack-plugin');
    const plugin = new Plugin({async:false,typescript:{diagnosticOptions:{semantic:true,syntactic:true}}});
    assert.equal(plugin.options.async,false);
    assert.equal(plugin.options.typescript.diagnosticOptions.syntactic,true);
  });
}
