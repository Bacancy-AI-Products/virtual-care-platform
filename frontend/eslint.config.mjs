import nextConfig from 'eslint-config-next/core-web-vitals';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import prettierConfig from 'eslint-config-prettier';

export default [
  ...nextConfig,
  prettierRecommended,
  prettierConfig,
  {
    rules: {
      // Pre-existing violations — warn until cleaned up, then harden to error
      'react-compiler/react-compiler': 'warn',
      'react/no-unescaped-entities': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Hard errors for new code
      'no-unused-vars': 'off',
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-fallthrough': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    ignores: ['dist/**', 'coverage/**'],
  },
];
