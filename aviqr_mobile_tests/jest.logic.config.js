/** Lightweight Jest config for pure-logic tests (no React Native renderer).
 *  Runs the unit/ and api/ layers without needing jest-expo installed.
 *  Use:  npx jest -c jest.logic.config.js
 */
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.logic.setup.js'],
  testMatch: ['**/__tests__/unit/**/*.test.js', '**/__tests__/api/**/*.test.js'],
  transform: { '^.+\\.js$': ['babel-jest', { configFile: './babel.logic.config.js' }] },
  transformIgnorePatterns: ['node_modules/(?!(axios)/)'],
  // Force all 'axios' imports to resolve to our local copy so jest.mock('axios') applies
  // even for files loaded through the src/ symlink (which otherwise resolves from aviqr-mobile-expo)
  moduleNameMapper: {
    '^axios$': '<rootDir>/node_modules/axios',
  },
};
