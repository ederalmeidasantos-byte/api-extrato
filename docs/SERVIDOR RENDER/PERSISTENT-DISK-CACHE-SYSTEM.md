# 🗄️ PERSISTENT DISK E SISTEMAS DE CACHE - RENDER

## 📋 **ÍNDICE**
1. [Visão Geral](#visão-geral)
2. [Configuração do Persistent Disk](#configuração-do-persistent-disk)
3. [Estrutura de Diretórios](#estrutura-de-diretórios)
4. [Sistemas de Cache](#sistemas-de-cache)
5. [APIs de Gerenciamento](#apis-de-gerenciamento)
6. [Monitoramento e Logs](#monitoramento-e-logs)
7. [Backup e Recuperação](#backup-e-recuperação)
8. [Troubleshooting](#troubleshooting)
9. [Exemplos de Uso](#exemplos-de-uso)

---

## 🎯 **VISÃO GERAL**

### **O que é o Persistent Disk?**
O Persistent Disk é um sistema de armazenamento persistente do Render que permite preservar arquivos entre deploys e reinicializações do serviço.

### **Problema Resolvido:**
- ❌ **Sem Persistent Disk**: Arquivos são perdidos a cada deploy
- ✅ **Com Persistent Disk**: Dados persistem permanentemente

### **Vantagens:**
- ✅ **Persistência**: Dados nunca se perdem
- ✅ **Performance**: Cache rápido e eficiente
- ✅ **Confiabilidade**: Sistema robusto com backups
- ✅ **Escalabilidade**: Preparado para crescimento

---

## ⚙️ **CONFIGURAÇÃO DO PERSISTENT DISK**

### **1. Configuração no Render Dashboard**
1. Acesse: https://dashboard.render.com
2. Entre no seu projeto
3. Vá em **Settings** → **Disks**
4. Clique em **"Add Disk"**
5. Configure:
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB` (ou conforme necessário)
6. Clique em **"Add Disk"**

### **2. Configuração Automática no Código**
```javascript
// Configuração automática no server.js
const PERSISTENT_PATH = '/var/data';
const PERSISTENT_DIRS = {
  cache: `${PERSISTENT_PATH}/cache`,
  extratos: `${PERSISTENT_PATH}/extratos`,
  uploads: `${PERSISTENT_PATH}/uploads`,
  logs: `${PERSISTENT_PATH}/logs`,
  config: `${PERSISTENT_PATH}/config`
};

// Criação automática de diretórios
async function ensurePersistentDirectories() {
  for (const [name, dirPath] of Object.entries(PERSISTENT_DIRS)) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Diretório persistente criado: ${dirPath}`);
    }
  }
}
```

---

## 📁 **ESTRUTURA DE DIRETÓRIOS**

### **Estrutura Completa:**
```
/var/data/
├── cache/                    # Cache do sistema FGTS
│   ├── pendentes.json       # Lista de CPFs pendentes
│   ├── tentativas-cache.json # Tentativas de cache V8
│   ├── estado-processamento.json # Estado geral do sistema
│   ├── listas-resultados.json # Resultados por categoria
│   └── backups/             # Backups automáticos
│       ├── pendentes-2024-01-15T10-30-00-000Z.json
│       └── estado-2024-01-15T10-30-00-000Z.json
├── extratos/                # Extratos JSON processados
│   ├── extrato_12345.json   # Extrato processado
│   ├── extrato_67890.json   # Outro extrato
│   └── ...
├── uploads/                 # Arquivos enviados
│   ├── dados_teste.csv      # CSV de teste
│   ├── documento.pdf        # PDF enviado
│   └── ...
├── logs/                    # Logs do sistema
│   ├── app.log             # Log principal
│   ├── error.log           # Log de erros
│   └── ...
└── config/                  # Configurações
    ├── app_config.json      # Configurações da aplicação
    ├── user_preferences.json # Preferências do usuário
    └── ...
```

### **Descrição de Cada Diretório:**

#### **📁 `/var/data/cache/`**
- **Propósito**: Cache do sistema FGTS
- **Arquivos**: Pendentes, tentativas, estado, listas
- **Tamanho**: ~4KB (cresce conforme uso)
- **Backup**: Automático (últimos 5 backups)

#### **📄 `/var/data/extratos/`**
- **Propósito**: Extratos JSON processados
- **Arquivos**: `extrato_{id}.json`
- **Tamanho**: ~100-500KB por extrato
- **TTL**: 14 dias (configurável)

#### **📁 `/var/data/uploads/`**
- **Propósito**: Arquivos enviados pelos usuários
- **Tipos**: CSV, PDF, imagens
- **Tamanho**: Variável
- **Limpeza**: Manual ou automática

#### **📝 `/var/data/logs/`**
- **Propósito**: Logs do sistema
- **Formato**: JSON com timestamp
- **Rotação**: Automática
- **Retenção**: 30 dias

#### **⚙️ `/var/data/config/`**
- **Propósito**: Configurações persistentes
- **Arquivos**: Configurações de usuário e sistema
- **Sincronização**: Manual via API
- **Backup**: Automático

---

## 💾 **SISTEMAS DE CACHE**

### **1. Cache FGTS (cache-persistente.js)**

#### **Arquivos de Cache:**
```javascript
// Arquivos principais
const PENDENTES_FILE = '/var/data/cache/pendentes.json';
const TENTATIVAS_FILE = '/var/data/cache/tentativas-cache.json';
const ESTADO_FILE = '/var/data/cache/estado-processamento.json';
const LISTAS_FILE = '/var/data/cache/listas-resultados.json';
```

#### **Funcionalidades:**
- **Pendentes**: Lista de CPFs aguardando processamento
- **Tentativas**: Controle de tentativas de cache V8
- **Estado**: Estado geral do processamento
- **Listas**: Resultados categorizados (sucessos, pendentes, etc.)

#### **Backup Automático:**
```javascript
// Backup antes de cada alteração
function fazerBackup(arquivo) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `${BACKUP_DIR}/${nomeArquivo}-${timestamp}.json`;
  fs.copyFileSync(arquivo, backupFile);
  
  // Manter apenas os 5 backups mais recentes
  // ...
}
```

### **2. Cache de Extratos (extrair_pdf.js)**

#### **Funcionamento:**
```javascript
// Verificação de cache válido
if (fs.existsSync(jsonPath) && cacheValido(jsonPath, ttlMs)) {
  console.log("♻️ Usando JSON cacheado válido");
  return JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
}

// Salvamento no Persistent Disk
const PERSISTENT_EXTRATOS_DIR = '/var/data/extratos';
await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2));
```

#### **TTL (Time To Live):**
- **Padrão**: 14 dias
- **Configurável**: Via variável `TTL_DIAS`
- **Validação**: Baseada em timestamp de modificação

### **3. Cache de Uploads**

#### **Tipos Suportados:**
- **CSV**: Dados tabulares
- **JSON**: Dados estruturados
- **Texto**: Arquivos de texto simples
- **Binário**: PDFs, imagens

#### **Processamento:**
```javascript
// Determinar tipo de salvamento
if (type === 'json') {
  await fsp.writeFile(filePath, JSON.stringify(content, null, 2));
} else if (type === 'csv') {
  await fsp.writeFile(filePath, content);
} else {
  await fsp.writeFile(filePath, content);
}
```

---

## 🔌 **APIS DE GERENCIAMENTO**

### **1. APIs de Cache**

#### **Salvar Cache:**
```bash
POST /api/cache/save
Content-Type: application/json

{
  "fileName": "meu_cache.json",
  "data": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "dados": ["item1", "item2"]
  }
}
```

#### **Carregar Cache:**
```bash
GET /api/cache/load/meu_cache.json
```

#### **Listar Cache:**
```bash
GET /api/cache/list
```

### **2. APIs de Extratos**

#### **Salvar Extrato:**
```bash
POST /api/extratos/save
Content-Type: application/json

{
  "id": "12345",
  "extratoData": {
    "banco": "Banco do Brasil",
    "conta": "12345-6",
    "saldo": 1500.75
  }
}
```

#### **Carregar Extrato:**
```bash
GET /api/extratos/12345
```

#### **Listar Extratos:**
```bash
GET /api/extratos/list
```

### **3. APIs de Upload**

#### **Salvar Upload:**
```bash
POST /api/uploads/save
Content-Type: application/json

{
  "fileName": "dados.csv",
  "content": "nome,idade\nJoão,30",
  "type": "csv"
}
```

### **4. APIs de Logs**

#### **Salvar Log:**
```bash
POST /api/logs/save
Content-Type: application/json

{
  "fileName": "app.log",
  "logData": {
    "level": "info",
    "message": "Operação realizada",
    "user": "admin"
  }
}
```

### **5. APIs de Configuração**

#### **Salvar Config:**
```bash
POST /api/config/save
Content-Type: application/json

{
  "fileName": "app_config.json",
  "configData": {
    "theme": "dark",
    "language": "pt-BR"
  }
}
```

### **6. APIs de Monitoramento**

#### **Status do Persistent Disk:**
```bash
GET /api/status/persistent-disk
```

**Resposta:**
```json
{
  "persistentPath": "/var/data",
  "directories": {
    "cache": {
      "exists": true,
      "path": "/var/data/cache",
      "fileCount": 5,
      "totalSizeBytes": 4181,
      "totalSizeMB": "0.00"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### **Teste Completo:**
```bash
GET /api/test/persistent-disk
```

---

## 📊 **MONITORAMENTO E LOGS**

### **1. Logs do Sistema**

#### **Tipos de Log:**
- **INFO**: Operações normais
- **WARN**: Avisos importantes
- **ERROR**: Erros críticos
- **DEBUG**: Informações de debug

#### **Formato dos Logs:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Cache salvo com sucesso",
  "file": "cache-persistente.js",
  "function": "salvarPendentes"
}
```

### **2. Métricas Importantes**

#### **Uso do Disco:**
- **Tamanho total**: Monitorar crescimento
- **Arquivos por diretório**: Distribuição
- **Taxa de crescimento**: Tendências

#### **Performance:**
- **Tempo de leitura**: Cache vs. processamento
- **Taxa de hit**: Eficiência do cache
- **Tempo de backup**: Impacto na performance

### **3. Alertas Recomendados**

#### **Alertas de Espaço:**
- **> 80%**: Aviso de espaço
- **> 90%**: Alerta crítico
- **> 95%**: Emergência

#### **Alertas de Performance:**
- **Cache miss > 20%**: Investigar
- **Tempo de backup > 5s**: Otimizar
- **Erros de escrita**: Verificar permissões

---

## 🔄 **BACKUP E RECUPERAÇÃO**

### **1. Backup Automático**

#### **Configuração:**
```javascript
// Backup antes de cada alteração
function fazerBackup(arquivo) {
  if (fs.existsSync(arquivo)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `${BACKUP_DIR}/${nomeArquivo}-${timestamp}.json`;
    fs.copyFileSync(arquivo, backupFile);
  }
}
```

#### **Retenção:**
- **Últimos 5 backups** por arquivo
- **Limpeza automática** de backups antigos
- **Backup diário** do sistema completo

### **2. Recuperação Manual**

#### **Restaurar Backup:**
```bash
# Listar backups disponíveis
GET /api/cache/list

# Restaurar arquivo específico
POST /api/cache/restore
{
  "fileName": "pendentes.json",
  "backupDate": "2024-01-15T10-30-00-000Z"
}
```

#### **Recuperação de Emergência:**
```bash
# Limpar cache corrompido
POST /fgts/cache/limpar

# Restaurar estado inicial
POST /api/cache/reset
```

### **3. Snapshot do Render**

#### **Configuração:**
- **Frequência**: Diária (automática)
- **Retenção**: 7 dias (mínimo)
- **Restauração**: Via painel do Render

#### **Limitações:**
- **Não restaurar** bancos de dados customizados
- **Usar backups** específicos para dados críticos
- **Testar restauração** antes de emergências

---

## 🔧 **TROUBLESHOOTING**

### **Problemas Comuns**

#### **1. "Diretório não existe"**
**Sintoma**: Erro ao acessar `/var/data/cache`
**Causa**: Persistent Disk não configurado
**Solução**: 
1. Verificar configuração no Render
2. Aguardar deploy completo
3. Verificar logs de inicialização

#### **2. "Permissão negada"**
**Sintoma**: Erro ao escrever arquivos
**Causa**: Permissões incorretas
**Solução**: 
1. Verificar configuração do Persistent Disk
2. Reiniciar serviço
3. Verificar logs de erro

#### **3. "Espaço insuficiente"**
**Sintoma**: Erro ao salvar arquivos grandes
**Causa**: Disco cheio
**Solução**: 
1. Limpar arquivos antigos
2. Aumentar tamanho do disco
3. Otimizar uso de espaço

#### **4. "Cache corrompido"**
**Sintoma**: Erro ao ler arquivos JSON
**Causa**: Arquivo corrompido
**Solução**: 
1. Restaurar backup
2. Limpar cache corrompido
3. Reiniciar processamento

### **Comandos de Debug**

#### **Verificar Status:**
```bash
curl https://seu-projeto.onrender.com/api/status/persistent-disk
```

#### **Testar Funcionalidade:**
```bash
curl https://seu-projeto.onrender.com/api/test/persistent-disk
```

#### **Verificar Logs:**
```bash
# No painel do Render → Logs
# Procurar por:
# - "Diretório persistente criado"
# - "Cache salvo"
# - "Erro ao salvar"
```

### **Monitoramento Contínuo**

#### **Scripts de Monitoramento:**
```javascript
// Verificar uso do disco
const stats = await fetch('/api/status/persistent-disk');
const usage = stats.directories.cache.totalSizeMB;

if (parseFloat(usage) > 50) {
  console.warn('⚠️ Uso do disco alto:', usage);
}
```

#### **Alertas Automáticos:**
```javascript
// Verificar integridade dos arquivos
const cacheFiles = await fetch('/api/cache/list');
for (const file of cacheFiles.files) {
  if (file.size === 0) {
    console.error('❌ Arquivo vazio:', file.name);
  }
}
```

---

## 💡 **EXEMPLOS DE USO**

### **1. Sistema FGTS Completo**

#### **Fluxo de Processamento:**
```javascript
// 1. Carregar pendentes do cache
const pendentes = carregarPendentes();

// 2. Processar cada CPF
for (const pendente of pendentes) {
  try {
    // Processar CPF
    const resultado = await processarCPF(pendente.cpf);
    
    // Salvar resultado no cache
    adicionarResultadoLista('sucessos', resultado);
    
    // Remover da lista de pendentes
    removerPendente(pendente.cpf, pendente.linha);
    
  } catch (error) {
    // Incrementar tentativas
    incrementarTentativaCache(pendente.cpf);
  }
}

// 3. Salvar estado atualizado
salvarEstadoProcessamento(estadoAtual);
```

### **2. Cache de Extratos**

#### **Processamento com Cache:**
```javascript
// Verificar se extrato já foi processado
const jsonPath = `/var/data/extratos/extrato_${fileId}.json`;

if (fs.existsSync(jsonPath) && cacheValido(jsonPath)) {
  // Usar cache
  const extrato = JSON.parse(await fsp.readFile(jsonPath, 'utf-8'));
  return extrato;
}

// Processar e salvar no cache
const extratoProcessado = await processarExtrato(pdfPath);
await fsp.writeFile(jsonPath, JSON.stringify(extratoProcessado, null, 2));

return extratoProcessado;
```

### **3. Sistema de Logs**

#### **Logging Estruturado:**
```javascript
// Salvar log no Persistent Disk
async function salvarLog(level, message, dados = {}) {
  const logData = {
    level,
    message,
    dados,
    timestamp: new Date().toISOString(),
    user: req.user?.id || 'system'
  };
  
  await fetch('/api/logs/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'app.log',
      logData
    })
  });
}

// Uso
await salvarLog('info', 'CPF processado com sucesso', { cpf: '12345678901' });
```

### **4. Configurações Persistentes**

#### **Sistema de Configuração:**
```javascript
// Carregar configurações
async function carregarConfig(tipo) {
  const response = await fetch(`/api/config/load/${tipo}.json`);
  if (response.ok) {
    return await response.json();
  }
  return getDefaultConfig(tipo);
}

// Salvar configurações
async function salvarConfig(tipo, dados) {
  await fetch('/api/config/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: `${tipo}.json`,
      configData: dados
    })
  });
}

// Uso
const config = await carregarConfig('usuario');
config.theme = 'dark';
await salvarConfig('usuario', config);
```

---

## 🎯 **BENEFÍCIOS ALCANÇADOS**

### **Persistência Total:**
- ✅ **Dados nunca se perdem** entre deploys
- ✅ **Cache mantido** entre reinicializações
- ✅ **Estado preservado** entre sessões
- ✅ **Backups automáticos** seguros

### **Performance Otimizada:**
- ✅ **Cache rápido** para extratos processados
- ✅ **Listas carregadas** instantaneamente
- ✅ **Redução de processamento** desnecessário
- ✅ **Resposta mais rápida** para usuários

### **Confiabilidade Máxima:**
- ✅ **Sistema robusto** com backups
- ✅ **Recuperação automática** de erros
- ✅ **Monitoramento contínuo** de integridade
- ✅ **Alertas proativos** de problemas

### **Escalabilidade Preparada:**
- ✅ **Estrutura organizada** para crescimento
- ✅ **APIs padronizadas** para integração
- ✅ **Monitoramento detalhado** de uso
- ✅ **Otimização contínua** de espaço

---

## 📞 **SUPORTE E MANUTENÇÃO**

### **Recursos Úteis:**
- **Documentação Render**: https://render.com/docs/disks
- **Logs do Sistema**: Painel Render → Logs
- **Status do Serviço**: Painel Render → Status
- **Métricas**: Painel Render → Metrics

### **Comandos de Emergência:**
```bash
# Verificar status
curl https://seu-projeto.onrender.com/api/status/persistent-disk

# Testar funcionalidade
curl https://seu-projeto.onrender.com/api/test/persistent-disk

# Limpar cache (emergência)
curl -X POST https://seu-projeto.onrender.com/fgts/cache/limpar
```

### **Contatos de Suporte:**
- **Render Support**: Via painel do Render
- **Logs de Erro**: Sempre incluir logs completos
- **Informações**: URL, timestamp, steps to reproduce

---

## 🎉 **CONCLUSÃO**

O sistema de Persistent Disk implementado oferece:

- **🗄️ Armazenamento persistente** confiável
- **⚡ Performance otimizada** com cache inteligente
- **🔄 Backup automático** e recuperação
- **📊 Monitoramento completo** do sistema
- **🛠️ APIs robustas** para gerenciamento
- **🔧 Troubleshooting** facilitado

**O sistema está preparado para produção e crescimento futuro!** 🚀✨

