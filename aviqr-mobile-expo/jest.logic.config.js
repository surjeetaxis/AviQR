/** Lightweight Jest config for pure-logic tests (no React Native renderer).
 *  Uses its OWN babel config so it never interferes with the app's Metro/Expo babel.
 *  Use:  npm run test:logic
 */
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.logic.setup.js'],
  testMatch: ['**/__tests__/unit/**/*.test.js', '**/__tests__/api/**/*.test.js'],
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.logic.config.js' }],
  },
  transformIgnorePatterns: ['node_modules/(?!(axios)/)'],
};
