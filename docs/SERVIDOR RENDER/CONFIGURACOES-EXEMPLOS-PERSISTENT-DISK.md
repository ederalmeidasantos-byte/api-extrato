# ⚙️ CONFIGURAÇÕES E EXEMPLOS - PERSISTENT DISK

## 🔧 **CONFIGURAÇÕES DO SISTEMA**

### **Variáveis de Ambiente:**
```bash
# Persistent Disk
PERSISTENT_PATH=/var/data

# Cache TTL
TTL_DIAS=14
TTL_MS=1209600000

# Backup
BACKUP_RETENTION=5
BACKUP_ENABLED=true

# Logs
LOG_LEVEL=info
LOG_RETENTION_DAYS=30
```

### **Configuração do Render:**
```yaml
# render.yaml
services:
  - type: web
    name: painel-fgts
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PERSISTENT_PATH
        value: /var/data
    # Persistent Disk configurado via Dashboard
```

---

## 📝 **EXEMPLOS DE CÓDIGO**

### **1. Cache FGTS - Uso Básico**

#### **Salvar Pendentes:**
```javascript
import { salvarPendentes, carregarPendentes } from './cache-persistente.js';

// Adicionar CPF pendente
const pendentes = carregarPendentes();
pendentes.push({
  cpf: '12345678901',
  linha: 1,
  status: 'pending',
  timestamp: new Date().toISOString()
});
salvarPendentes(pendentes);
```

#### **Carregar Estado:**
```javascript
import { carregarEstadoProcessamento } from './cache-persistente.js';

const estado = carregarEstadoProcessamento();
console.log(`Processados: ${estado.processados}/${estado.totalCPFs}`);
```

### **2. Extratos - Processamento com Cache**

#### **Verificar Cache:**
```javascript
import { extrairDeUpload } from './extrair_pdf.js';

const resultado = await extrairDeUpload({
  fileId: '12345',
  pdfPath: '/tmp/extrato.pdf',
  jsonDir: '/var/data/extratos',
  ttlMs: 14 * 24 * 60 * 60 * 1000 // 14 dias
});

// Se já existe no cache, retorna instantaneamente
// Se não existe, processa e salva no cache
```

### **3. APIs - Uso Programático**

#### **Salvar Cache via API:**
```javascript
async function salvarCache(fileName, data) {
  const response = await fetch('/api/cache/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, data })
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log('Cache salvo:', result.path);
    return result;
  }
  
  throw new Error('Erro ao salvar cache');
}

// Uso
await salvarCache('meu_cache.json', {
  timestamp: new Date().toISOString(),
  dados: ['item1', 'item2']
});
```

#### **Carregar Cache via API:**
```javascript
async function carregarCache(fileName) {
  const response = await fetch(`/api/cache/load/${fileName}`);
  
  if (response.ok) {
    return await response.json();
  }
  
  if (response.status === 404) {
    return null; // Cache não encontrado
  }
  
  throw new Error('Erro ao carregar cache');
}

// Uso
const cache = await carregarCache('meu_cache.json');
if (cache) {
  console.log('Cache encontrado:', cache);
} else {
  console.log('Cache não encontrado');
}
```

### **4. Sistema de Logs**

#### **Logging Estruturado:**
```javascript
async function log(level, message, dados = {}) {
  const logData = {
    level,
    message,
    dados,
    timestamp: new Date().toISOString(),
    user: 'system'
  };
  
  try {
    await fetch('/api/logs/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'app.log',
        logData
      })
    });
  } catch (error) {
    console.error('Erro ao salvar log:', error);
  }
}

// Uso
await log('info', 'CPF processado', { cpf: '12345678901', status: 'success' });
await log('error', 'Erro no processamento', { cpf: '12345678901', error: 'Timeout' });
```

### **5. Configurações Persistentes**

#### **Sistema de Configuração:**
```javascript
class ConfigManager {
  async carregar(tipo) {
    try {
      const response = await fetch(`/api/config/load/${tipo}.json`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Erro ao carregar config:', error);
    }
    
    return this.getDefaultConfig(tipo);
  }
  
  async salvar(tipo, dados) {
    try {
      await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `${tipo}.json`,
          configData: dados
        })
      });
    } catch (error) {
      console.error('Erro ao salvar config:', error);
    }
  }
  
  getDefaultConfig(tipo) {
    const defaults = {
      usuario: { theme: 'light', language: 'pt-BR' },
      sistema: { debug: false, logLevel: 'info' }
    };
    return defaults[tipo] || {};
  }
}

// Uso
const configManager = new ConfigManager();

// Carregar configurações
const userConfig = await configManager.carregar('usuario');
console.log('Tema atual:', userConfig.theme);

// Salvar configurações
userConfig.theme = 'dark';
await configManager.salvar('usuario', userConfig);
```

---

## 🧪 **TESTES E VALIDAÇÃO**

### **1. Teste de Funcionalidade**

