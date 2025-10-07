# 📋 RESUMO DAS FUNÇÕES PRINCIPAIS - SISTEMA FGTS

## 🖥️ Backend (server.js)

### 🔧 Funções de Sistema
| Função | Descrição | Parâmetros | Retorno |
|--------|-----------|------------|---------|
| `ensurePersistentDirectories()` | Cria diretórios necessários para cache | - | void |
| `salvarEstadoFGTS(estado)` | Salva estado do processamento | `estado: Object` | Promise<void> |
| `carregarEstadoFGTS()` | Carrega estado do processamento | - | Promise<Object> |
| `atualizarContadoresTempoReal()` | Atualiza contadores via Socket.IO | - | void |
| `calcularContadoresPorStatus()` | Calcula contadores baseado nas listas | - | Promise<Object> |

### 📤 Endpoints de Upload
| Endpoint | Método | Descrição | Parâmetros |
|----------|--------|-----------|------------|
| `/fgts/run` | POST | Upload CSV e inicia processamento | `csvfile: File` |
| `/fgts/pause` | POST | Pausa processamento | - |
| `/fgts/resume` | POST | Retoma processamento | - |
| `/fgts/forcar-processamento` | POST | Força processamento e corrige contadores | - |

### 📊 Endpoints de Dados
| Endpoint | Método | Descrição | Retorno |
|----------|--------|-----------|---------|
| `/fgts/lista-completa` | GET | Lista todos os resultados | `{sucessos, pendentes, naoAutorizados, descartados}` |
| `/fgts/contadores-tempo-real` | GET | Contadores em tempo real | `{totalCPFs, processados, sucessos, etc.}` |
| `/fgts/debug-dados` | GET | Dados de debug | `{listasData, cpfsAnexados}` |
| `/fgts/test-contadores` | GET | Teste de contadores | `{contadores}` |

---

## 🔄 Processamento (fgts_csv.js)

### 🔐 Autenticação
| Função | Descrição | Parâmetros | Retorno |
|--------|-----------|------------|---------|
| `authenticate()` | Autenticação principal com V8 | - | Promise<Object> |
| `autenticarIndividual()` | Autenticação individual com retry | - | Promise<Object> |
| `limparCacheV8(cpf, token)` | Limpa cache do V8 | `cpf: string, token: string` | Promise<void> |

### 📊 Consulta e Processamento
| Função | Descrição | Parâmetros | Retorno |
|--------|-----------|------------|---------|
| `consultarResultado(cpf, token)` | Consulta saldo FGTS | `cpf: string, token: string` | Promise<number> |
| `processarCPF(registro, authResult)` | Processa um CPF individual | `registro: Object, authResult: Object` | Promise<Object> |
| `processarCPFs(arquivo, pendentes)` | Processa lista de CPFs | `arquivo: string, pendentes: Array` | Promise<void> |
| `emitirResultado(dados)` | Emite resultado e atualiza contadores | `dados: Object` | Promise<void> |

### 🏢 Integração CRM
| Função | Descrição | Parâmetros | Retorno |
|--------|-----------|------------|---------|
| `criarOportunidadeCRM(cpf, valor, dados)` | Cria oportunidade no CRM | `cpf: string, valor: number, dados: Object` | Promise<Object> |
| `atualizarOportunidadeCRM(opportunityId, valor, dados)` | Atualiza oportunidade existente | `opportunityId: string, valor: number, dados: Object` | Promise<Object> |

---

## 💾 Cache (cache-persistente.js)

### 📂 Gerenciamento de Listas
| Função | Descrição | Parâmetros | Retorno |
|--------|-----------|------------|---------|
| `carregarListas()` | Carrega listas de resultados | - | Object |
| `salvarListas(listas)` | Salva listas de resultados | `listas: Object` | void |
| `adicionarResultadoLista(tipo, dados)` | Adiciona resultado a uma lista | `tipo: string, dados: Object` | void |

### 📋 Gerenciamento de CPFs
| Função | Descrição | Parâmetros | Retorno |
|--------|-----------|------------|---------|
| `carregarCPFsAnexados()` | Carrega lista de CPFs anexados | - | Promise<Object> |
| `salvarCPFsAnexados(cpfs, metadata)` | Salva lista de CPFs anexados | `cpfs: Array, metadata: Object` | Promise<Object> |

---

## 🌐 Frontend (index.html)

