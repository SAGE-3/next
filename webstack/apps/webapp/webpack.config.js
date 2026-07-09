const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');

module.exports = composePlugins(withNx(), withReact(), (config) => {
  // Silence the Dart Sass legacy JS API deprecation warning (sass-loader
  // still uses the legacy API; the warning is noise until NX upgrades its
  // webpack/sass-loader stack).
  config.module.rules.forEach((rule) => {
    const candidates = rule.oneOf ? rule.oneOf : [rule];
    candidates.forEach((r) => {
      const uses = Array.isArray(r.use) ? r.use : [];
      uses.forEach((use) => {
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

  return config;
});