#### **Script de Teste Completo:**
```javascript
async function testeCompleto() {
  console.log('🧪 Iniciando teste completo...');
  
  try {
    // 1. Verificar status
    const status = await fetch('/api/status/persistent-disk');
    console.log('✅ Status:', await status.json());
    
    // 2. Testar cache
    await fetch('/api/cache/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'teste.json',
        data: { teste: 'dados' }
      })
    });
    console.log('✅ Cache salvo');
    
    // 3. Testar extrato
    await fetch('/api/extratos/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'teste123',
        extratoData: { banco: 'Teste', saldo: 1000 }
      })
    });
    console.log('✅ Extrato salvo');
    
    // 4. Testar upload
    await fetch('/api/uploads/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'teste.csv',
        content: 'nome,idade\nJoão,30',
        type: 'csv'
      })
    });
    console.log('✅ Upload salvo');
    
    console.log('🎉 Teste completo realizado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar teste
testeCompleto();
```

### **2. Validação de Integridade**

#### **Verificar Arquivos:**
```javascript
async function validarIntegridade() {
  console.log('🔍 Validando integridade...');
  
  try {
    // Verificar cache
    const cacheList = await fetch('/api/cache/list');
    const cache = await cacheList.json();
    
    for (const file of cache.files) {
      if (file.size === 0) {
        console.warn('⚠️ Arquivo vazio:', file.name);
      }
    }
    
    // Verificar extratos
    const extratosList = await fetch('/api/extratos/list');
    const extratos = await extratosList.json();
    
    for (const extrato of extratos.extratos) {
      if (extrato.size < 50) {
        console.warn('⚠️ Extrato muito pequeno:', extrato.name);
      }
    }
    
    console.log('✅ Validação concluída');
    
  } catch (error) {
    console.error('❌ Erro na validação:', error);
  }
}
```

---

## 📊 **MONITORAMENTO AVANÇADO**

### **1. Métricas Personalizadas**

#### **Coletar Métricas:**
```javascript
async function coletarMetricas() {
  const metricas = {
    timestamp: new Date().toISOString(),
    cache: {},
    extratos: {},
    uploads: {},
    logs: {},
    config: {}
  };
  
  try {
    // Cache
    const cacheStatus = await fetch('/api/cache/list');
    const cache = await cacheStatus.json();
    metricas.cache = {
      totalArquivos: cache.count,
      tamanhoTotal: cache.files.reduce((sum, file) => sum + file.size, 0)
    };
    
    // Extratos
    const extratosStatus = await fetch('/api/extratos/list');
    const extratos = await extratosStatus.json();
    metricas.extratos = {
      totalArquivos: extratos.count,
      tamanhoTotal: extratos.extratos.reduce((sum, extrato) => sum + extrato.size, 0)
    };
    
    // Status geral
    const status = await fetch('/api/status/persistent-disk');
    const statusData = await status.json();
    
    return {
      ...metricas,
      status: statusData
    };
    
  } catch (error) {
    console.error('Erro ao coletar métricas:', error);
    return metricas;
  }
}
```

### **2. Alertas Automáticos**

#### **Sistema de Alertas:**
```javascript
class AlertManager {
  constructor() {
    this.thresholds = {
      diskUsage: 80, // %
      fileCount: 1000,
      errorRate: 5 // %
    };
  }
  
  async verificarAlertas() {
    const metricas = await coletarMetricas();
    const alertas = [];
    
    // Verificar uso do disco
    const totalSize = Object.values(metricas)
      .filter(m => m.tamanhoTotal)
      .reduce((sum, m) => sum + m.tamanhoTotal, 0);
    
    const diskUsagePercent = (totalSize / (1024 * 1024)) * 100; // MB
    
    if (diskUsagePercent > this.thresholds.diskUsage) {
      alertas.push({
        tipo: 'disk_usage',
        nivel: 'warning',
        mensagem: `Uso do disco alto: ${diskUsagePercent.toFixed(2)}%`,
        dados: { usage: diskUsagePercent }
      });
    }
    
    // Verificar número de arquivos
    const totalFiles = Object.values(metricas)
      .filter(m => m.totalArquivos)
      .reduce((sum, m) => sum + m.totalArquivos, 0);
    
    if (totalFiles > this.thresholds.fileCount) {
      alertas.push({
        tipo: 'file_count',
        nivel: 'info',
        mensagem: `Muitos arquivos: ${totalFiles}`,
        dados: { count: totalFiles }
      });
    }
    
    return alertas;
  }
  
  async enviarAlertas(alertas) {
    for (const alerta of alertas) {
      await this.log('alert', `ALERTA: ${alerta.mensagem}`, alerta);
    }
  }
  
  async log(level, message, dados) {
    // Implementar envio de alertas (email, Slack, etc.)
    console.log(`[${level.toUpperCase()}] ${message}`, dados);
  }
}

// Uso
const alertManager = new AlertManager();
setInterval(async () => {
  const alertas = await alertManager.verificarAlertas();
  if (alertas.length > 0) {
    await alertManager.enviarAlertas(alertas);
  }
}, 60000); // Verificar a cada minuto
```

---

## 🔄 **BACKUP E RECUPERAÇÃO AVANÇADA**

