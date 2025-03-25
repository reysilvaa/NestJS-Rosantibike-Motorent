import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  js.configs.recommended,
  ...compat.extends(
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:unicorn/recommended'
  ),
  {
    ignores: [
      'dist/', 
      'node_modules/', 
      'eslint.config.mjs',
      'test/**/*.ts',
      'src/**/*.spec.ts',
      'src/**/__tests__/**/*.ts'
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    rules: {
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
      'no-console': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          'selector': 'default',
          'format': ['camelCase']
        },
        {
          'selector': 'variable',
          'format': ['camelCase', 'UPPER_CASE']
        },
        {
          'selector': 'parameter',
          'format': ['camelCase'],
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'memberLike',
          'modifiers': ['private'],
          'format': ['camelCase'],
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'typeLike',
          'format': ['PascalCase']
        },
        {
          'selector': 'class',
          'format': ['PascalCase']
        },
        {
          'selector': 'interface',
          'format': ['PascalCase'],
          'prefix': ['I']
        },
        {
          'selector': 'enum',
          'format': ['PascalCase']
        },
        {
          'selector': 'enumMember',
          'format': ['UPPER_CASE']
        }
      ],
      'unicorn/filename-case': [
        'error',
        {
          'case': 'kebabCase'
        }
      ]
    },
  },
];
