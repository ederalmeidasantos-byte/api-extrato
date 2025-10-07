# 🖥️ Documentação Completa - server.js

## 📋 **Visão Geral**

Este documento contém a documentação completa do arquivo `server.js`, incluindo estrutura, endpoints, configurações e troubleshooting para evitar erros futuros.

---

## 🏗️ **Estrutura do Servidor**

### **Arquivo Principal:** `server.js`
- **Framework:** Express.js
- **Porta:** 3000
- **Ambiente:** Development/Production
- **Protocolo:** HTTP + WebSocket (Socket.IO)

---

## ⚙️ **Configurações Iniciais**

### **1. Configuração de Diretórios**
```javascript
// IMPORTANTE: Estas linhas DEVEM estar no topo do arquivo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do dotenv
dotenv.config({ path: path.join(__dirname, '.env') });
```

### **2. Imports e Dependências**
```javascript
// Core modules
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Middleware
import cors from 'cors';
import multer from 'multer';
import { Server } from 'socket.io';

// Módulos locais
import './fgts/fgts_csv.js';
import './fgts/api-tokens-v8.js';
```

---

## 🔧 **Configurações de Middleware**

### **1. CORS**
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
```

### **2. Multer (Upload de Arquivos)**
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });
```

### **3. Servir Arquivos Estáticos**
```javascript
// Arquivos estáticos principais
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Diretórios específicos
app.use('/operacional', express.static(path.join(__dirname, 'operacional')));
app.use('/INSS', express.static(path.join(__dirname, 'INSS')));
app.use('/fgts', express.static(path.join(__dirname, 'fgts')));
```

---

## 🌐 **Endpoints Principais**

### **1. Rotas de Página**
```javascript
// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Páginas específicas
app.get('/operacional', (req, res) => {
  res.sendFile(path.join(__dirname, 'operacional', 'index.html'));
});

app.get('/INSS/simulador', (req, res) => {
  res.sendFile(path.join(__dirname, 'INSS', 'simulador.html'));
});
```

### **2. API de Extração de PDF**
```javascript
app.post('/extrairpdf', upload.single('extrato'), async (req, res) => {
  try {
    // Validações
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado' });
    }
    
    // Processamento do PDF
    const resultado = await processarPDF(req.file);
    res.json(resultado);
    
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
```

---

## 🔗 **Endpoints da API Kentro**

### **1. Teste de Conexão**
```javascript
app.post('/kentro/testar-conexao', async (req, res) => {
  try {
    console.log('🧪 Testando conexão com API Kentro...');
    
    const response = await fetch('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queueId: 25,
        apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
        pipelineId: 2
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    const count = Array.isArray(data) ? data.length : 0;
    
    console.log(`✅ Conexão OK - ${count} oportunidades encontradas`);
    res.json({ success: true, count });

  } catch (error) {
    console.error('❌ Falha na conexão:', error);
    res.json({ success: false, error: error.message });
  }
});
```

### **2. Busca de Cliente por CPF**
```javascript
app.post('/kentro/buscar-cliente', async (req, res) => {
  try {
    const { cpf } = req.body;
    
    if (!cpf) {
      return res.json({ success: false, error: 'CPF não fornecido' });
    }

    console.log(`🔍 Buscando cliente por CPF: ${cpf}`);
    
    const response = await fetch('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queueId: 25,
        apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
        pipelineId: 2
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const oportunidades = await response.json();
    
    // IMPORTANTE: Buscar CPF no campo mainmail
    const oportunidade = oportunidades.find(op => {
      if (op.mainmail && op.mainmail.replace(/\D/g, '') === cpf.replace(/\D/g, '')) {
        return true;
      }
      return false;
    });
    
    if (oportunidade) {
      const cliente = {
        idoportunidade: oportunidade.id,
        cliente: {
          nome: oportunidade.title || '',
          status: oportunidade.status || 'Ativo',
          cpf: cpf
        }
      };
      
      res.json({ success: true, ...cliente });
    } else {
      res.json({ success: false, error: 'Cliente não encontrado' });
    }

  } catch (error) {
    console.error('❌ Erro ao buscar cliente:', error);
    res.json({ success: false, error: error.message });
  }
});
```

