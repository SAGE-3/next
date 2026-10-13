#!/usr/bin/env node
const { watch } = require('node:fs');
const { lstat, mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } = require('node:fs/promises');
const path = require('node:path');
const ts = require('typescript');
const webpack = require('webpack');
const JSZip = require('jszip');

function packagePath(file) {
  if (
    typeof file !== 'string' ||
    !file ||
    file.includes('\\') ||
    file.split('/').some((part) => !part || part === '.' || part === '..') ||
    path.isAbsolute(file)
  ) {
    throw new Error(`Expected a relative package path: ${file}`);
  }

  return file;
}

async function collectFiles(root, files) {
  const result = [];

  for (const file of files) {
    packagePath(file);

    const stat = await lstat(path.join(root, file));

    if (stat.isDirectory()) {
      const children = (await readdir(path.join(root, file))).sort();
      const childPaths = children.map((child) => `${file}/${child}`);

      result.push(...(await collectFiles(root, childPaths)));
    } else if (stat.isFile()) {
      result.push(file);
    } else {
      throw new Error(`Package assets must be regular files, not links: ${file}`);
    }
  }

  return result;
}

function commonRoot(first, second) {
  let root = first;

  while (path.relative(root, second).startsWith(`..${path.sep}`) || path.relative(root, second) === '..') {
    const parent = path.dirname(root);
    if (parent === root) {
      throw new Error('SDK source and extension must be on the same filesystem drive.');
    }

    root = parent;
  }

  return root;
}

const hasDuplicate = (values) => values.some((value, index) => values.indexOf(value) !== index);

async function build(options) {
  const root = path.resolve(options.root || process.cwd());
  const output = path.resolve(root, options.output);
  const entries = options.entries.map(packagePath);

  if (!entries.length || hasDuplicate(entries)) {
    throw new Error('Provide distinct TypeScript entry names without .ts.');
  }

  const assets = await collectFiles(root, options.assets);

  if (hasDuplicate(assets)) {
    throw new Error('Duplicate static asset paths.');
  }

  if (!assets.includes('manifest.json')) {
    throw new Error('Static assets must include manifest.json.');
  }

  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));

  if (manifest.apiVersion !== 1) {
    throw new Error('Only apiVersion 1 extension packages are supported.');
  }

  for (const entry of [manifest.entry, ...(manifest.views || []).map((view) => view.entry)]) {
    if (!assets.includes(packagePath(entry))) {
      throw new Error(`Missing declared HTML asset: ${entry}`);
    }
  }

  const sdkSource = options.sdkSource && path.resolve(root, options.sdkSource);
  const sourceRoot = sdkSource ? commonRoot(root, path.dirname(sdkSource)) : root;

  // Staging beneath the project keeps dependency module IDs independent of its absolute location.
  const temporary = await mkdtemp(path.join(root, '.sageplugin-build-'));
  const stagedOutput = `${output}.tmp`;

  try {
    const compiled = path.join(temporary, 'compiled');
    const program = ts.createProgram(
      entries.map((entry) => path.join(root, `${entry}.ts`)),
      {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'],
        types: [],
        strict: true,
        skipLibCheck: true,
        esModuleInterop: true,
        rootDir: sourceRoot,
        outDir: compiled,
        noEmitOnError: true,
        ...(sdkSource ? { paths: { '@sage3/sageplugin': [sdkSource] } } : {}),
      },
    );
    const diagnostics = ts.getPreEmitDiagnostics(program);

    if (!diagnostics.length) {
      diagnostics.push(...program.emit().diagnostics);
    }

    if (diagnostics.length) {
      throw new Error(
        ts.formatDiagnosticsWithColorAndContext(diagnostics, {
          getCanonicalFileName: (file) => file,
          getCurrentDirectory: () => root,
          getNewLine: () => '\n',
        }),
      );
    }

    const packageDir = path.join(temporary, 'package');
    const emittedPath = (file) => path.join(compiled, path.relative(sourceRoot, file)).replace(/\.ts$/, '.js');
    const compiler = webpack({
      context: compiled,
      mode: 'production',
      target: ['web', 'es2020'],
      devtool: false,
      entry: Object.fromEntries(entries.map((entry) => [entry, emittedPath(path.join(root, `${entry}.ts`))])),
      output: { path: packageDir, filename: '[name].js' },
      resolve: {
        modules: [path.join(root, 'node_modules'), ...require.resolve.paths('yjs'), 'node_modules'],
        ...(sdkSource ? { alias: { '@sage3/sageplugin$': emittedPath(sdkSource) } } : {}),
      },
      optimization: { minimize: false, moduleIds: 'deterministic', chunkIds: 'deterministic' },
    });
    await new Promise((resolve, reject) => {
      compiler.run((error, stats) => {
        compiler.close((closeError) => {
          if (error || closeError) {
            reject(error || closeError);
          } else if (!stats || stats.hasErrors()) {
            reject(new Error(stats ? stats.toString({ all: false, errors: true }) : 'Webpack returned no result.'));
          } else {
            resolve();
          }
        });
      });
    });

    const bundled = await collectFiles(packageDir, await readdir(packageDir));
    const files = [...assets.map((name) => ({ name, root })), ...bundled.map((name) => ({ name, root: packageDir }))];

    if (files.some((file, index) => files.findIndex((other) => other.name === file.name) !== index)) {
      throw new Error('Static assets collide with bundled output.');
    }

    files.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }

      if (a.name > b.name) {
        return 1;
      }

      return 0;
    });
    const zip = new JSZip();

    for (const file of files) {
      zip.file(file.name, await readFile(path.join(file.root, file.name)), {
        date: new Date('2000-01-01T00:00:00Z'),
        createFolders: false,
        unixPermissions: 0o100644,
      });
    }

    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(
      stagedOutput,
      await zip.generateAsync({
        type: 'nodebuffer',
        platform: 'UNIX',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      }),
    );
    await rename(stagedOutput, output);
    console.log(output);
    return output;
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(stagedOutput, { force: true });
  }
}

