import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_'
      }],
      'react-refresh/only-export-components': ['warn', { 
        allowExportNames: [
          'curvesPlugin', 'editPlugin', 'gridPlugin', 'guidelinesPlugin', 
          'shapePlugin', 'subpathPlugin', 'transformationPlugin',
          'useCanvasCurves', 'useCanvasTransformControls'
        ],
        allowConstantExport: true,
      }],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['src/plugins/index.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
