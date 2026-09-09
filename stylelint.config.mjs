export default {
  ignoreFiles: [
    '**/dist/**',
    '**/node_modules/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
  ],
  rules: {
    // App uses kebab-case blocks with BEM __element / --modifier; not literal single-segment kebab-case.
    'selector-class-pattern': [
      '^([a-z0-9]+(?:-[a-z0-9]+)*)(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$',
      { resolveNestedSelectors: true },
    ],
    // Intentional source order for cascade; reordering risks regressions (see src/styles/README.md).
    'no-descending-specificity': null,
    'selector-pseudo-class-no-unknown': [
      true,
      { ignorePseudoClasses: ['tool-form-active', 'tool-submit-active'] },
    ],
  },
};
