# 🚀 TEMPLATE RENDER - LUNAS DIGITAL

## 📋 **TEMPLATE PRONTO PARA DEPLOY**

Este é um template específico baseado no seu servidor local de teste, configurado para deploy no Render.

---

## 🎯 **ESTRUTURA DO PROJETO**

```
projeto-lunas-render/
├── .env.example              # Variáveis de ambiente
├── .gitignore               # Arquivos ignorados
├── package.json             # Dependências
├── server.js                # Servidor principal
├── README.md                # Documentação
├── public/                  # Arquivos estáticos
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── routes/                  # Rotas da API
    └── api.js
```

---

## 📄 **ARQUIVOS NECESSÁRIOS**

### **1. package.json**
```json
{
  "name": "lunas-digital-render",
  "version": "1.0.0",
  "description": "Servidor Lunas Digital para Render",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Testes executados\""
  },
  "keywords": ["lunas", "digital", "render", "nodejs"],
  "author": "Lunas Digital",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### **2. server.js**

⚠️ **IMPORTANTE**: O arquivo principal DEVE se chamar `server.js` e estar na **RAIZ** do projeto!

```javascript
// ===== SERVIDOR LUNAS DIGITAL - RENDER =====
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== ROTAS PRINCIPAIS =====

// Página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Configurações
app.get('/configuracoes', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'configuracoes.html'));
});

// Logs
app.get('/logs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logs.html'));
});

// Cache
app.get('/cache', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cache.html'));
});

// Painel FGTS
app.get('/fgts', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'fgts.html'));
});

// Roteiro INSS
app.get('/inss', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'inss.html'));
});

// ===== API ENDPOINTS =====

// API de teste
app.get('/api/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'Servidor Lunas Digital funcionando no Render!',
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: process.env.NODE_ENV || 'production'
    });
});

// API de configurações
app.get('/api/config', (req, res) => {
    res.json({
        servidor: 'Lunas Digital - Render',
        versao: '1.0.0',
        design_system: 'Lunas Digital',
        cores: {
            teal: '#00d4aa',
            blue: '#5a67d8',
            purple: '#7c3aed'
        },
        environment: process.env.NODE_ENV || 'production'
    });
});

// API de logs (mock)
app.get('/api/logs', (req, res) => {
    const logs = [
        {
            id: 1,
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Servidor iniciado com sucesso no Render',
            source: 'server.js'
        },
        {
            id: 2,
            timestamp: new Date(Date.now() - 60000).toISOString(),
            level: 'success',
            message: 'Design System Lunas Digital carregado',
            source: 'design-system.js'
        },
        {
            id: 3,
            timestamp: new Date(Date.now() - 120000).toISOString(),
            level: 'info',
            message: 'Deploy realizado com sucesso',
            source: 'render-deploy'
        }
    ];
    
    res.json({
        status: 'success',
        logs: logs,
        total: logs.length,
        environment: process.env.NODE_ENV || 'production'
    });
});

// API de cache (mock)
app.get('/api/cache', (req, res) => {
    res.json({
        status: 'success',
        cache: {
            total_items: 156,
            memory_usage: '2.3 MB',
            last_cleanup: new Date(Date.now() - 300000).toISOString(),
            items: [
                { key: 'user_session', size: '1.2 KB', ttl: '3600s' },
                { key: 'api_response', size: '856 B', ttl: '1800s' },
                { key: 'config_data', size: '2.1 KB', ttl: '7200s' }
            ]
        },
        environment: process.env.NODE_ENV || 'production'
    });
});

// API de métricas (mock)
app.get('/api/metrics', (req, res) => {
    res.json({
        status: 'success',
        metrics: {
            requests_total: 1247,
            requests_success: 1189,
            requests_error: 58,
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            cpu_usage: process.cpuUsage(),
            environment: process.env.NODE_ENV || 'production'
        }
    });
});

// API do INSS
app.get('/api/inss', (req, res) => {
    res.json({
        status: 'success',
        message: 'API do Roteiro INSS funcionando no Render',
        procedimentos: {
            total: 20,
            categorias: {
                aposentadorias: 8,
                auxilios: 6,
                pensoes: 3,
                bpc: 3
            }
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
    });
});

// ===== MIDDLEWARE DE ERRO =====

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Página não encontrada',
        path: req.path,
        method: req.method,
        environment: process.env.NODE_ENV || 'production'
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err);
    res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno',
        environment: process.env.NODE_ENV || 'production'
    });
});

// ===== INICIALIZAÇÃO =====

app.listen(PORT, () => {
    console.log('🚀 ===== SERVIDOR LUNAS DIGITAL INICIADO =====');
    console.log(`📡 Servidor rodando na porta: ${PORT}`);
    console.log(`🎨 Design System: Lunas Digital`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`📁 Diretório: ${__dirname}`);
    console.log('===============================================');
    console.log('');
    console.log('📋 Páginas disponíveis:');
    console.log(`   🏠 Página Inicial: https://seu-projeto.onrender.com/`);
    console.log(`   📊 Dashboard: https://seu-projeto.onrender.com/dashboard`);
    console.log(`   ⚙️ Configurações: https://seu-projeto.onrender.com/configuracoes`);
    console.log(`   📋 Logs: https://seu-projeto.onrender.com/logs`);
    console.log(`   💾 Cache: https://seu-projeto.onrender.com/cache`);
    console.log(`   📊 FGTS: https://seu-projeto.onrender.com/fgts`);
    console.log(`   🏛️ INSS: https://seu-projeto.onrender.com/inss`);
    console.log('');
    console.log('🔗 APIs disponíveis:');
    console.log(`   🧪 Teste: https://seu-projeto.onrender.com/api/test`);
    console.log(`   ⚙️ Config: https://seu-projeto.onrender.com/api/config`);
    console.log(`   📋 Logs: https://seu-projeto.onrender.com/api/logs`);
    console.log(`   💾 Cache: https://seu-projeto.onrender.com/api/cache`);
    console.log(`   📊 Métricas: https://seu-projeto.onrender.com/api/metrics`);
    console.log(`   🏛️ INSS: https://seu-projeto.onrender.com/api/inss`);
    console.log('');
    console.log('💡 Para parar o servidor: Ctrl+C');
    console.log('===============================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Parando servidor Lunas Digital...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Parando servidor Lunas Digital...');
    process.exit(0);
});
```

### **3. .env.example**
```bash
# Configurações do Servidor
NODE_ENV=production
PORT=3000

