module.exports = {
  // Ambiente de teste
  testEnvironment: 'node',
  
  // Diretórios de teste
  testMatch: [
    '**/test-*.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  
  // Diretórios a serem ignorados
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/docs/'
  ],
  
  // Cobertura de código
  collectCoverage: true,
  collectCoverageFrom: [
    '*.js',
    '!test-*.js',
    '!examples.js',
    '!jest.config.js',
    '!index.js'
  ],
  
  // Diretório de cobertura
  coverageDirectory: 'coverage',
  
  // Formatos de cobertura
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  
  // Limites de cobertura
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup de testes
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Timeout para testes
  testTimeout: 10000,
  
  // Verbose
  verbose: true,
  
  // Clear mocks
  clearMocks: true,
  
  // Restore mocks
  restoreMocks: true,
  
  // Reset mocks
  resetMocks: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit
  forceExit: true,
  
  // Detect leaks
  detectLeaks: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Globals
  globals: {
    'process.env.NODE_ENV': 'test'
  },
  
  // Module name mapper
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // Transform
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(axios)/)'
  ],
  
  // Test results processor
  testResultsProcessor: 'jest-sonar-reporter',
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml'
    }]
  ]
};