async function watchBuild(options) {
  const root = path.resolve(options.root || process.cwd());
  const output = path.resolve(root, options.output);
  const directories = [root];
  if (options.sdkSource) {
    const sdkDirectory = path.dirname(path.resolve(root, options.sdkSource));
    if (commonRoot(root, sdkDirectory) !== root) {
      directories.push(sdkDirectory);
    }
  }

  let stopped = false;
  let pending = false;
  let active;
  let timer;
  const watchers = [];

  function rebuild() {
    pending = true;

    if (active || stopped) {
      return;
    }

    active = (async () => {
      while (pending && !stopped) {
        pending = false;

        try {
          await build(options);
          process.exitCode = 0;
        } catch (error) {
          console.error(error);
          process.exitCode = 1;
        }
      }
    })().finally(() => {
      active = undefined;
    });
  }

  async function close() {
    stopped = true;
    clearTimeout(timer);

    for (const watcher of watchers) {
      watcher.close();
    }

    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    await active;
  }

  function stop() {
    void close();
  }

  try {
    for (const directory of directories) {
      const watcher = watch(directory, { recursive: true }, (_event, name) => {
        if (stopped) {
          return;
        }

        if (name) {
          const relative = name.toString();

          const ignoredDirectory = relative
            .split(path.sep)
            .some((part) => part === 'node_modules' || part === '.git' || part.startsWith('.sageplugin-build-'));

          if (ignoredDirectory) {
            return;
          }

          const changed = path.resolve(directory, relative);

          if (changed === output || changed === `${output}.tmp`) {
            return;
          }
        }

        clearTimeout(timer);
        timer = setTimeout(rebuild, 100);
      });

      watcher.on('error', (error) => {
        console.error(error);
        process.exitCode = 1;
        void close();
      });
      watchers.push(watcher);
    }

    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    rebuild();
    await active;
    return close;
  } catch (error) {
    await close();
    throw error;
  }
}

async function run(options, args = process.argv.slice(2)) {
  const positional = args.filter((arg) => arg !== '--watch');
  if (positional.length > 1 || positional.some((arg) => arg.startsWith('-'))) {
    throw new Error('Usage: build.cjs [output.zip] [--watch]');
  }

  const configured = positional.length ? { ...options, output: path.resolve(positional[0]) } : options;
  return args.includes('--watch') ? watchBuild(configured) : build(configured);
}

module.exports = { build, watchBuild, run };

if (require.main === module) {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf('--config');
  let configFile = 'sageplugin.config.cjs';

  if (configIndex !== -1) {
    configFile = args.splice(configIndex, 2)[1];
  }

  Promise.resolve()
    .then(() => {
      if (!configFile) {
        throw new Error('--config requires a configuration path.');
      }

      const configPath = path.resolve(configFile);
      const config = require(configPath);

      return run({ ...config, root: path.resolve(path.dirname(configPath), config.root || '.') }, args);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
