# 📚 DOCUMENTAÇÃO COMPLETA - SISTEMA FGTS v3.1

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Fluxo de Desenvolvimento](#fluxo-de-desenvolvimento)
3. [Arquitetura do Sistema](#arquitetura-do-sistema)
4. [Arquivos Principais](#arquivos-principais)
5. [APIs e Endpoints](#apis-e-endpoints)
6. [Sistema de Cache](#sistema-de-cache)
7. [Processamento de CPFs](#processamento-de-cpfs)
8. [Integração com V8](#integração-com-v8)
9. [Integração com CRM](#integração-com-crm)
10. [Frontend](#frontend)
11. [Deploy e Configuração](#deploy-e-configuração)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O Sistema FGTS é uma aplicação Node.js que automatiza o processamento de extratos FGTS, integrando com:
- **Sistema V8**: Para consulta de saldos e limpeza de cache
- **CRM Lunas Digital**: Para criação e atualização de oportunidades
- **Cache Persistente**: Para armazenamento de dados entre sessões
- **Interface Web**: Para upload de CSVs e monitoramento em tempo real

### 🚀 Funcionalidades Principais
- Upload e processamento de arquivos CSV com CPFs
- Consulta automática de saldos FGTS via API V8
- Criação/atualização de oportunidades no CRM
- Sistema de cache persistente para continuidade
- Interface web em tempo real com Socket.IO
- Sistema de retry e reprocessamento
- Logs detalhados e monitoramento

---

## 🔄 Fluxo de Desenvolvimento

### 📋 **REGRA DE OURO: SEMPRE TESTAR LOCAL PRIMEIRO**

#### **1. 🏠 DESENVOLVIMENTO LOCAL (OBRIGATÓRIO)**
```bash
# 1. Fazer alterações nos arquivos locais
# Editar: server.js, fgts_csv.js, fgts/index.html, etc.

# 2. Testar localmente
node server.js

# 3. Verificar funcionamento completo
# - Abrir http://localhost:3000/fgts
# - Testar upload de CSV
# - Verificar contadores
# - Testar todas as funcionalidades

# 4. Corrigir bugs localmente
# - Debug no console local
# - Verificar logs locais
# - Ajustar código até funcionar 100%

# 5. Commit apenas quando estiver perfeito
git add .
git commit -m "Descrição das alterações testadas localmente"
git push origin master
```

#### **2. 🚀 DEPLOY NO SERVIDOR (APÓS VALIDAÇÃO LOCAL)**
```bash
# 1. Conectar ao VPS
ssh root@72.60.159.149

# 2. Navegar para o diretório
cd /root/api-lunas

# 3. Atualizar código
git pull origin master

# 4. Deploy
npm install
pm2 restart api-extrato

# 5. Verificar funcionamento online
curl http://localhost:3000
```

### ✅ **VANTAGENS DESTE FLUXO:**
- **Menos erros** em produção
- **Desenvolvimento mais rápido** (sem delays de rede)
- **Debug mais fácil** (logs locais)
- **Testes seguros** sem afetar usuários
- **Deploy mais confiável**

### 🚫 **NUNCA FAZER:**
- ❌ Subir código não testado
- ❌ Fazer alterações diretas no VPS
- ❌ Deploy sem validação local
- ❌ Commit de código com bugs

### 📁 **ESTRUTURA DE ARQUIVOS:**
- **Local:** `C:\Users\srcor\API Lunas\` (desenvolvimento)
- **VPS:** `/root/api-lunas/` (produção)
- **Git:** Controle de versão e deploy automático

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External APIs │
│   (HTML/JS)     │◄──►│   (Node.js)     │◄──►│   (V8/CRM)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Cache         │
                       │   (JSON Files)  │
                       └─────────────────┘
```

### 🔄 Fluxo de Processamento
1. **Upload**: Usuário faz upload do CSV via interface web
2. **Parse**: Sistema parseia o CSV e remove duplicados
3. **Cache**: Salva lista de CPFs no cache persistente
4. **Processamento**: Para cada CPF:
   - Autentica com V8
   - Consulta saldo FGTS
   - Cria/atualiza oportunidade no CRM
   - Salva resultado no cache
5. **Monitoramento**: Atualiza interface em tempo real

---

## 📁 Arquivos Principais

### 🖥️ Backend (Node.js)

#### `server.js` - Servidor Principal
**Função**: Servidor Express principal com todas as rotas e middleware

**Principais Funções**:
- `ensurePersistentDirectories()`: Cria diretórios necessários
- `salvarEstadoFGTS()` / `carregarEstadoFGTS()`: Gerencia estado do processamento
- `atualizarContadoresTempoReal()`: Atualiza contadores via Socket.IO
- `salvarCPFsAnexados()` / `carregarCPFsAnexados()`: Gerencia lista de CPFs

**Endpoints Principais**:
- `POST /fgts/run`: Upload e processamento de CSV
- `GET /fgts/lista-completa`: Lista todos os resultados
- `GET /fgts/contadores-tempo-real`: Contadores em tempo real
- `POST /fgts/pause` / `POST /fgts/resume`: Controle de processamento

#### `fgts/fgts_csv.js` - Lógica de Processamento
**Função**: Contém toda a lógica de processamento de CPFs e integração com APIs

**Principais Funções**:
- `authenticate()`: Autenticação com sistema V8
- `autenticarIndividual()`: Autenticação individual com retry
- `limparCacheV8()`: Limpa cache do V8 para um CPF
- `processarCPFs()`: Função principal de processamento
- `emitirResultado()`: Emite resultado e atualiza contadores
- `consultarResultado()`: Consulta saldo FGTS no V8
- `criarOportunidadeCRM()`: Cria oportunidade no CRM
- `atualizarOportunidadeCRM()`: Atualiza oportunidade existente

**Sistema de Status**:
- `success`: CPF processado com sucesso
- `pending`: CPF pendente de processamento
- `no_auth`: CPF sem autorização
- `descartado`: CPF descartado (erro crítico)

#### `fgts/cache-persistente.js` - Sistema de Cache
**Função**: Gerencia cache persistente entre sessões

**Principais Funções**:
- `carregarListas()`: Carrega listas de resultados
- `salvarListas()`: Salva listas de resultados
- `adicionarResultadoLista()`: Adiciona resultado a uma lista
- `carregarCPFsAnexados()`: Carrega lista de CPFs anexados
- `salvarCPFsAnexados()`: Salva lista de CPFs anexados

**Arquivos de Cache**:
- `listas-resultados.json`: Listas de sucessos, pendentes, etc.
- `cpfs-anexados.json`: Lista completa de CPFs do arquivo
- `estado-fgts-completo.json`: Estado atual do processamento
- `contadores-tempo-real.json`: Contadores em tempo real

### 🌐 Frontend

#### `fgts/index.html` - Interface Principal
**Função**: Interface web para upload e monitoramento

**Principais Funcionalidades**:
- Upload de arquivos CSV
- Monitoramento em tempo real via Socket.IO
- Exibição de contadores e progresso
- Tabela de resultados
- Controles de pausa/retomada

**Elementos Principais**:
- `#csvFile`: Input para seleção de arquivo
- `#btnProcessar`: Botão para iniciar processamento
- `#btnPausar` / `#btnRetomar`: Controles de processamento
- `#totalCPFs`, `#processados`, etc.: Contadores
- `#tabelaResultados`: Tabela de resultados

#### `fgts-debug.html` - Interface de Debug
**Função**: Interface alternativa para debug (bypass de cache)

---

## 🔌 APIs e Endpoints

### 📤 Upload e Processamento
- **POST** `/fgts/run`: Upload de CSV e início do processamento
- **POST** `/fgts/pause`: Pausa o processamento
- **POST** `/fgts/resume`: Retoma o processamento
- **POST** `/fgts/forcar-processamento`: Força processamento e corrige contadores

### 📊 Dados e Status
- **GET** `/fgts/lista-completa`: Lista completa de resultados
- **GET** `/fgts/contadores-tempo-real`: Contadores em tempo real
- **GET** `/fgts/debug-dados`: Dados de debug
- **GET** `/fgts/test-contadores`: Teste de contadores

### 🔧 Configuração
- **GET** `/api/credenciais`: Lista credenciais configuradas
- **POST** `/api/credenciais`: Atualiza credenciais
- **GET** `/api/health`: Health check da API

---

## 💾 Sistema de Cache

### 📂 Estrutura de Diretórios
```
/var/data/
├── cache/
│   ├── listas-resultados.json
│   ├── cpfs-anexados.json
│   ├── estado-fgts-completo.json
│   └── contadores-tempo-real.json
├── uploads/
│   └── [arquivos CSV]
├── logs/
│   └── api-errors.log
└── config/
    └── [configurações]
```

### 🔄 Persistência
- **Cache Persistente**: Dados sobrevivem a reinicializações
- **Estado de Processamento**: Mantém progresso entre sessões
- **Listas de Resultados**: Organizadas por status
- **Contadores**: Atualizados em tempo real

---

## 🔄 Processamento de CPFs

### 📋 Fluxo Detalhado

1. **Upload do CSV**:
   ```javascript
   // Parse do CSV
   const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });
   
   // Remoção de duplicados
   const cpfsUnicos = new Map();
   // ... lógica de remoção
   ```

2. **Salvamento no Cache**:
   ```javascript
   // Salvar lista completa
   await salvarCPFsAnexados(registrosParaProcessar, metadata);
   
   // Criar estado inicial
   const estadoInicial = {
     processando: true,
     total: registrosParaProcessar.length,
     processados: 0,
     // ...
   };
   ```

3. **Processamento Individual**:
   ```javascript
   for (let [index, registro] of registros.entries()) {
     // Autenticação
     const authResult = await autenticarIndividual();
     
     // Consulta saldo
     const saldo = await consultarResultado(cpf, authResult.token);
     
     // Criação/atualização no CRM
     if (saldo > 0) {
       await criarOportunidadeCRM(cpf, saldo, dados);
     }
     
     // Emissão de resultado
     await emitirResultado({ cpf, status, valorLiberado });
   }
   ```

### 🔄 Sistema de Retry
- **Tentativas**: Até 3 tentativas por CPF
- **Delay**: Aumenta progressivamente entre tentativas
- **Status**: Atualiza status baseado no resultado

---

## 🔐 Integração com V8

### 🔑 Autenticação
```javascript
async function authenticate() {
  // Tenta autenticação direta
  const authResult = await autenticarIndividual();
  
  // Se falhar, usa API de token
  if (!authResult.success) {
    return await usarAPIToken();
  }
  
  return authResult;
}
```

### 📊 Consulta de Saldo
```javascript
async function consultarResultado(cpf, token) {
  // Limpa cache do V8
  await limparCacheV8(cpf, token);
  
  // Consulta saldo
  const response = await axios.get(`https://bff.v8sistema.com/fgts/balance/${cpf}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return response.data.balance || 0;
}
```

### 🔄 Sistema de Contingência
- **API Principal**: Autenticação direta com V8
- **API Secundária**: Serviço de token em caso de falha
- **Retry Automático**: Tenta novamente em caso de erro 429
- **Identificação Visual**: Logs diferenciados "NORMAL" vs "CONTINGÊNCIA"
- **Transparência Total**: Sempre saber quando está usando contingência

---

## 🏢 Integração com CRM

### 📝 Criação de Oportunidade
```javascript
async function criarOportunidadeCRM(cpf, valor, dados) {
  const oportunidade = {
    queue_id: QUEUE_ID,
    dest_stage_id: DEST_STAGE_ID,
    name: `FGTS - ${cpf}`,
    value: valor,
    // ... outros campos
  };
  
  const response = await axios.post(`${LUNAS_API_URL}/opportunities`, oportunidade);
  return response.data;
}
```

### 🔄 Atualização de Oportunidade
```javascript
async function atualizarOportunidadeCRM(opportunityId, valor, dados) {
  const updateData = {
    value: valor,
    // ... outros campos atualizados
  };
  
  const response = await axios.put(`${LUNAS_API_URL}/opportunities/${opportunityId}`, updateData);
  return response.data;
}
```

---

## 🌐 Frontend

### 📱 Interface Principal
- **Upload**: Drag & drop ou seleção de arquivo
- **Monitoramento**: Contadores em tempo real
- **Resultados**: Tabela com todos os resultados

### 🔍 Sistema de Pesquisa (v3.2)
- **Pesquisa por CPF ou ID**: Busca em tempo real em todas as listas
- **Interface Intuitiva**: Caixa de pesquisa com placeholder descritivo
- **Filtros Dinâmicos**: Resultados filtrados conforme você digita
- **Indicador de Resultados**: Mostra quantos itens foram encontrados
- **Botão Limpar**: Reset rápido da pesquisa
- **Sincronização**: Mantém filtros ao trocar entre abas
- **Performance**: Busca otimizada sem impacto na performance

#### Como Usar a Pesquisa:
1. Digite CPF ou ID na caixa de pesquisa
2. Os resultados são filtrados automaticamente
3. Navegue entre as abas mantendo o filtro
4. Use "Limpar" para voltar a ver todos os resultados
- **Controles**: Pausa, retomada, cancelamento

### 🔄 Socket.IO
```javascript
// Conexão
const socket = io();

// Receber logs
socket.on('logFila', (data) => {
  console.log(data.message);
});

// Receber contadores
socket.on('contadoresTempoReal', (data) => {
  updateStats(data);
});

// Receber resultado
socket.on('resultadoCPF', (data) => {
  addResultToTable(data);
});
```

### 📊 Contadores em Tempo Real
- **Total de CPFs**: Total do arquivo original
- **Processados**: CPFs já processados
- **Sucessos**: CPFs com saldo > 0
- **Pendentes**: CPFs aguardando processamento
- **Não Autorizados**: CPFs sem autorização
- **Descartados**: CPFs com erro crítico

---

## 🚀 Deploy e Configuração

### 📋 Pré-requisitos
- Node.js 18+
- NPM
- PM2 (para produção)
- Nginx (para proxy reverso)

### 🔧 Variáveis de Ambiente
```bash
# Obrigatórias
LUNAS_API_KEY=sua_chave_aqui
FGTS_USER_1=usuario1@email.com
FGTS_PASS_1=senha1

# Opcionais
FGTS_USER_2=usuario2@email.com
FGTS_PASS_2=senha2
QUEUE_ID=25
DEST_STAGE_ID=4
PORT=3000
NODE_ENV=production
```

### 🚀 Deploy Local
```bash
# Instalar dependências
npm install

# Iniciar servidor
node server.js
```

### 🚀 Deploy VPS

#### ⚠️ **FLUXO CORRETO - SEMPRE ALTERAR LOCAL E SUBIR PELO GIT**

**1. Desenvolvimento Local** (SEMPRE PRIMEIRO):
```bash
# Fazer alterações nos arquivos locais
# Editar: server.js, fgts_csv.js, index.html, etc.

# Testar localmente
node server.js

# Fazer commit das alterações
git add .
git commit -m "Descrição das alterações"
git push origin master
```

**2. Deploy no VPS** (APÓS COMMIT):
```bash
# Conectar ao VPS (ACESSO MANUAL OBRIGATÓRIO)
ssh root@72.60.159.149

# Navegar para o projeto
cd /root/api-lunas

# Atualizar código do Git
git pull origin master

# Executar deploy
chmod +x deploy-vps-manual.sh
./deploy-vps-manual.sh
```

**⚠️ IMPORTANTE**: 
- SSH não pode ser executado automaticamente via scripts
- Acesso manual obrigatório ao VPS
- **NUNCA** editar arquivos diretamente no VPS
- **SEMPRE** fazer alterações locais e subir pelo Git

### 🐳 Deploy com Docker
```bash
# Build da imagem
docker build -t api-fgts .

# Executar container
docker run -d -p 3000:3000 --name api-fgts api-fgts
```

---

## 🔍 Troubleshooting

### ❌ Problemas Comuns

#### 1. **502 Bad Gateway (SERVIDOR FORA DO AR)**
- **Causa**: Aplicação Node.js não está rodando no VPS
- **Sintomas**: Site retorna 502 Bad Gateway, Nginx funcionando
- **Solução**: **ACESSO MANUAL OBRIGATÓRIO** ao VPS:
  ```bash
  # Conectar ao VPS
  ssh root@72.60.159.149
  
  # Verificar status
  pm2 status
  
  # Reiniciar aplicação
  pm2 restart api-extrato
  
  # Se não estiver listada, iniciar
  cd /root/api-lunas
  pm2 start ecosystem.config.cjs
  ```
- **⚠️ LIMITAÇÃO**: Não é possível executar SSH automaticamente via scripts

#### 2. **Erro de Autenticação V8**
- **Causa**: Credenciais inválidas ou API indisponível
- **Solução**: Verificar variáveis de ambiente e testar credenciais

#### 3. **Contadores Incorretos**
- **Causa**: Desincronização entre cache e estado
- **Solução**: Executar `/fgts/forcar-processamento`

#### 4. **Upload Falha**
- **Causa**: Campo incorreto no FormData
- **Solução**: Verificar se está usando `csvfile` como nome do campo

#### 5. **Cache Não Persiste**
- **Causa**: Permissões incorretas nos diretórios
- **Solução**: Verificar permissões de `/var/data`

### 🔧 Comandos de Debug

```bash
# Ver logs da aplicação
pm2 logs api-extrato

# Ver status
pm2 status

# Reiniciar aplicação
pm2 restart api-extrato

# Ver logs de erro
pm2 logs api-extrato --err

# Monitorar recursos
pm2 monit
```

### 📊 Monitoramento

#### Logs Importantes
- **API Errors**: `logs/api-errors.log`
- **PM2 Logs**: `pm2 logs api-extrato`
- **Nginx Logs**: `/var/log/nginx/error.log`

#### Métricas
- **Uso de Memória**: `pm2 monit`
- **Status da Aplicação**: `pm2 status`
- **Conectividade**: Testar endpoints de health check

---

## 📋 Boas Práticas de Desenvolvimento

### 🔄 **FLUXO DE DESENVOLVIMENTO OBRIGATÓRIO**

#### 1. **Desenvolvimento Local**
- ✅ Sempre fazer alterações nos arquivos locais
- ✅ Testar localmente antes de fazer commit
- ✅ Usar `node server.js` para testar
- ✅ Verificar se `http://localhost:3000/api/health` responde

#### 2. **Versionamento Git**
- ✅ Fazer `git add .` para adicionar arquivos
- ✅ Fazer `git commit -m "Descrição clara"` 
- ✅ Fazer `git push origin master` para enviar
- ✅ Usar mensagens de commit descritivas

#### 3. **Deploy no VPS**
- ✅ Conectar manualmente ao VPS via SSH
- ✅ Fazer `git pull origin master` no VPS
- ✅ Executar `./deploy-vps-manual.sh`
- ✅ Verificar se está funcionando

### 🚫 **NUNCA FAZER:**
- ❌ Editar arquivos diretamente no VPS
- ❌ Fazer alterações sem testar localmente
- ❌ Deploy sem commit local
- ❌ Modificar código no servidor de produção
- ❌ Fazer alterações sem backup

### 📁 **Estrutura de Arquivos**
```
Desenvolvimento Local:
├── server.js (editar aqui)
├── fgts/fgts_csv.js (editar aqui)
├── fgts/index.html (editar aqui)
└── outros arquivos...

VPS (apenas deploy):
├── git pull origin master
├── ./deploy-vps-manual.sh
└── verificar funcionamento
```

## 📈 Melhorias Futuras

### 🔮 Funcionalidades Planejadas
- [ ] Dashboard de métricas avançadas
- [ ] Sistema de notificações por email
- [ ] Exportação de relatórios em PDF
- [ ] API REST completa para integração
- [ ] Sistema de backup automático
- [ ] Interface mobile responsiva

### 🛠️ Otimizações Técnicas
- [ ] Implementar Redis para cache
- [ ] Adicionar rate limiting
- [ ] Melhorar sistema de retry
- [ ] Implementar circuit breaker
- [ ] Adicionar métricas de performance

---

## 📞 Suporte

### 🆘 Em Caso de Problemas
1. Verificar logs da aplicação
2. Testar conectividade com APIs externas
3. Verificar configuração de variáveis de ambiente
4. Consultar esta documentação
5. Contatar equipe de desenvolvimento

### 📧 Contatos
- **Desenvolvedor**: Equipe Lunas Digital
- **Sistema**: FGTS v3.1
- **Última Atualização**: 01/10/2025

---

## 📄 Changelog

### v3.2 (01/10/2025) - CORREÇÃO DE CONTADORES E PESQUISA
- ✅ **CRÍTICO**: Corrigida duplicação de contadores no frontend
- ✅ **CRÍTICO**: Corrigido cálculo de processados (agora inclui pendentes)
- ✅ **NOVO**: Funcionalidade de pesquisa por CPF ou ID nas listas
- ✅ **NOVO**: Interface de pesquisa com caixa de texto e botão limpar
- ✅ **NOVO**: Filtros em tempo real para todas as categorias
- ✅ **NOVO**: Indicador de resultados encontrados na pesquisa
- ✅ **OTIMIZAÇÃO**: Reduzidas emissões excessivas de Socket.IO
- ✅ **OTIMIZAÇÃO**: Centralizada atualização de contadores
- ✅ **OTIMIZAÇÃO**: Melhorada performance do frontend

### v3.1 (01/10/2025)
- ✅ Corrigido mapeamento de status (reprocessar, sistemaFalha → pendentes)
- ✅ Removida proteção duplicada de CPFs no processarCPFs
- ✅ Adicionada remoção de duplicados no upload de CSV
- ✅ Corrigidos contadores em tempo real
- ✅ Melhorado sistema de cache persistente
- ✅ Adicionado debug page (fgts-debug.html)
- ✅ Corrigidos caminhos de arquivos para Windows
- ✅ **NOVO**: Identificação visual de contingência nos logs
- ✅ **NOVO**: Logs diferenciados "NORMAL" vs "CONTINGÊNCIA"
- ✅ **NOVO**: Transparência total sobre uso da API de tokens

### v3.0 (28/09/2025)
- ✅ Implementado sistema de cache persistente
- ✅ Adicionado sistema de contadores em tempo real
- ✅ Melhorado sistema de retry e reprocessamento
- ✅ Implementado Socket.IO para atualizações em tempo real
- ✅ Adicionado sistema de pausa/retomada

---

**🎯 Sistema FGTS v3.1 - Documentação Completa**
**📅 Última Atualização: 01/10/2025**
**👨‍💻 Desenvolvido por: Equipe Lunas Digital**
