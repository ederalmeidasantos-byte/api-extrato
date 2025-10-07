# 📋 Documentação Completa - Painel FGTS

## 🎯 **Visão Geral do Projeto**

Sistema de consulta em lote de saldos FGTS com painel de controle em tempo real, integração com APIs da Lunas e V8 Sistema, e gerenciamento de CRM.

---

## 🏗️ **Arquitetura do Sistema**

### **Componentes Principais**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   APIs Externas │
│   (Painel)      │◄──►│   (Node.js)     │◄──►│   (Lunas/V8)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   Socket.IO     │◄─────────────┘
                        │   (Tempo Real)  │
                        └─────────────────┘
```

### **Fluxo de Dados**

1. **Upload CSV** → Parser → Validação
2. **Processamento** → APIs → Simulação → CRM
3. **Monitoramento** → Socket.IO → Painel
4. **Controle** → Pausar/Retomar → Reprocessar

---

## 📁 **Estrutura de Arquivos**

### **Arquivos Principais**

| Arquivo | Função | Descrição |
|---------|--------|-----------|
| `fgts_csv.js` | **Core** | Lógica principal de processamento FGTS |
| `server.js` | **Servidor** | Express + Socket.IO + Rotas API |
| `index-finanto-style.html` | **Frontend** | Painel de controle moderno |
| `servidor-teste-fgts-local.js` | **Teste** | Servidor para testes locais |

### **Arquivos de Configuração**

| Arquivo | Função |
|---------|--------|
| `.env` | Variáveis de ambiente |
| `package.json` | Dependências Node.js |
| `render.yaml` | Configuração de deploy |

### **Arquivos de Teste**

| Arquivo | Função |
|---------|--------|
| `teste-apis-reais.js` | Teste com APIs reais |
| `servidor-teste-fgts-local.js` | Servidor de teste local |
| `GUIA-TESTE-APIS.md` | Instruções de teste |

---

## 🔧 **Funcionalidades do Sistema**

### **1. Upload e Processamento**

#### **Upload de CSV**
- ✅ Suporte a arquivos CSV
- ✅ Validação de formato
- ✅ Parser automático de CPFs
- ✅ Tratamento de erros

#### **Processamento em Lote**
- ✅ Processamento sequencial
- ✅ Controle de delay configurável
- ✅ Pausar/Retomar processamento
- ✅ Reprocessamento automático

### **2. Integração com APIs**

#### **API Lunas (Autenticação)**
```javascript
// Endpoint: https://api.lunas.com.br/auth
// Método: POST
// Headers: Authorization: Bearer {LUNAS_API_KEY}
```

#### **API V8 Sistema (Consulta FGTS)**
```javascript
// Endpoint: https://api.v8sistema.com/balance
// Método: POST
// Headers: Authorization: Bearer {V8_API_TOKEN}
```

#### **API V8 Sistema (Simulação)**
```javascript
// Endpoint: https://api.v8sistema.com/simulation
// Método: POST
// Dados: { cpf, amount, periods }
```

### **3. Gerenciamento de CRM**

#### **Criação de Oportunidades**
- ✅ Criação automática no CRM
- ✅ Atualização com dados da simulação
- ✅ Mudança de fases automática

#### **Fluxos de Trabalho**
- ✅ Disparo de fluxos automáticos
- ✅ Notificações de status
- ✅ Rastreamento de progresso

### **4. Painel de Controle**

#### **Interface Moderna**
- 🎨 Design inspirado na Finanto
- 🎨 Cores da identidade Lunas
- 🎨 Layout responsivo
- 🎨 Componentes modernos

#### **Funcionalidades do Painel**
- 📊 **Estatísticas em tempo real**
- 📈 **Barra de progresso**
- 📋 **Listas organizadas por status**
- 🔄 **Controles de processamento**
- 📝 **Logs detalhados**
- 💾 **Exportação CSV**

---

## 🎨 **Design System**

### **Paleta de Cores (Lunas)**

```css
/* Cores Principais */
--primary-teal: #00d4aa;      /* Verde água principal */
--primary-blue: #2563eb;      /* Azul principal */
--primary-purple: #7c3aed;    /* Roxo principal */

/* Cores de Status */
--success: #10b981;           /* Verde sucesso */
--warning: #f59e0b;           /* Amarelo aviso */
--error: #ef4444;             /* Vermelho erro */
--info: #3b82f6;              /* Azul informação */

