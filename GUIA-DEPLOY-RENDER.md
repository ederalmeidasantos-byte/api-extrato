# 🚀 GUIA COMPLETO - DEPLOY NO RENDER

## 📋 **ÍNDICE**
1. [Visão Geral](#visão-geral)
2. [Preparação do Projeto](#preparação-do-projeto)
3. [Configuração do Render](#configuração-do-render)
4. [Variáveis de Ambiente](#variáveis-de-ambiente)
5. [Estrutura de Arquivos](#estrutura-de-arquivos)
6. [Scripts de Deploy](#scripts-de-deploy)
7. [Monitoramento](#monitoramento)
8. [Troubleshooting](#troubleshooting)
9. [Templates Prontos](#templates-prontos)
10. [Checklist de Deploy](#checklist-de-deploy)

---

## 🎯 **VISÃO GERAL**

### **O que é o Render?**
- **Plataforma de Deploy** para aplicações web
- **Suporte completo** a Node.js, Python, Ruby, etc.
- **Deploy automático** via Git
- **SSL gratuito** e domínio personalizado
- **Escalabilidade** automática

### **Vantagens:**
- ✅ **Gratuito** para projetos pequenos
- ✅ **Deploy automático** via Git push
- ✅ **SSL automático** (HTTPS)
- ✅ **Logs em tempo real**
- ✅ **Variáveis de ambiente** seguras
- ✅ **Backup automático**

---

## 🛠️ **PREPARAÇÃO DO PROJETO**

### **1. Estrutura Mínima Necessária**
```
projeto/
├── package.json          # Dependências e scripts
├── server.js             # Arquivo principal do servidor
├── .env.example          # Exemplo de variáveis de ambiente
├── .gitignore           # Arquivos ignorados pelo Git
├── README.md            # Documentação do projeto
└── public/              # Arquivos estáticos (opcional)
    ├── css/
    ├── js/
    └── images/
```

### **2. package.json Configurado**
```json
{
  "name": "meu-projeto-render",
  "version": "1.0.0",
  "description": "Descrição do projeto",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Testes executados\""
  },
  "keywords": ["nodejs", "express", "render"],
  "author": "Seu Nome",
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

### **3. server.js Configurado para Render**
```javascript
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

// Rotas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'Servidor funcionando no Render!',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 URL: https://meu-projeto.onrender.com`);
});
```

---

## ⚙️ **CONFIGURAÇÃO DO RENDER**

### **1. Criar Conta no Render**
1. Acesse: https://render.com
2. Clique em "Get Started for Free"
3. Conecte com GitHub/GitLab/Bitbucket
4. Autorize o acesso aos repositórios

### **2. Criar Novo Serviço Web**
1. Clique em "New +"
2. Selecione "Web Service"
3. Conecte seu repositório
4. Configure as opções:

#### **Configurações Básicas:**
- **Name**: `meu-projeto-render`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free` (para começar)

#### **Configurações Avançadas:**
- **Branch**: `main` ou `master`
- **Root Directory**: `.` (raiz do projeto)
- **Auto-Deploy**: `Yes` (deploy automático)

### **3. Configurar Variáveis de Ambiente**
No painel do Render:
1. Vá em "Environment"
2. Adicione as variáveis necessárias:

```bash
# Exemplo de variáveis
NODE_ENV=production
PORT=3000
API_KEY=sua_chave_aqui
DATABASE_URL=sua_url_do_banco
```

---

## 🔐 **VARIÁVEIS DE AMBIENTE**

### **1. Arquivo .env.example**
```bash
# Configurações do Servidor
NODE_ENV=development
PORT=3000

# APIs Externas
API_KEY=sua_chave_da_api
API_SECRET=sua_chave_secreta
API_URL=https://api.exemplo.com

# Banco de Dados
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://user:pass@host:port

# Configurações de Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app

# Configurações de Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Configurações de Segurança
JWT_SECRET=seu_jwt_secret_muito_seguro
SESSION_SECRET=seu_session_secret
```

### **2. Arquivo .gitignore**
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

---

## 📁 **ESTRUTURA DE ARQUIVOS**

### **Estrutura Completa Recomendada**
```
projeto-render/
├── .env.example              # Exemplo de variáveis
├── .gitignore               # Arquivos ignorados
├── .render.yaml             # Configuração do Render (opcional)
├── package.json             # Dependências e scripts
├── server.js                # Servidor principal
├── README.md                # Documentação
├── public/                  # Arquivos estáticos
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── images/
├── routes/                  # Rotas da API
│   ├── api.js
│   └── auth.js
├── middleware/              # Middlewares
│   ├── auth.js
│   └── validation.js
├── models/                  # Modelos de dados
│   └── User.js
├── utils/                   # Utilitários
│   ├── database.js
│   └── helpers.js
└── tests/                   # Testes
    └── api.test.js
```

### **Arquivo .render.yaml (Opcional)**
```yaml
services:
  - type: web
    name: meu-projeto
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
```

---

## 🚀 **SCRIPTS DE DEPLOY**

### **1. Script de Deploy Automático**
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Iniciando deploy no Render..."

# Verificar se está no branch correto
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Você deve estar no branch 'main' para fazer deploy"
    exit 1
fi

# Verificar se há mudanças não commitadas
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Há mudanças não commitadas. Faça commit primeiro."
    exit 1
fi

# Fazer push para o repositório
echo "📤 Fazendo push para o repositório..."
git push origin main

echo "✅ Deploy iniciado! Acompanhe no painel do Render."
echo "🌐 URL: https://meu-projeto.onrender.com"
```

### **2. Script de Verificação Pós-Deploy**
```bash
#!/bin/bash
# verify-deploy.sh

PROJECT_URL="https://meu-projeto.onrender.com"

echo "🔍 Verificando deploy..."

# Verificar se o servidor está respondendo
if curl -f -s "$PROJECT_URL/api/health" > /dev/null; then
    echo "✅ Servidor está funcionando!"
    echo "🌐 URL: $PROJECT_URL"
else
    echo "❌ Servidor não está respondendo"
    echo "🔍 Verifique os logs no painel do Render"
fi
```

### **3. Script de Rollback**
```bash
#!/bin/bash
# rollback.sh

echo "🔄 Fazendo rollback..."

# Voltar para o commit anterior
git reset --hard HEAD~1

# Fazer push forçado
git push origin main --force

echo "✅ Rollback concluído!"
```

---

## 📊 **MONITORAMENTO**

### **1. Logs do Render**
- Acesse o painel do Render
- Vá em "Logs" para ver logs em tempo real
- Use filtros para encontrar erros específicos

### **2. Métricas Importantes**
- **Uptime**: Tempo de funcionamento
- **Response Time**: Tempo de resposta
- **Memory Usage**: Uso de memória
- **CPU Usage**: Uso de CPU

### **3. Alertas Configurados**
```javascript
// Exemplo de middleware de monitoramento
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
        
        // Alertar se resposta demorar mais que 5s
        if (duration > 5000) {
            console.warn(`⚠️ Resposta lenta: ${req.path} - ${duration}ms`);
        }
    });
    
    next();
});
```

---

## 🔧 **TROUBLESHOOTING**

### **Problemas Comuns e Soluções**

#### **1. Erro: "Cannot find module"**
```bash
# Solução: Verificar se todas as dependências estão no package.json
npm install --save express cors dotenv
```

#### **2. Erro: "Port already in use"**
```javascript
// Solução: Usar variável de ambiente PORT
const PORT = process.env.PORT || 3000;
```

#### **3. Erro: "ENOENT: no such file or directory"**
```javascript
// Solução: Usar path absoluto
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
```

#### **4. Erro: "Memory limit exceeded"**
```javascript
// Solução: Otimizar uso de memória
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

#### **5. Erro: "Timeout"**
- Verificar se o servidor está respondendo
- Aumentar timeout no Render (plano pago)
- Otimizar queries de banco de dados

### **Comandos de Debug**
```bash
# Verificar logs locais
npm start

# Testar API localmente
curl http://localhost:3000/api/health

# Verificar variáveis de ambiente
echo $NODE_ENV
echo $PORT
```

---

## 📋 **TEMPLATES PRONTOS**

### **1. Template Básico Node.js + Express**
```javascript
// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rotas
app.get('/', (req, res) => {
    res.json({ message: 'API funcionando!' });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
```

### **2. Template com Banco de Dados**
```javascript
// server.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar ao banco
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Middleware
app.use(express.json());

// Rotas
app.use('/api/users', require('./routes/users'));

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
```

### **3. Template com Autenticação**
```javascript
// server.js
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Rotas
app.post('/api/login', (req, res) => {
    // Lógica de login
    const token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET);
    res.json({ token });
});

app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Rota protegida acessada!' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
```

---

## ✅ **CHECKLIST DE DEPLOY**

### **Antes do Deploy**
- [ ] ✅ Projeto funcionando localmente
- [ ] ✅ package.json configurado corretamente
- [ ] ✅ Variáveis de ambiente definidas
- [ ] ✅ .gitignore configurado
- [ ] ✅ README.md atualizado
- [ ] ✅ Testes passando (se houver)
- [ ] ✅ Código commitado e pushado

### **Durante o Deploy**
- [ ] ✅ Render conectado ao repositório
- [ ] ✅ Build Command: `npm install`
- [ ] ✅ Start Command: `npm start`
- [ ] ✅ Variáveis de ambiente configuradas
- [ ] ✅ Porta configurada corretamente

### **Após o Deploy**
- [ ] ✅ URL funcionando
- [ ] ✅ API respondendo
- [ ] ✅ Logs sem erros
- [ ] ✅ Performance adequada
- [ ] ✅ SSL funcionando (HTTPS)

---

## 🎯 **DICAS IMPORTANTES**

### **1. Performance**
- Use `express.static()` para arquivos estáticos
- Implemente cache quando possível
- Otimize queries de banco de dados
- Use CDN para assets grandes

### **2. Segurança**
- Nunca commite arquivos `.env`
- Use HTTPS sempre
- Valide todas as entradas
- Implemente rate limiting

### **3. Monitoramento**
- Configure alertas de erro
- Monitore logs regularmente
- Use ferramentas de APM
- Implemente health checks

### **4. Escalabilidade**
- Use variáveis de ambiente
- Implemente graceful shutdown
- Use process managers (PM2)
- Configure load balancing

---

## 📞 **SUPORTE**

### **Recursos Úteis**
- **Documentação Render**: https://render.com/docs
- **Status Page**: https://status.render.com
- **Community**: https://community.render.com

### **Comandos de Emergência**
```bash
# Parar serviço
# No painel do Render: Settings > Danger Zone > Suspend Service

# Reiniciar serviço
# No painel do Render: Manual Deploy > Deploy latest commit

# Ver logs
# No painel do Render: Logs
```

---

## 🎉 **CONCLUSÃO**

Com este guia, você tem tudo o que precisa para fazer deploy de qualquer projeto Node.js no Render!

### **Próximos Passos:**
1. **Escolha um template** que se adequa ao seu projeto
2. **Configure as variáveis** de ambiente
3. **Faça o deploy** seguindo o checklist
4. **Monitore** o funcionamento
5. **Otimize** conforme necessário

**Boa sorte com seus deploys!** 🚀✨
