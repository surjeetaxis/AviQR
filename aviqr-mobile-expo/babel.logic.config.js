// Separate babel config ONLY for the logic test runner (jest.logic.config.js).
// Keeps @babel/preset-env out of the app's Metro bundling.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
  ],
};
