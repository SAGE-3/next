const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');

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

module.exports = composePlugins(withNx(), withReact(), (config) => {
  config.module.rules.forEach((rule) => {
    const candidates = rule.oneOf ? rule.oneOf : [rule];
    candidates.forEach((r) => {
      const uses = Array.isArray(r.use) ? r.use : [];
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

  return config;
});
