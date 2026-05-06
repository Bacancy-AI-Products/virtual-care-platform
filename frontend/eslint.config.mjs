import nextCwv from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

/**
 * ESLint v9 flat config.
 *
 * Replaces the legacy .eslintrc.json (ESLint v7 format) which is incompatible
 * with ESLint v9 and caused `next lint` to crash with a circular-reference
 * JSON serialisation error.
 *
 * Rule sources:
 *   - nextCwv       → Next.js + React + accessibility + import rules
 *   - nextTs        → TypeScript parser + @typescript-eslint recommended rules
 *   - prettierRecommended → registers prettier plugin, enables prettier/prettier,
 *                            and disables all ESLint style rules Prettier owns
 *   - custom block  → logic rules carried forward from .eslintrc.json
 */
export default [
    ...nextCwv,
    ...nextTs,
    prettierRecommended,
    {
        rules: {
            // Disable the base rule — @typescript-eslint/no-unused-vars supersedes it
            'no-unused-vars': 'off',

            // Logic rules (not formatting — Prettier owns formatting)
            'no-unreachable': 'error',
            'no-unreachable-loop': 'error',
            'no-fallthrough': 'error',
            'no-console': ['warn', { allow: ['warn', 'error'] }],

            // Pre-existing violations — warn until cleaned up in follow-up PRs
            'react/no-unescaped-entities': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            // React 19 / React Compiler rules (new in next/core-web-vitals v16)
            'react-hooks/refs': 'warn',
            'react-hooks/immutability': 'warn',
            'react-hooks/static-components': 'warn',
            'react-hooks/preserve-manual-memoization': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                },
            ],
        },
    },
    {
        ignores: [
            // Build / tooling output — never lint generated files
            '.next/**',
            'dist/**',
            'build/**',
            'coverage/**',
            // node_modules is ignored by ESLint v9 by default but listed here
            // for clarity and to suppress the .eslintignore migration warning
            'node_modules/**',
            // Playwright config and e2e test files run in a different runtime
            // context (Node globals, test-only APIs). Lint them separately.
            'playwright.config.ts',
            'e2e/**',
        ],
    },
];
