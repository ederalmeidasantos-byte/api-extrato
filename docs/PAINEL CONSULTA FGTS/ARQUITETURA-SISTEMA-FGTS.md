# 🏗️ Arquitetura do Sistema FGTS

## 📊 **Diagrama de Arquitetura**

```
┌─────────────────────────────────────────────────────────────────┐
│                        SISTEMA FGTS                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FRONTEND      │    │   BACKEND       │    │   APIs EXTERNAS │
│   (Painel)      │    │   (Node.js)     │    │                 │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • HTML/CSS/JS   │◄──►│ • Express.js    │◄──►│ • Lunas API     │
│ • Socket.IO     │    │ • Socket.IO     │    │ • V8 Sistema    │
│ • Painel Real   │    │ • Multer        │    │ • CRM API       │
│ • Controles     │    │ • CSV Parser    │    │                 │
│ • Logs          │    │ • FGTS Logic    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   COMUNICAÇÃO   │◄─────────────┘
                        │   TEMPO REAL    │
                        │   (Socket.IO)   │
                        └─────────────────┘
```

## 🔄 **Fluxo de Dados Detalhado**

```
1. UPLOAD CSV
   ┌─────────────┐
   │ Usuário     │
   │ Upload CSV  │
   └─────┬───────┘
         │
   ┌─────▼───────┐
   │ Multer      │
   │ Parser CSV  │
   └─────┬───────┘
         │
   ┌─────▼───────┐
   │ Validação   │
   │ CPFs        │
   └─────┬───────┘

2. PROCESSAMENTO
   ┌─────▼───────┐
   │ Loop CPFs   │
   └─────┬───────┘
         │
   ┌─────▼───────┐    ┌─────────────┐
   │ Autenticar  │───►│ Lunas API   │
   │ (Lunas)     │    │ Auth        │
   └─────┬───────┘    └─────────────┘
         │
   ┌─────▼───────┐    ┌─────────────┐
   │ Consultar   │───►│ V8 Sistema  │
   │ Saldo FGTS  │    │ Balance     │
   └─────┬───────┘    └─────────────┘
         │
   ┌─────▼───────┐    ┌─────────────┐
   │ Simular     │───►│ V8 Sistema  │
   │ Saldo       │    │ Simulation  │
   └─────┬───────┘    └─────────────┘
         │
   ┌─────▼───────┐    ┌─────────────┐
   │ Atualizar   │───►│ CRM API     │
   │ CRM         │    │ Oportunidade│
   └─────┬───────┘    └─────────────┘

3. MONITORAMENTO
   ┌─────▼───────┐
   │ Emitir      │
   │ Resultado   │
   └─────┬───────┘
         │
   ┌─────▼───────┐    ┌─────────────┐
   │ Socket.IO   │───►│ Frontend    │
   │ Broadcast   │    │ Painel      │
   └─────────────┘    └─────────────┘
```

## 🗂️ **Estrutura de Arquivos**

```
📁 API EXTRATO/
├── 📄 fgts_csv.js              # Lógica principal FGTS
├── 📄 server.js                # Servidor Express + Socket.IO
├── 📄 index-finanto-style.html # Painel frontend
├── 📄 servidor-teste-fgts-local.js # Servidor de teste
├── 📄 .env                     # Variáveis de ambiente
├── 📄 package.json             # Dependências
├── 📄 render.yaml              # Configuração deploy
├── 📁 uploads/                 # Arquivos CSV
├── 📁 docs/                    # Documentação
└── 📁 tests/                   # Arquivos de teste
```

## 🔌 **Integrações Externas**

### **API Lunas (Autenticação)**
```
Endpoint: https://api.lunas.com.br/auth
Método: POST
Headers: Authorization: Bearer {LUNAS_API_KEY}
Payload: { username, password }
Response: { token, expires_in }
```

### **API V8 Sistema (Consulta)**
```
Endpoint: https://api.v8sistema.com/balance
Método: POST
Headers: Authorization: Bearer {V8_API_TOKEN}
Payload: { documentNumber, provider }
Response: { data: [{ amount, periods, status }] }
```

### **API V8 Sistema (Simulação)**
```
Endpoint: https://api.v8sistema.com/simulation
Método: POST
Headers: Authorization: Bearer {V8_API_TOKEN}
Payload: { cpf, amount, periods, tableId }
Response: { availableBalance, tableSimulated }
```

