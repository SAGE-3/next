const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { NxReactWebpackPlugin } = require('@nx/react/webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

// Options migrated from the former @nx/webpack:webpack executor target;
// the production block applies when building with --configuration=production.
const configValues = {
  default: {
    outputPath: '../../dist/apps/webapp',
    index: './src/index.html',
    baseHref: '',
    main: './src/main.tsx',
    polyfills: './src/polyfills.ts',
    tsConfig: './tsconfig.app.json',
    assets: ['./src/favicon.ico', './src/assets'],
    styles: ['./src/styles.scss'],
    scripts: [],
    compiler: 'babel',
  },
  development: {},
  production: {
    fileReplacements: [{ replace: './src/environments/environment.ts', with: './src/environments/environment.prod.ts' }],
    optimization: true,
    outputHashing: 'all',
    sourceMap: false,
    namedChunks: false,
    extractLicenses: true,
    vendorChunk: false,
  },
};

const configuration = process.env.NX_TASK_TARGET_CONFIGURATION || 'default';
const buildOptions = {
  ...configValues.default,
  ...(configValues[configuration] || {}),
};

// Runs after the Nx plugins have populated compiler.options, so the style
// rules they add can be adjusted (sass deprecation silencing).
const sageStyleTweaksPlugin = {
  apply(compiler) {
    (compiler.options.module?.rules || []).forEach((rule) => {
      const candidates = rule && rule.oneOf ? rule.oneOf : [rule];
      candidates.forEach((r) => {
        const uses = r && Array.isArray(r.use) ? r.use : [];
        uses.forEach((use) => {
          // Silence the Dart Sass legacy JS API deprecation warning (sass-loader
          // still uses the legacy API; the warning is noise until NX upgrades its
          // webpack/sass-loader stack).
          if (use && use.loader && use.loader.includes('sass-loader')) {
            use.options = {
              ...use.options,
              sassOptions: {
                ...(use.options?.sassOptions || {}),
                silenceDeprecations: ['legacy-js-api'],
              },
            };
          }
        });
      });
    });
  },
};

// SVGR support (Nx 22 removed the built-in svgr option from NxReactWebpackPlugin):
// .svg imports from JS/TS expose the CRA-style named ReactComponent export,
// matching the module declarations @nx/react still ships in typings/image.d.ts.
// Append ?url to an import to get the asset URL instead.
const svgrPlugin = {
  apply(compiler) {
    const rules = compiler.options.module.rules || [];
    compiler.options.module.rules = rules.filter((rule) => {
      if (!rule || typeof rule !== 'object' || !(rule.test instanceof RegExp) || !rule.test.test('x.svg')) {
        return true;
      }
      if (rule.test.test('x.png')) {
        // Combined image asset rule: keep it for other formats, drop svg from it.
        rule.exclude = /\.svg$/;
        return true;
      }
      return false;
    });
    compiler.options.module.rules.push({
      test: /\.svg$/,
      oneOf: [
        {
          resourceQuery: /url/,
          type: 'asset/resource',
          generator: { filename: '[name].[hash][ext]' },
        },
        {
          issuer: /\.[jt]sx?$/,
          use: [
            {
              loader: require.resolve('@svgr/webpack'),
              options: { svgo: false, titleProp: true, ref: true, exportType: 'named' },
            },
          ],
        },
        {
          type: 'asset/resource',
          generator: { filename: '[name].[hash][ext]' },
        },
      ],
    });
  },
};

module.exports = {
  devServer: {
    port: 4200,
    proxy: require('./proxy.conf.json'),
  },
  // Third-party packages (fetch-event-source, plotly.js, monaco) reference
  // source maps or sources they don't publish; source-map-loader warns on
  // every dev build. Only silence that specific case for node_modules.
  ignoreWarnings: [
    {
      module: /node_modules/,
      message: /Failed to parse source map/,
    },
  ],
  plugins: [
    new NxAppWebpackPlugin(buildOptions),
    new NxReactWebpackPlugin(),
    sageStyleTweaksPlugin,
    svgrPlugin,
    // Monaco is bundled (see src/monaco-setup.ts) rather than loaded from a
    // CDN; this plugin emits the editor/language workers as self-contained
    // bundles (plain `new Worker(new URL(...))` breaks with Nx's runtimeChunk
    // splitting) and wires MonacoEnvironment to them.
    new MonacoWebpackPlugin({ filename: '[name].worker.js' }),
  ],
};
