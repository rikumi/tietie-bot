module.exports = () => {
  if (Math.random() < 0.5) {
    return 'SyntaxError: Cannot use import statement outside a module.';
  }
  return 'Error [ERR_REQUIRE_ESM]: require() of ES Module not supported.';
};
