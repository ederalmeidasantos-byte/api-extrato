// config-simulador.js
// Configurações do simulador INSS

export const configSimulador = {
  // URL da API principal (detecta automaticamente se é local ou produção)
  apiUrl: (() => {
    // Se estiver rodando localmente, usa localhost
    if (typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' || 
         window.location.hostname === '')) {
      return 'http://localhost:3000';
    }
    // Caso contrário, usa a URL de produção
    return 'https://api-extrato-1.onrender.com';
  })(),
  
  // Endpoints da API
  endpoints: {
    calcular: '/calcular',
    upload: '/upload',
    extrato: '/extrato'
  },
  
  // Configurações padrão
  defaults: {
    diaAverbacao: '15',
    especie: '32',
    trocoMinimo: 100
  },
  
  // Configurações de interface
  ui: {
    tema: 'lunas',
    cores: {
      primaria: '#00d4aa',
      secundaria: '#5a67d8',
      sucesso: '#059669',
      erro: '#dc2626',
      aviso: '#d97706'
    },
    animacoes: true,
    modoEscuro: false
  },
  
  // Configurações de validação
  validacao: {
    tamanhoMaximoArquivo: 10 * 1024 * 1024, // 10MB
    tiposArquivoPermitidos: ['application/pdf'],
    camposObrigatorios: ['cliente', 'beneficio', 'contratos']
  },
  
  // Configurações de cache
  cache: {
    habilitado: true,
    tempoExpiracao: 30 * 60 * 1000, // 30 minutos
    chavePrefix: 'simulador_inss_'
  },
  
  // Configurações de debug
  debug: {
    habilitado: (() => {
      // Habilita debug automaticamente em ambiente local
      if (typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' || 
           window.location.hostname === '')) {
        return true;
      }
      return false;
    })(),
    logLevel: 'info', // debug, info, warn, error
    mostrarDetalhes: (() => {
      // Mostra detalhes automaticamente em ambiente local
      if (typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' || 
           window.location.hostname === '')) {
        return true;
      }
      return false;
    })()
  }
};

// Função para obter configuração
export function getConfig(chave) {
  return chave ? configSimulador[chave] : configSimulador;
}

// Função para atualizar configuração
export function updateConfig(chave, valor) {
  if (typeof chave === 'object') {
    Object.assign(configSimulador, chave);
  } else {
    configSimulador[chave] = valor;
  }
}

// Função para construir URL da API
export function buildApiUrl(endpoint, params = {}) {
  const baseUrl = configSimulador.apiUrl;
  const endpointPath = configSimulador.endpoints[endpoint] || endpoint;
  
  let url = `${baseUrl}${endpointPath}`;
  
  if (params.fileId) {
    url += `/${params.fileId}`;
  }
  
  return url;
}

// Função para validar configuração
export function validarConfig() {
  const erros = [];
  
  if (!configSimulador.apiUrl) {
    erros.push('URL da API não configurada');
  }
  
  if (!configSimulador.endpoints.calcular) {
    erros.push('Endpoint de cálculo não configurado');
  }
  
  return {
    valida: erros.length === 0,
    erros: erros
  };
}