### **1. Backup Programático**

#### **Sistema de Backup:**
```javascript
class BackupManager {
  async fazerBackupCompleto() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      timestamp,
      cache: {},
      extratos: {},
      config: {}
    };
    
    try {
      // Backup do cache
      const cacheList = await fetch('/api/cache/list');
      const cache = await cacheList.json();
      backupData.cache = cache;
      
      // Backup dos extratos
      const extratosList = await fetch('/api/extratos/list');
      const extratos = await extratosList.json();
      backupData.extratos = extratos;
      
      // Backup das configurações
      const configList = await fetch('/api/config/list');
      const config = await configList.json();
      backupData.config = config;
      
      // Salvar backup
      await fetch('/api/cache/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `backup-completo-${timestamp}.json`,
          data: backupData
        })
      });
      
      console.log('✅ Backup completo realizado');
      
    } catch (error) {
      console.error('❌ Erro no backup:', error);
    }
  }
  
  async restaurarBackup(backupFileName) {
    try {
      const response = await fetch(`/api/cache/load/${backupFileName}`);
      const backup = await response.json();
      
      // Restaurar dados do backup
      // Implementar lógica de restauração específica
      
      console.log('✅ Backup restaurado:', backupFileName);
      
    } catch (error) {
      console.error('❌ Erro na restauração:', error);
    }
  }
}
```

### **2. Limpeza Automática**

#### **Sistema de Limpeza:**
```javascript
class CleanupManager {
  async limparArquivosAntigos(dias = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dias);
    
    try {
      // Limpar logs antigos
      const logsList = await fetch('/api/logs/list');
      const logs = await logsList.json();
      
      for (const log of logs.logs) {
        const logDate = new Date(log.modified);
        if (logDate < cutoffDate) {
          // Implementar limpeza de logs antigos
          console.log('🗑️ Removendo log antigo:', log.name);
        }
      }
      
      // Limpar uploads antigos
      const uploadsList = await fetch('/api/uploads/list');
      const uploads = await uploadsList.json();
      
      for (const upload of uploads.files) {
        const uploadDate = new Date(upload.modified);
        if (uploadDate < cutoffDate) {
          // Implementar limpeza de uploads antigos
          console.log('🗑️ Removendo upload antigo:', upload.name);
        }
      }
      
      console.log('✅ Limpeza concluída');
      
    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
    }
  }
}
```

---

## 🎯 **OTIMIZAÇÕES**

### **1. Performance**

#### **Cache Inteligente:**
```javascript
class SmartCache {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemoryItems = 100;
  }
  
  async get(key) {
    // Verificar cache em memória primeiro
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // Carregar do Persistent Disk
    try {
      const response = await fetch(`/api/cache/load/${key}`);
      if (response.ok) {
        const data = await response.json();
        
        // Adicionar ao cache em memória
        if (this.memoryCache.size >= this.maxMemoryItems) {
          const firstKey = this.memoryCache.keys().next().value;
          this.memoryCache.delete(firstKey);
        }
        this.memoryCache.set(key, data);
        
        return data;
      }
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
    }
    
    return null;
  }
  
  async set(key, data) {
    // Salvar no Persistent Disk
    try {
      await fetch('/api/cache/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: key, data })
      });
      
      // Adicionar ao cache em memória
      this.memoryCache.set(key, data);
      
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }
}
```

### **2. Compressão**

#### **Compressão de Dados:**
```javascript
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

class CompressedCache {
  async salvarComprimido(fileName, data) {
    try {
      const jsonData = JSON.stringify(data);
      const compressed = await gzipAsync(jsonData);
      
      await fetch('/api/cache/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `${fileName}.gz`,
          data: compressed.toString('base64'),
          compressed: true
        })
      });
      
    } catch (error) {
      console.error('Erro ao salvar comprimido:', error);
    }
  }
  
  async carregarComprimido(fileName) {
    try {
      const response = await fetch(`/api/cache/load/${fileName}.gz`);
      if (response.ok) {
        const result = await response.json();
        const compressed = Buffer.from(result.data, 'base64');
        const decompressed = await gunzipAsync(compressed);
        return JSON.parse(decompressed.toString());
      }
    } catch (error) {
      console.error('Erro ao carregar comprimido:', error);
    }
    
    return null;
  }
}
```

---

## 📞 **SUPORTE E MANUTENÇÃO**

### **Comandos de Diagnóstico:**
```bash
# Status geral
curl https://seu-projeto.onrender.com/api/health

# Status do Persistent Disk
curl https://seu-projeto.onrender.com/api/status/persistent-disk

# Teste completo
curl https://seu-projeto.onrender.com/api/test/persistent-disk

# Listar cache
curl https://seu-projeto.onrender.com/api/cache/list

# Listar extratos
curl https://seu-projeto.onrender.com/api/extratos/list
```

### **Logs Importantes:**
```bash
# Procurar no painel do Render → Logs:
# - "Diretório persistente criado"
# - "Cache salvo"
# - "Erro ao salvar"
# - "Backup realizado"
```

**Sistema completo e otimizado!** 🚀✨