### **CRM API (Oportunidades)**
```
Endpoint: {CRM_API_URL}/opportunities
Método: POST/PUT
Headers: Authorization: Bearer {CRM_API_KEY}
Payload: { cpf, amount, status, simulation }
Response: { id, status, created }
```

## 📊 **Estados do Sistema**

### **Estados de Processamento**
```
INICIANDO → PROCESSANDO → PAUSADO → FINALIZADO
    ↓           ↓           ↓          ↓
  Upload     Loop CPFs   Usuário    Sucesso/
  CSV        Ativo       Pausa      Erro
```

### **Estados de CPF**
```
NOVO → CONSULTANDO → SIMULANDO → ATUALIZANDO → FINALIZADO
 ↓         ↓           ↓           ↓           ↓
Upload   API V8      API V8      CRM API    Sucesso/
CSV      Balance     Simulation  Update     Falha
```

## 🔄 **Comunicação Socket.IO**

### **Eventos do Servidor para Cliente**
```javascript
// Conexão
socket.emit('connect', { message: 'Conectado' });

// Logs
socket.emit('log', '✅ Linha: 1 | CPF: 12345678901 | Status: success');

// Progresso
socket.emit('progress', { current: 50, total: 100, percentage: 50 });

// Total de CPFs
socket.emit('totalCPFs', 1000);

// Atualização de delay
socket.emit('delayUpdate', 2000);
```

### **Eventos do Cliente para Servidor**
```javascript
// Pausar processamento
socket.emit('pause');

// Retomar processamento
socket.emit('resume');

// Cancelar processamento
socket.emit('cancel');

// Atualizar delay
socket.emit('updateDelay', 1500);
```

## 🎨 **Design System**

### **Cores da Identidade Lunas**
```css
/* Primárias */
--teal: #00d4aa;      /* Verde água */
--blue: #2563eb;      /* Azul */
--purple: #7c3aed;    /* Roxo */

/* Status */
--success: #10b981;   /* Verde sucesso */
--warning: #f59e0b;   /* Amarelo aviso */
--error: #ef4444;     /* Vermelho erro */
--info: #3b82f6;      /* Azul informação */
```

### **Componentes**
```
┌─────────────────────────────────────┐
│            HEADER                   │
│  🏢 Lunas FGTS - Painel Controle   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         CONTROLES                   │
│  [📁 Upload] [▶️ Iniciar] [⏸️ Pausar] │
│  [⏹️ Cancelar] [🔄 Reprocessar]      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         ESTATÍSTICAS                │
│  ✅ Sucesso: 150 | 💰 R$ 25.000,00  │
│  ⏳ Pendentes: 25 | 🚫 Não Auth: 75  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         LISTAS                      │
│  ┌─────────┬─────────┬─────────┐    │
│  │ Sucesso │Pendentes│ Não Auth│    │
│  │   150   │   25    │   75    │    │
│  └─────────┴─────────┴─────────┘    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│           LOGS                      │
│  [10:00:01] ✅ Linha: 1 | CPF: ... │
│  [10:00:02] ❌ Linha: 2 | CPF: ... │
│  [10:00:03] ⏳ Linha: 3 | CPF: ... │
└─────────────────────────────────────┘
```

## 🚀 **Deploy e Configuração**

### **Variáveis de Ambiente**
```env
# Servidor
PORT=3000
NODE_ENV=production

# APIs
LUNAS_API_KEY=cd4d0509169d4e2ea9177ac66c1c9376
V8_API_TOKEN=seu_token_v8
V8_API_BASE=https://api.v8sistema.com

# CRM
CRM_API_URL=https://seu-crm.com/api
CRM_API_KEY=seu_token_crm

# Upload
UPLOADS_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### **Dependências**
```json
{
  "express": "^4.18.2",
  "socket.io": "^4.7.2",
  "multer": "^1.4.5",
  "csv-parse": "^5.5.0",
  "axios": "^1.5.0",
  "dotenv": "^16.3.1"
}
```

### **Scripts de Deploy**
```bash
# Instalar dependências
npm install

# Iniciar servidor
npm start

# Teste local
node servidor-teste-fgts-local.js
```

---

**📋 Arquitetura documentada em**: 2025-01-30  
**🔄 Versão**: 1.0  
**🏗️ Sistema**: Painel FGTS - Arquitetura Completa
