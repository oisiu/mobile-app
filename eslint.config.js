const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  { ignores: ['.expo/**', 'coverage/**', 'dist/**'] },
  ...expoConfig,
  {
    rules: {
      // Loading orchestration intentionally resets local state when its external route/modal key changes.
      'react-hooks/set-state-in-effect': 'off',
      // React Native Animated values and events are mutable by design; this app does not enable React Compiler.
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'off',
    },
  },
]);
