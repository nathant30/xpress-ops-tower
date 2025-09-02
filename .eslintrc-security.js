// ESLint Security Configuration for Xpress Ops Tower
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: [
    'security',
    '@typescript-eslint',
    'react-hooks'
  ],
  env: {
    node: true,
    browser: true,
    es2022: true
  },
  rules: {
    // Security-focused rules
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-object-injection': 'warn',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-unsafe-regex': 'error',

    // Custom security rules for emergency/rideshare systems
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-alert': 'error',
    'no-console': 'warn', // Allow console for debugging but warn
    
    // Data protection rules
    'no-unused-vars': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    
    // Authentication/authorization specific
    'no-constant-condition': ['error', { 'checkLoops': false }],
    'eqeqeq': ['error', 'always'],
    'no-multi-assign': 'error',
    'no-param-reassign': 'error',
    
    // Emergency system security
    'prefer-const': 'error',
    'no-var': 'error',
    'no-undef': 'error',
    
    // React security (for frontend components)
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  },
  overrides: [
    {
      // More strict rules for authentication/authorization files
      files: [
        'src/lib/auth/**/*.ts',
        'src/lib/auth/**/*.js',
        'src/middleware/**/*.ts',
        'src/middleware/**/*.js',
        'src/lib/security/**/*.ts',
        'src/lib/security/**/*.js'
      ],
      rules: {
        'security/detect-object-injection': 'error',
        'security/detect-non-literal-fs-filename': 'error',
        'security/detect-non-literal-require': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        'no-console': 'error'
      }
    },
    {
      // Emergency system files - ultra strict
      files: [
        'src/lib/emergencyAlerts.ts',
        'src/lib/emergencyResponseAutomation.ts',
        'src/lib/sosAlertProcessor.ts',
        'src/components/**/Emergency*.tsx',
        'src/components/**/SOS*.tsx'
      ],
      rules: {
        'security/detect-object-injection': 'error',
        'security/detect-possible-timing-attacks': 'error',
        'security/detect-unsafe-regex': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        'no-console': 'error',
        'prefer-const': 'error',
        'no-var': 'error'
      }
    },
    {
      // API route files
      files: [
        'src/app/api/**/*.ts',
        'src/pages/api/**/*.ts'
      ],
      rules: {
        'security/detect-object-injection': 'error',
        'security/detect-non-literal-fs-filename': 'error',
        'security/detect-eval-with-expression': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error'
      }
    },
    {
      // Test files - more lenient but still secure
      files: [
        '**/*.test.ts',
        '**/*.test.js',
        '**/*.spec.ts',
        '**/*.spec.js',
        '__tests__/**/*.ts',
        '__tests__/**/*.js'
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-console': 'off',
        'security/detect-object-injection': 'warn'
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    '*.min.js'
  ]
};