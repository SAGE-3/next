const getWebpackConfig = require('@nrwl/react/plugins/webpack');

module.exports = (config, context) => {
  config = getWebpackConfig(config, context);

  // Silence the Dart Sass legacy JS API deprecation warning (sass-loader v12
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
};
