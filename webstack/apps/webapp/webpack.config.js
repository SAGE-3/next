const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { NxReactWebpackPlugin } = require('@nx/react/webpack-plugin');

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

// Nx's PostcssCliResources plugin scans every url() token in a declaration,
// including url(%23...) fragment references embedded inside SVG data-URIs
// (tldraw.css cursors), and fails trying to resolve them as files. Mask those
// tokens behind a '#'-prefixed placeholder (which the plugin skips) before it
// runs, and restore them afterwards.
const MASK = 'url(#__enc23__';
const maskEncodedFragmentUrls = {
  postcssPlugin: 'mask-encoded-fragment-urls',
  Once(root) {
    root.walkDecls((decl) => {
      if (decl.value && decl.value.includes('url(%23')) {
        decl.value = decl.value.split('url(%23').join(MASK);
      }
    });
  },
};
const unmaskEncodedFragmentUrls = {
  postcssPlugin: 'unmask-encoded-fragment-urls',
  OnceExit(root) {
    root.walkDecls((decl) => {
      if (decl.value && decl.value.includes(MASK)) {
        decl.value = decl.value.split(MASK).join('url(%23');
      }
    });
  },
};

function wrapPostcssOptions(use) {
  if (!use || !use.loader || !use.loader.includes('postcss-loader')) return;
  const orig = use.options && use.options.postcssOptions;
  if (!orig) return;
  const wrap = (opts) => ({
    ...opts,
    plugins: [maskEncodedFragmentUrls, ...(opts.plugins || []), unmaskEncodedFragmentUrls],
  });
  use.options = {
    ...use.options,
    postcssOptions: typeof orig === 'function' ? (loader) => wrap(orig(loader)) : wrap(orig),
  };
}

// Runs after the Nx plugins have populated compiler.options, so the style
// rules they add can be adjusted (sass deprecation silencing + postcss mask).
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
          wrapPostcssOptions(use);
        });
      });
    });
  },
};

module.exports = {
  devServer: {
    port: 4200,
    proxy: require('./proxy.conf.json'),
  },
  plugins: [new NxAppWebpackPlugin(buildOptions), new NxReactWebpackPlugin(), sageStyleTweaksPlugin],
};
