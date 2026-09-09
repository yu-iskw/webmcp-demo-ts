import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@typescript-template/app',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