### **3. Consulta de Status**
```javascript
app.get('/kentro/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Consultando status da oportunidade ID: ${id}`);
    
    const response = await fetch('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queueId: 25,
        apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
        pipelineId: 2
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const oportunidades = await response.json();
    const oportunidade = oportunidades.find(op => op.id == id);
    
    if (oportunidade) {
      res.json({
        success: true,
        id: oportunidade.id,
        status: oportunidade.status || 'Ativo',
        ultimaAtualizacao: new Date().toISOString()
      });
    } else {
      res.json({ success: false, error: 'Oportunidade não encontrada' });
    }

  } catch (error) {
    console.error('❌ Erro ao consultar status:', error);
    res.json({ success: false, error: error.message });
  }
});
```

### **4. Criação de Oportunidade**
```javascript
app.post('/kentro/criar-oportunidade', async (req, res) => {
  try {
    const { cpf, origem, descricao } = req.body;
    
    if (!cpf) {
      return res.json({ success: false, error: 'CPF não fornecido' });
    }

    console.log(`🆕 Criando nova oportunidade para CPF: ${cpf}`);
    console.log(`📋 Origem: ${origem || 'N/A'}`);
    console.log(`📝 Descrição: ${descricao || 'N/A'}`);
    
    const novaOportunidade = {
      id: `new_${Date.now()}${Math.random().toString(36).substring(2, 9)}`,
      title: `Oportunidade para CPF ${cpf}`,
      description: cpf,
      mainmail: cpf, // IMPORTANTE: Usar CPF como mainmail
      mainphone: '',
      status: 'Nova',
      origem: origem,
      descricao: descricao,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Oportunidade simulada criada: ${novaOportunidade.id}`);
    res.json({ success: true, oportunidade: novaOportunidade });

  } catch (error) {
    console.error('❌ Erro ao criar oportunidade:', error);
    res.json({ success: false, error: error.message });
  }
});
```

---

## 🔌 **Configuração do Socket.IO**

```javascript
// Configuração do Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST']
  }
});

// Eventos do Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});
```

---

## 🚀 **Inicialização do Servidor**

```javascript
// Inicialização do servidor
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📁 Diretório: ${__dirname}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
```

---

## ⚠️ **Problemas Comuns e Soluções**

### **1. Erro: Cannot find module 'C:\Users\srcor\server.js'**

**Causa:** Comando executado no diretório errado

**Solução:**
```bash
# Certifique-se de estar no diretório correto
cd "C:\Users\srcor\API Lunas"

# Execute o servidor
node server.js
```

### **2. Erro: ReferenceError: Cannot access '__dirname' before initialization**

**Causa:** `__dirname` sendo usado antes da definição

**Solução:** Mover definições para o topo do arquivo:
```javascript
// TOPO DO ARQUIVO - ANTES DE QUALQUER IMPORTAÇÃO
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### **3. Erro: dotenv não carrega variáveis**

**Causa:** Arquivo .env em encoding incorreto ou localização errada

**Solução:**
```bash
# Verificar encoding do arquivo .env
Get-Content .env -Encoding UTF8 | Out-File .env.new -Encoding UTF8
Move-Item .env .env.backup
Move-Item .env.new .env
```

### **4. Erro: Port already in use**

**Causa:** Porta 3000 já está em uso

**Solução:**
```bash
# Matar processos Node.js
taskkill /F /IM node.exe

# Ou usar porta diferente
set PORT=3001
node server.js
```

### **5. Erro: Cannot GET /operacional/**

**Causa:** Rota não configurada

**Solução:** Adicionar middleware de arquivos estáticos:
```javascript
app.use('/operacional', express.static(path.join(__dirname, 'operacional')));
```

---

## 📁 **Estrutura de Diretórios Esperada**

```
API Lunas/
├── server.js                 # Arquivo principal
├── .env                      # Variáveis de ambiente
├── package.json              # Dependências
├── index.html                # Página principal
├── operacional/              # Páginas operacionais
│   ├── index.html
│   ├── kentro-test.html
│   └── buscar-propostas.html
├── INSS/                     # Páginas INSS
│   ├── simulador.html
│   └── simulador-logic.js
├── fgts/                     # Módulos FGTS
│   ├── fgts_csv.js
│   └── api-tokens-v8.js
├── uploads/                   # Arquivos enviados
└── @KENTRO API/              # Documentação Kentro
    ├── DOCUMENTACAO-COMPLETA-INTEGRACAO.md
    ├── ALTERACOES-SERVIDOR-IMPLEMENTADAS.md
    └── ...
```

---

## 🔧 **Scripts de Inicialização**

### **Windows (PowerShell):**
```powershell
# Navegar para o diretório
cd "C:\Users\srcor\API Lunas"

# Verificar se está no diretório correto
Get-Location

# Verificar se server.js existe
Test-Path "server.js"

# Executar servidor
node server.js
```

### **Windows (CMD):**
```cmd
cd "C:\Users\srcor\API Lunas"
dir server.js
node server.js
```

---

## 📊 **Monitoramento e Logs**

### **Logs Implementados:**
```javascript
// Logs de inicialização
console.log(`🚀 Servidor rodando na porta ${PORT}`);
console.log(`📁 Diretório: ${__dirname}`);

// Logs de API Kentro
console.log(`🔍 Buscando cliente por CPF: ${cpf}`);
console.log(`✅ Cliente encontrado! ID: ${oportunidade.id}`);
console.log(`❌ Erro ao buscar cliente: ${error.message}`);

// Logs de upload
console.log(`📄 Arquivo recebido: ${req.file.originalname}`);
console.log(`📊 Tamanho: ${req.file.size} bytes`);
```

### **Verificação de Status:**
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});
```

---

## 🛡️ **Segurança**

### **Validações Implementadas:**
```javascript
// Validação de CPF
if (!cpf || cpf.length !== 11) {
  return res.json({ success: false, error: 'CPF inválido' });
}

// Validação de arquivo
if (!req.file) {
  return res.status(400).json({ error: 'Arquivo não enviado' });
}

// Validação de tipo de arquivo
const allowedTypes = ['application/pdf'];
if (!allowedTypes.includes(req.file.mimetype)) {
  return res.status(400).json({ error: 'Tipo de arquivo não permitido' });
}
```

---

## 🔄 **Backup e Recuperação**

### **Backup do Servidor:**
```bash
# Criar backup do server.js
copy server.js server.js.backup

# Criar backup do .env
copy .env .env.backup

# Criar backup completo
xcopy "C:\Users\srcor\API Lunas" "C:\Backup\API Lunas" /E /I
```

### **Recuperação:**
```bash
# Restaurar arquivo
copy server.js.backup server.js
copy .env.backup .env
```

---

## ✅ **Checklist de Inicialização**

### **Antes de Executar:**
- [ ] Estar no diretório correto: `C:\Users\srcor\API Lunas`
- [ ] Arquivo `server.js` existe
- [ ] Arquivo `.env` existe e está em UTF-8
- [ ] Dependências instaladas: `npm install`
- [ ] Porta 3000 disponível
- [ ] Diretórios `operacional/`, `INSS/`, `fgts/` existem

### **Durante a Execução:**
- [ ] Servidor inicia sem erros
- [ ] Logs aparecem no console
- [ ] Página principal carrega: `http://localhost:3000`
- [ ] API Kentro responde: `http://localhost:3000/kentro/testar-conexao`

### **Após a Execução:**
- [ ] Testar busca por CPF: `46104631649`
- [ ] Testar upload de arquivo
- [ ] Verificar logs de erro
- [ ] Monitorar performance

---

## 📞 **Suporte e Troubleshooting**

### **Comandos de Diagnóstico:**
```bash
# Verificar processos Node.js
tasklist | findstr node

# Verificar porta 3000
netstat -an | findstr :3000

# Verificar arquivos
dir server.js
dir .env

# Verificar dependências
npm list
```

### **Logs de Erro Comuns:**
```
❌ Cannot find module 'C:\Users\srcor\server.js'
   → Solução: Executar no diretório correto

❌ ReferenceError: Cannot access '__dirname'
   → Solução: Mover definições para o topo

❌ Port 3000 is already in use
   → Solução: taskkill /F /IM node.exe

❌ Cannot GET /operacional/
   → Solução: Verificar middleware de arquivos estáticos
```

---

**Documentação criada em:** 02/01/2025  
**Versão:** 1.0.0  
**Status:** ✅ **DOCUMENTAÇÃO COMPLETA**
