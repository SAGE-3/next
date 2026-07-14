const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');

// Options migrated from the former @nx/webpack:webpack executor target;
// the production block applies when building with --configuration=production.
const configValues = {
  default: {
    target: 'node',
    compiler: 'tsc',
    outputPath: '../../dist/apps/homebase-files',
    main: './src/main.ts',
    tsConfig: './tsconfig.app.json',
    assets: ['./src/assets'],
    babelUpwardRootMode: true,
    outputHashing: 'none',
  },
  production: {
    optimization: true,
    extractLicenses: true,
    fileReplacements: [{ replace: './src/environments/environment.ts', with: './src/environments/environment.prod.ts' }],
  },
};

const configuration = process.env.NX_TASK_TARGET_CONFIGURATION || 'default';
const buildOptions = {
  ...configValues.default,
  ...(configValues[configuration] || {}),
};

module.exports = {
  plugins: [new NxAppWebpackPlugin(buildOptions)],
};
