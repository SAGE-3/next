const nrwlConfig = require('@nrwl/react/plugins/webpack.js'); // require the main @nrwl/react/plugins/webpack configuration function.
const webpack = require('webpack');

module.exports = (config, context) => {
  nrwlConfig(config); // first call it so that it @nrwl/react plugin adds its configs,

  // then override your config.
  return {
    ...config,
    node: { global: true },
    resolve: {
      ...config.resolve,
      fallback: {
        'crypto': require.resolve('crypto-browserify'),
        'stream': require.resolve('stream-browserify')
      },
      alias: {
        process: 'process/browser.js',
      },
    },

    plugins: [
      ...config.plugins,
      new webpack.ProvidePlugin({
        process: 'process/browser.js',
        Buffer: ['buffer', 'Buffer'],
      }),
    ],

    module: {
      ...config.module,
      rules: [
        ...config.module.rules,
        {
          test: /\.node$/,
          loader: 'ignore-loader',
        },
      ],
    },
  };
};
