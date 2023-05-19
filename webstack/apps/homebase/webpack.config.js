const nrwlConfig = require('@nx/node/plugins/webpack.js'); // require the main @nx/react/plugins/webpack configuration function.

module.exports = (config, context) => {
  nrwlConfig(config); // first call it so that it @nx/node plugin adds its configs,

  // then override your config.
  return {
    ...config,
    target: 'node',
    node: {
      ...config.node,
      process: true,
      global: true,
      __dirname: false,
    },
    module: {
      ...config.module,
      rules: [
        ...config.module.rules,
        {
          test: /\.node$/,
          loader: 'node-loader',
        },
      ],
    },
  };
};