/* Cores Neutras */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-500: #6b7280;
--gray-900: #111827;
```

### **Componentes**

#### **Cards**
- Bordas arredondadas (8px)
- Sombra sutil
- Padding consistente
- Background branco

#### **Botões**
- Cores da identidade Lunas
- Estados hover/active
- Ícones integrados
- Feedback visual

#### **Tabelas**
- Layout compacto
- 5 colunas responsivas
- Cores por status
- Scroll horizontal

---

## 🔄 **Fluxo de Processamento**

### **1. Inicialização**
```javascript
1. Upload do CSV
2. Validação dos dados
3. Autenticação nas APIs
4. Inicialização do processamento
```

### **2. Processamento Principal**
```javascript
for (cada CPF no CSV) {
  1. Consultar saldo FGTS
  2. Se sucesso: Simular saldo
  3. Se simulação OK: Atualizar CRM
  4. Se falha: Adicionar à pendentes
  5. Emitir resultado para painel
  6. Aguardar delay configurado
}
```

### **3. Tratamento de Erros**
```javascript
// Rate Limit (429)
- Trocar credencial
- Tentar novamente
- Se esgotar: Marcar como "Limite excedido"

// Não Autorizado (401)
- Marcar como "Não Autorizado"
- Adicionar à lista de pendentes

// Erro de Simulação
- Tentar com outra tabela
- Se falhar: Marcar como "Descartado"
```

### **4. Reprocessamento**
```javascript
// A cada 10 CPFs processados
- Verificar pendentes
- Tentar reprocessar
- Atualizar status
```

---

## 📊 **Status e Classificações**

### **Status de CPF**

| Status | Ícone | Cor | Descrição |
|--------|-------|-----|-----------|
| `success` | ✅ | Verde | Processado com sucesso |
| `pending` | ⏳ | Amarelo | Aguardando processamento |
| `no_auth` | 🚫 | Vermelho | Não autorizado |
| `descartado` | ❌ | Cinza | Descartado (sem saldo) |
| `limite_excedido` | ⏰ | Laranja | Limite de requisições |
| `ready_for_manual` | 📥 | Azul | Pronto para revisão manual |

### **Contadores**

```
✅ Sucesso | Total: 150 | Valor Total: R$ 25.000,00
⏳ Pendentes | Total: 25 | Aguardando processamento
🚫 Não Autorizados | Total: 75 | Requerem atenção
❌ Descartados | Total: 50 | Sem saldo disponível
```

---

## 🔌 **APIs e Endpoints**

### **Endpoints do Servidor**

| Método | Endpoint | Função |
|--------|----------|--------|
| `POST` | `/fgts/upload` | Upload de CSV |
| `POST` | `/fgts/processar` | Iniciar processamento |
| `POST` | `/fgts/pause` | Pausar processamento |
| `POST` | `/fgts/resume` | Retomar processamento |
| `POST` | `/fgts/cancel` | Cancelar processamento |
| `POST` | `/fgts/reprocessarPendentes` | Reprocessar pendentes |
| `POST` | `/fgts/mudarFaseNaoAutorizados` | Mudar fase no CRM |
| `GET` | `/fgts/status` | Status do processamento |
| `POST` | `/fgts/delay` | Atualizar delay |

### **Eventos Socket.IO**

| Evento | Direção | Descrição |
|--------|---------|-----------|
| `connect` | Cliente ← Servidor | Conexão estabelecida |
| `disconnect` | Cliente ← Servidor | Conexão perdida |
| `log` | Cliente ← Servidor | Log de processamento |
| `progress` | Cliente ← Servidor | Atualização de progresso |
| `totalCPFs` | Cliente ← Servidor | Total de CPFs |
| `delayUpdate` | Cliente ← Servidor | Delay atualizado |

---

## ⚙️ **Configuração e Deploy**

### **Variáveis de Ambiente**

```env
# APIs
LUNAS_API_KEY=cd4d0509169d4e2ea9177ac66c1c9376
V8_API_TOKEN=seu_token_v8
V8_API_BASE=https://api.v8sistema.com

# CRM
CRM_API_URL=https://seu-crm.com/api
CRM_API_KEY=seu_token_crm

# Servidor
PORT=3000
NODE_ENV=production
```

### **Dependências Node.js**

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "multer": "^1.4.5",
    "csv-parse": "^5.5.0",
    "axios": "^1.5.0",
    "dotenv": "^16.3.1"
  }
}
```

### **Deploy no Render**

```yaml
# render.yaml
services:
  - type: web
    name: painel-fgts
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
```

---

## 🧪 **Testes e Validação**

### **Testes Locais**

