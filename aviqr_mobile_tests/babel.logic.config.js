// Explicit logic-test babel config — overrides expo's babel.config.js for files
// from the symlinked src/ directory, ensuring jest module mocks work correctly.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};