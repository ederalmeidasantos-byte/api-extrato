/**
 * Setup do Jest
 * Configurações globais para testes
 */

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.KENTRO_TOKEN = 'test_token_123456789';
process.env.KENTRO_API_KEY = 'test_api_key_123456789';
process.env.KENTRO_API_URL_DEV = 'https://api-kentro-test.lunas.com.br/v1';
process.env.KENTRO_API_URL_PROD = 'https://api-kentro.lunas.com.br/v1';

// Configurar timeouts
jest.setTimeout(10000);

// Mock do console para testes
global.console = {
  ...console,
  // Manter console.error e console.warn para debug
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock do axios
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      defaults: {
        headers: {
          common: {}
        }
      }
    })),
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn()
  };
  
  return mockAxios;
});

// Mock do dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock do fs para testes
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  unlinkSync: jest.fn()
}));

// Mock do path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(),
  basename: jest.fn(),
  extname: jest.fn()
}));

// Mock do os
jest.mock('os', () => ({
  platform: jest.fn(() => 'win32'),
  arch: jest.fn(() => 'x64'),
  cpus: jest.fn(() => [{ model: 'Intel Core i7' }]),
  totalmem: jest.fn(() => 8589934592),
  freemem: jest.fn(() => 4294967296),
  uptime: jest.fn(() => 3600)
}));

// Mock do crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('1234567890123456')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'hash123456789')
  })),
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'hmac123456789')
  }))
}));

// Mock do timers
jest.useFakeTimers();

// Configurar mocks globais
global.mockAxios = require('axios');

// Helper para limpar mocks
global.clearAllMocks = () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.resetAllMocks();
  jest.restoreAllMocks();
};

// Helper para mock de resposta da API
global.mockApiResponse = (data, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  config: {}
});

// Helper para mock de erro da API
global.mockApiError = (message, status = 400, code = 'ERROR') => ({
  response: {
    data: { error: message, code },
    status,
    statusText: 'Bad Request',
    headers: { 'content-type': 'application/json' }
  },
  message,
  config: {}
});

// Helper para mock de erro de rede
global.mockNetworkError = (message = 'Network Error') => ({
  request: {},
  message,
  config: {}
});

// Configurar beforeAll
beforeAll(() => {
  // Configurações antes de todos os testes
  console.log('🧪 Iniciando testes da API Kentro...');
});

// Configurar afterAll
afterAll(() => {
  // Limpeza após todos os testes
  console.log('✅ Testes da API Kentro concluídos!');
  jest.clearAllTimers();
});

// Configurar beforeEach
beforeEach(() => {
  // Limpeza antes de cada teste
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Configurar afterEach
afterEach(() => {
  // Limpeza após cada teste
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Exportar helpers para uso nos testes
module.exports = {
  mockApiResponse: global.mockApiResponse,
  mockApiError: global.mockApiError,
  mockNetworkError: global.mockNetworkError,
  clearAllMocks: global.clearAllMocks
};