1. **Servidor de Teste**
   ```bash
   node servidor-teste-fgts-local.js
   ```

2. **Teste com APIs Reais**
   ```bash
   node teste-apis-reais.js
   ```

3. **Acesso ao Painel**
   ```
   http://localhost:3000/fgts
   ```

### **Cenários de Teste**

#### **Teste Básico**
- Upload de CSV com 10 CPFs
- Verificar processamento
- Validar logs no painel

#### **Teste de Rate Limit**
- Processar muitos CPFs
- Verificar troca de credenciais
- Validar tratamento de 429

#### **Teste de Pausa/Retomar**
- Iniciar processamento
- Pausar no meio
- Retomar processamento

#### **Teste de Reprocessamento**
- Processar CPFs com falhas
- Usar botão "Reprocessar Pendentes"
- Verificar reprocessamento

---

## 📈 **Métricas e Monitoramento**

### **Métricas do Painel**

- **Total de CPFs**: Contador geral
- **Processados**: CPFs concluídos
- **Pendentes**: Aguardando processamento
- **Sucessos**: Processados com sucesso
- **Falhas**: Erros diversos
- **Valor Total**: Soma dos valores liberados

### **Logs do Sistema**

```
[2025-01-30T10:00:00.000Z] 🚀 Iniciando processamento
[2025-01-30T10:00:01.000Z] 📄 Total de CPFs lidos: 1000
[2025-01-30T10:00:02.000Z] 🔑 Autenticado com sucesso
[2025-01-30T10:00:03.000Z] ✅ Linha: 1 | CPF: 12345678901 | Status: success
[2025-01-30T10:00:04.000Z] ❌ Linha: 2 | CPF: 98765432100 | Status: no_auth
```

### **Status de Conexão**

- **Socket.IO**: Conectado/Desconectado
- **APIs**: Status das credenciais
- **Processamento**: Ativo/Pausado/Cancelado

---

## 🚨 **Tratamento de Erros**

### **Erros de API**

| Código | Erro | Ação |
|--------|------|------|
| `401` | Não autorizado | Trocar credencial |
| `429` | Rate limit | Aguardar e tentar novamente |
| `500` | Erro interno | Tentar com outra credencial |
| `400` | Dados inválidos | Marcar como erro |

### **Erros de Sistema**

| Erro | Causa | Solução |
|------|-------|---------|
| `CSV inválido` | Formato incorreto | Validar formato |
| `Credenciais inválidas` | Token expirado | Renovar credenciais |
| `Timeout` | API lenta | Aumentar timeout |
| `Memória insuficiente` | Muitos CPFs | Processar em lotes |

---

## 🔧 **Manutenção e Suporte**

### **Logs Importantes**

- **Erros de autenticação**: Verificar credenciais
- **Rate limits**: Ajustar delay ou credenciais
- **Timeouts**: Verificar conectividade
- **Falhas de CRM**: Verificar integração

### **Otimizações**

- **Delay configurável**: Ajustar conforme rate limits
- **Credenciais múltiplas**: Rotacionar automaticamente
- **Reprocessamento**: Automático a cada 10 CPFs
- **Cache**: Armazenar resultados temporariamente

### **Backup e Recuperação**

- **Dados de processamento**: Armazenados em memória
- **Logs**: Salvos em console
- **CSV**: Backup automático no upload
- **Status**: Persistido durante sessão

---

## 📞 **Suporte e Contato**

### **Canais de Suporte**

- **Email**: ti@v8digital.online (V8 Sistema)
- **Documentação**: https://docs.v8sistema.com
- **Logs**: Console do servidor
- **Painel**: Interface de monitoramento

### **Informações para Suporte**

- **Payloads enviados**
- **Responses recebidos**
- **Contexto da requisição**
- **Logs de erro**
- **Configurações do ambiente**

---

## 🎯 **Próximos Passos**

### **Melhorias Planejadas**

1. **Sistema de Webhooks** (V8 Sistema)
2. **Dashboard de métricas** avançado
3. **Relatórios automáticos**
4. **Integração com mais CRMs**
5. **API REST** para integrações

### **Otimizações**

1. **Processamento paralelo**
2. **Cache inteligente**
3. **Retry automático**
4. **Monitoramento avançado**
5. **Alertas em tempo real**

---

**📋 Documento gerado em**: 2025-01-30  
**🔄 Versão**: 1.0  
**👨‍💻 Sistema**: Painel FGTS - Lunas/V8 Sistema  
**📧 Suporte**: ti@v8digital.online
