const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const modules = new Map();

module.exports = function loadTypeScript(file) {
  if (modules.has(file)) {
    return modules.get(file).exports;
  }

  const loaded = { exports: {} };
  const nativeRequire = createRequire(file);
  const javascript = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  modules.set(file, loaded);

  vm.runInNewContext(
    javascript,
    {
      module: loaded,
      exports: loaded.exports,
      URL,
      console,
      require(specifier) {
        if (specifier === '@sage3/sageplugin') {
          return loadTypeScript(path.join(__dirname, 'src/index.ts'));
        }

        if (specifier.startsWith('.')) {
          return loadTypeScript(path.resolve(path.dirname(file), `${specifier}.ts`));
        }

        return nativeRequire(specifier);
      },
    },
    { filename: file },
  );

  return loaded.exports;
};