### 📱 Elementos da Interface
| ID | Tipo | Descrição |
|----|------|-----------|
| `#csvFile` | Input | Seleção de arquivo CSV |
| `#btnProcessar` | Button | Iniciar processamento |
| `#btnPausar` | Button | Pausar processamento |
| `#btnRetomar` | Button | Retomar processamento |
| `#totalCPFs` | Span | Total de CPFs |
| `#processados` | Span | CPFs processados |
| `#sucessos` | Span | CPFs com sucesso |
| `#pendentes` | Span | CPFs pendentes |
| `#naoAutorizados` | Span | CPFs não autorizados |
| `#descartados` | Span | CPFs descartados |

### 🔄 Funções JavaScript
| Função | Descrição | Parâmetros |
|--------|-----------|------------|
| `updateStats(data)` | Atualiza contadores na interface | `data: Object` |
| `carregarContadoresTempoReal()` | Carrega contadores do servidor | - |
| `loadInitialData()` | Carrega dados iniciais | - |
| `addResultToTable(resultado)` | Adiciona resultado à tabela | `resultado: Object` |

---

## 🔌 Socket.IO Events

### 📤 Cliente → Servidor
| Event | Descrição | Dados |
|-------|-----------|-------|
| `connect` | Conecta ao servidor | - |
| `disconnect` | Desconecta do servidor | - |

### 📥 Servidor → Cliente
| Event | Descrição | Dados |
|-------|-----------|-------|
| `logFila` | Log de processamento | `{type, message}` |
| `contadoresTempoReal` | Contadores atualizados | `{totalCPFs, processados, etc.}` |
| `resultadoCPF` | Resultado de um CPF | `{cpf, status, valorLiberado, etc.}` |
| `progress` | Progresso do processamento | `{done, total, percentage}` |

---

## 📊 Status de CPFs

### 🎯 Status Possíveis
| Status | Descrição | Ação |
|--------|-----------|------|
| `success` | Processado com sucesso | Cria/atualiza oportunidade no CRM |
| `pending` | Pendente de processamento | Aguarda processamento |
| `no_auth` | Sem autorização | Não autorizado no V8 |
| `descartado` | Descartado | Erro crítico, não será reprocessado |

### 🔄 Mapeamento de Status
```javascript
// Status do processamento → Lista de destino
switch(status) {
  case 'success':
    tipoLista = 'sucessos';
    break;
  case 'pending':
  case 'reprocessar':
  case 'sistemaFalha':
  case 'sistemaReprocessar':
    tipoLista = 'pendentes';
    break;
  case 'no_auth':
    tipoLista = 'naoAutorizados';
    break;
  case 'descartado':
    tipoLista = 'descartados';
    break;
}
```

---

## 🗂️ Estrutura de Arquivos

### 📁 Backend
```
server.js                 # Servidor principal
fgts/
├── fgts_csv.js          # Lógica de processamento
├── cache-persistente.js # Sistema de cache
├── index.html           # Interface principal
├── fgts-debug.html      # Interface de debug
└── DOCUMENTACAO-COMPLETA-FGTS.md
```

### 📁 Cache
```
/var/data/
├── cache/
│   ├── listas-resultados.json
│   ├── cpfs-anexados.json
│   ├── estado-fgts-completo.json
│   └── contadores-tempo-real.json
├── uploads/
└── logs/
```

---

## 🔧 Configuração

### 🌍 Variáveis de Ambiente
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

### 🚀 Comandos de Deploy
```bash
# Deploy local
npm install
node server.js

# Deploy VPS
chmod +x deploy-vps-manual.sh
./deploy-vps-manual.sh

# Deploy com PM2
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 📈 Métricas e Monitoramento

### 📊 Contadores
- **Total de CPFs**: Total do arquivo original
- **Processados**: CPFs já processados
- **Sucessos**: CPFs com saldo > 0
- **Pendentes**: CPFs aguardando processamento
- **Não Autorizados**: CPFs sem autorização
- **Descartados**: CPFs com erro crítico

### 🔍 Logs
- **API Errors**: `logs/api-errors.log`
- **PM2 Logs**: `pm2 logs api-extrato`
- **Nginx Logs**: `/var/log/nginx/error.log`

---

**📋 Resumo das Funções Principais - Sistema FGTS v3.1**
**📅 Última Atualização: 01/10/2025**

