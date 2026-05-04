import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

/**
 * ESLint v9 flat config for the Express/TypeScript backend.
 *
 * Rule sources:
 *   - tseslint.configs.recommended → TypeScript parser + @typescript-eslint recommended rules
 *   - prettierRecommended          → registers prettier plugin, enables prettier/prettier,
 *                                    and disables all ESLint style rules Prettier owns
 *   - custom block                 → project-specific overrides
 */
export default [
    ...tseslint.configs.recommended,
    prettierRecommended,
    {
        rules: {
            // Disable base rule — @typescript-eslint/no-unused-vars supersedes it
            'no-unused-vars': 'off',

            // Logic rules
            'no-unreachable': 'error',
            'no-fallthrough': 'error',
            'no-console': ['warn', { allow: ['warn', 'error'] }],

            // Pre-existing violations — warn until cleaned up
            '@typescript-eslint/no-explicit-any': 'warn',
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
            'dist/**',
            'generated/**', // Prisma client
            'node_modules/**',
        ],
    },
];
