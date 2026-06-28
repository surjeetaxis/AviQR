/** Lightweight Jest config for pure-logic tests (no React Native renderer).
 *  Runs the unit/ and api/ layers without needing jest-expo installed.
 *  Use:  npx jest -c jest.logic.config.js
 */
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.logic.setup.js'],
  testMatch: ['**/__tests__/unit/**/*.test.js', '**/__tests__/api/**/*.test.js'],
  transform: { '^.+\\.js$': 'babel-jest' },
  transformIgnorePatterns: ['node_modules/(?!(axios)/)'],
};