# Configurações da Lunas Digital
LUNAS_API_KEY=sua_chave_da_api
LUNAS_API_SECRET=sua_chave_secreta
LUNAS_API_URL=https://api.lunas.com.br

# Configurações de Banco de Dados (se necessário)
DATABASE_URL=postgresql://user:pass@host:port/db

# Configurações de Email (se necessário)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app

# Configurações de Segurança
JWT_SECRET=seu_jwt_secret_muito_seguro
SESSION_SECRET=seu_session_secret

# Configurações de Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

### **4. .gitignore**
```gitignore
# Dependências
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Variáveis de ambiente
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log

# Arquivos temporários
.tmp/
temp/

# Uploads
uploads/
public/uploads/

# Cache
.cache/
.parcel-cache/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Build
dist/
build/
```

### **5. README.md**
```markdown
# 🚀 Lunas Digital - Servidor Render

## 📋 Descrição
Servidor da Lunas Digital configurado para deploy no Render.

## 🎯 Características
- ✅ Design System Lunas Digital
- ✅ Menu lateral com navegação hover
- ✅ APIs mock para testes
- ✅ Páginas responsivas
- ✅ Deploy automático via Git

## 🚀 Deploy no Render

### 1. Preparação
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/lunas-digital-render.git
cd lunas-digital-render

# Instale as dependências
npm install
```

### 2. Configuração no Render
1. Acesse https://render.com
2. Conecte seu repositório GitHub
3. Configure:
   - **Name**: `lunas-digital-render`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. Variáveis de Ambiente
Configure no painel do Render:
- `NODE_ENV=production`
- `PORT=3000`
- Outras variáveis conforme necessário

## 📱 URLs Disponíveis

### Páginas
- **Inicial**: https://seu-projeto.onrender.com/
- **Dashboard**: https://seu-projeto.onrender.com/dashboard
- **Configurações**: https://seu-projeto.onrender.com/configuracoes
- **Logs**: https://seu-projeto.onrender.com/logs
- **Cache**: https://seu-projeto.onrender.com/cache
- **FGTS**: https://seu-projeto.onrender.com/fgts
- **INSS**: https://seu-projeto.onrender.com/inss

### APIs
- **Teste**: https://seu-projeto.onrender.com/api/test
- **Config**: https://seu-projeto.onrender.com/api/config
- **Logs**: https://seu-projeto.onrender.com/api/logs
- **Cache**: https://seu-projeto.onrender.com/api/cache
- **Métricas**: https://seu-projeto.onrender.com/api/metrics
- **INSS**: https://seu-projeto.onrender.com/api/inss

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Executar em produção
npm start
```

## 📞 Suporte
Para dúvidas ou problemas, consulte a documentação do Render ou entre em contato.

---

**Desenvolvido com ❤️ pela Lunas Digital**
```

---

## 🚀 **PASSOS PARA DEPLOY**

### **1. Criar Repositório GitHub**
```bash
# Inicializar Git
git init

# Adicionar arquivos
git add .

# Commit inicial
git commit -m "Initial commit - Lunas Digital Render"

# Conectar ao GitHub
git remote add origin https://github.com/seu-usuario/lunas-digital-render.git

# Push inicial
git push -u origin main
```

### **2. Configurar no Render**
1. Acesse https://render.com
2. Clique em "New +" > "Web Service"
3. Conecte seu repositório GitHub
4. Configure:
   - **Name**: `lunas-digital-render`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

### **3. Configurar Variáveis de Ambiente**
No painel do Render, vá em "Environment" e adicione:
```bash
NODE_ENV=production
PORT=3000
```

### **4. Deploy Automático**
- O Render fará deploy automático a cada push no GitHub
- Acompanhe os logs em tempo real
- URL será: `https://lunas-digital-render.onrender.com`

---

## ✅ **CHECKLIST FINAL**

- [ ] ✅ Repositório GitHub criado
- [ ] ✅ Arquivos commitados e pushados
- [ ] ✅ Render conectado ao repositório
- [ ] ✅ Variáveis de ambiente configuradas
- [ ] ✅ Deploy realizado com sucesso
- [ ] ✅ URL funcionando
- [ ] ✅ APIs respondendo
- [ ] ✅ Logs sem erros

---

## 🎉 **RESULTADO**

Após seguir estes passos, você terá:
- ✅ **Servidor funcionando** no Render
- ✅ **URL pública** para acessar
- ✅ **Deploy automático** via Git
- ✅ **SSL gratuito** (HTTPS)
- ✅ **Logs em tempo real**
- ✅ **Escalabilidade** automática

**Seu servidor Lunas Digital estará online!** 🚀✨
