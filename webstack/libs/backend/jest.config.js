/* eslint-disable */
module.exports = {
  displayName: 'backend',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // permissions.ts imports the real SAGE3Ability/RoleArg/ActionArg/ResourceArg
  // from @sage3/shared — a TS path alias (tsconfig.base.json), not a
  // resolvable node module. Mapped directly to SAGEAbility.ts (where all
  // four are actually defined) rather than the full @sage3/shared barrel:
  // the barrel's index also re-exports a fuzzy-search util (fuse.js) whose
  // default export shape breaks under ts-jest's CommonJS transform — a
  // pre-existing, unrelated interop issue.
  moduleNameMapper: {
    '^@sage3/shared$': '<rootDir>/../shared/src/lib/permissions/SAGEAbility.ts',
    '^@sage3/sagebase$': '<rootDir>/../sagebase/src/index.ts',
  },
  coverageDirectory: '../../coverage/libs/backend',
};
