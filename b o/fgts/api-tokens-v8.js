import axios from 'axios';

// 🔐 API de Tokens V8 - Sistema de Contingência

// 🔐 API de Tokens V8 - Sistema de Contingência
class ApiTokensV8 {
  constructor() {
    this.baseUrl = process.env.API_TOKENS_URL || 'https://api-extrato-1.onrender.com';
    this.credentials = this.loadCredentials();
    this.tokenCache = new Map(); // Cache de tokens por credencial
    this.lastTokenTime = new Map(); // Timestamp do último token gerado
    this.tokenValidity = 24 * 60 * 60 * 1000; // 24 horas em ms
    this.retryDelay = 5000; // 5 segundos entre tentativas
    this.maxRetries = 3;
  }

  // Carregar credenciais do .env
  loadCredentials() {
    const credentials = [];
    for (let i = 1; process.env[`FGTS_USER_${i}`]; i++) {
      credentials.push({
        username: process.env[`FGTS_USER_${i}`],
        password: process.env[`FGTS_PASS_${i}`],
        index: i
      });
    }
    return credentials;
  }

  // Verificar se a API de tokens está disponível
  async checkApiHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 10000
      });
      return response.status === 200;
    } catch (error) {
      console.log(`[API-TOKENS] ❌ API de tokens indisponível: ${error.message}`);
      return false;
    }
  }

  // Obter token do cache se ainda válido
  getCachedToken(username) {
    const tokenData = this.tokenCache.get(username);
    if (tokenData) {
      const now = Date.now();
      const tokenAge = now - this.lastTokenTime.get(username);
      
      if (tokenAge < this.tokenValidity) {
        console.log(`[API-TOKENS] ✅ Token válido encontrado no cache para ${username}`);
        return tokenData.access_token;
      } else {
        console.log(`[API-TOKENS] ⏰ Token expirado para ${username}, removendo do cache`);
        this.tokenCache.delete(username);
        this.lastTokenTime.delete(username);
      }
    }
    return null;
  }

  // Gerar novo token via API de tokens
  async generateToken(username, password) {
    try {
      console.log(`[API-TOKENS] 🔑 Gerando token via API para ${username}`);
      
      const response = await axios.post(`${this.baseUrl}/authenticate`, {
        username,
        password
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.success && response.data.access_token) {
        const token = response.data.access_token;
        
        // Armazenar no cache
        this.tokenCache.set(username, response.data);
        this.lastTokenTime.set(username, Date.now());
        
        console.log(`[API-TOKENS] ✅ Token gerado com sucesso para ${username}`);
        return token;
      } else {
        throw new Error(`Resposta inválida da API: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.error(`[API-TOKENS] ❌ Erro ao gerar token para ${username}:`, error.message);
      throw error;
    }
  }

  // Obter token (cache ou gerar novo)
  async getToken(username, password) {
    // Tentar obter do cache primeiro
    const cachedToken = this.getCachedToken(username);
    if (cachedToken) {
      return cachedToken;
    }

    // Se não tem no cache, gerar novo
    return await this.generateToken(username, password);
  }

  // Obter token para uma credencial específica
  async getTokenForCredential(credentialIndex) {
    const credential = this.credentials[credentialIndex];
    if (!credential) {
      throw new Error(`Credencial ${credentialIndex} não encontrada`);
    }

    return await this.getToken(credential.username, credential.password);
  }

  // Obter token para qualquer credencial disponível (com retry)
  async getTokenWithFallback(startIndex = 0) {
    let lastError = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      for (let i = 0; i < this.credentials.length; i++) {
        const credentialIndex = (startIndex + i) % this.credentials.length;
        const credential = this.credentials[credentialIndex];
        
        try {
          console.log(`[API-TOKENS] 🔄 Tentativa ${attempt + 1}/${this.maxRetries} - Credencial ${credentialIndex + 1}/${this.credentials.length}: ${credential.username}`);
          
          const token = await this.getToken(credential.username, credential.password);
          
          if (token) {
            console.log(`[API-TOKENS] ✅ Token obtido com sucesso via credencial ${credentialIndex + 1}`);
            return {
              token,
              credentialIndex,
              username: credential.username
            };
          }
        } catch (error) {
          lastError = error;
          console.log(`[API-TOKENS] ❌ Falha na credencial ${credentialIndex + 1}: ${error.message}`);
          
          // Se for erro 429, aguardar antes de tentar próxima credencial
          if (error.response?.status === 429) {
            console.log(`[API-TOKENS] ⏳ Rate limit detectado, aguardando ${this.retryDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          }
        }
      }
      
      // Aguardar antes de próxima tentativa
      if (attempt < this.maxRetries - 1) {
        console.log(`[API-TOKENS] ⏳ Aguardando ${this.retryDelay}ms antes da próxima tentativa`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    
    throw new Error(`Falha ao obter token após ${this.maxRetries} tentativas. Último erro: ${lastError?.message}`);
  }

  // Limpar cache de tokens
  clearCache() {
    this.tokenCache.clear();
    this.lastTokenTime.clear();
    console.log(`[API-TOKENS] 🧹 Cache de tokens limpo`);
  }

  // Obter estatísticas do cache
  getCacheStats() {
    const stats = {
      totalCached: this.tokenCache.size,
      credentials: this.credentials.length,
      cacheDetails: []
    };
    
    for (const [username, tokenData] of this.tokenCache.entries()) {
      const age = Date.now() - this.lastTokenTime.get(username);
      const ageMinutes = Math.round(age / (1000 * 60));
      const isValid = age < this.tokenValidity;
      
      stats.cacheDetails.push({
        username,
        isValid,
        ageMinutes,
        expiresIn: Math.max(0, Math.round((this.tokenValidity - age) / (1000 * 60)))
      });
    }
    
    return stats;
  }

  // Verificar se deve usar API de tokens (quando logins diretos falham)
  shouldUseApiTokens(directAuthFailures = 0, maxDirectFailures = 3) {
    return directAuthFailures >= maxDirectFailures;
  }
}

// Instância singleton
const apiTokens = new ApiTokensV8();

export default apiTokens;
export { ApiTokensV8 };









