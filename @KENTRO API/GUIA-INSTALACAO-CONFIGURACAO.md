# 📦 Guia de Instalação e Configuração

## 🚀 **Instalação Rápida**

### **1. Verificar Pré-requisitos**
- ✅ Node.js versão 18+ instalado
- ✅ npm versão 8+ instalado
- ✅ Diretório correto: `C:\Users\srcor\API Lunas`

### **2. Instalar Dependências**
```bash
# Navegar para o diretório
cd "C:\Users\srcor\API Lunas"

# Instalar dependências
npm install
```

### **3. Configurar Variáveis de Ambiente**
```bash
# Verificar se .env existe
dir .env

# Se não existir, criar baseado no exemplo
copy env-example.txt .env
```

### **4. Executar Servidor**
```bash
# Método 1: Script automático
start-server.bat

# Método 2: PowerShell
.\start-server.ps1

# Método 3: Manual
node server.js
```

---

## 🔧 **Configuração Detalhada**

### **Arquivo package.json**
```json
{
  "name": "extrato-api",
  "version": "1.0.0",
  "description": "API para extrair dados de extratos INSS em PDF",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node --max-old-space-size=1024 --expose-gc server.js",
    "dev": "node --max-old-space-size=1024 --expose-gc server.js",
    "test": "node INSS/test-sistema.js"
  },
  "dependencies": {
    "axios": "^1.12.2",
    "cors": "^2.8.5",
    "dotenv": "^16.6.1",
    "express": "^4.21.2",
    "multer": "^1.4.5-lts.1",
    "socket.io": "^4.8.1"
  }
}
```

### **Arquivo .env**
```env
# Configurações do servidor
PORT=3000
NODE_ENV=development

# Configurações FGTS
FGTS_USER_1=usuario1@exemplo.com
FGTS_PASS_1=senha123
FGTS_USER_2=usuario2@exemplo.com
FGTS_PASS_2=senha456

# Configurações Kentro
KENTRO_API_KEY=cd4d0509169d4e2ea9177ac66c1c9376
KENTRO_QUEUE_ID=25
KENTRO_PIPELINE_ID=2
```

---

## 📁 **Estrutura de Diretórios**

```
API Lunas/
├── server.js                 # Servidor principal
├── package.json              # Dependências
├── .env                      # Variáveis de ambiente
├── start-server.bat          # Script de inicialização (Windows)
├── start-server.ps1          # Script de inicialização (PowerShell)
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
├── var/                      # Dados do sistema
│   └── data/
│       ├── cache/
│       └── extratos/
├── logs/                     # Logs do sistema
└── @KENTRO API/              # Documentação Kentro
    ├── DOCUMENTACAO-COMPLETA-INTEGRACAO.md
    ├── ALTERACOES-SERVIDOR-IMPLEMENTADAS.md
    ├── TESTES-REALIZADOS-API-KENTRO.md
    ├── DOCUMENTACAO-SERVIDOR-COMPLETA.md
    ├── GUIA-TROUBLESHOOTING-SERVIDOR.md
    └── RESUMO-FINAL-IMPLEMENTACAO.md
```

---

## 🚀 **Scripts de Inicialização**

### **start-server.bat (Windows)**
```batch
@echo off
echo 🚀 Iniciando servidor API Lunas...
cd /d "C:\Users\srcor\API Lunas"
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
node server.js
pause
```

### **start-server.ps1 (PowerShell)**
```powershell
Write-Host "🚀 Iniciando servidor API Lunas..." -ForegroundColor Green
Set-Location "C:\Users\srcor\API Lunas"
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2
node server.js
```

---

## 🔍 **Verificação de Instalação**

### **Comandos de Verificação:**
```bash
# Verificar Node.js
node --version

# Verificar npm
npm --version

# Verificar diretório
pwd

# Verificar arquivos
ls server.js package.json .env

# Verificar dependências
npm list

# Verificar porta
netstat -an | findstr :3000
```

### **Teste de Funcionamento:**
```bash
# 1. Iniciar servidor
node server.js

# 2. Testar página principal
curl http://localhost:3000

# 3. Testar API Kentro
curl -X POST http://localhost:3000/kentro/testar-conexao

# 4. Testar busca por CPF
curl -X POST http://localhost:3000/kentro/buscar-cliente \
  -H "Content-Type: application/json" \
  -d '{"cpf":"46104631649"}'
```

---

## ⚠️ **Problemas Comuns**

### **1. Erro: Cannot find module**
```bash
# Solução: Instalar dependências
npm install
```

### **2. Erro: Port 3000 in use**
```bash
# Solução: Matar processos Node.js
taskkill /F /IM node.exe
```

### **3. Erro: .env not found**
```bash
# Solução: Criar arquivo .env
copy env-example.txt .env
```

### **4. Erro: __dirname not defined**
```bash
# Solução: Verificar ordem dos imports no server.js
# __dirname deve ser definido antes de dotenv.config()
```

---

## 📊 **Monitoramento**

### **Logs do Servidor:**
```bash
# Ver logs em tempo real
tail -f logs/server.log

# Ver logs de erro
tail -f logs/api-errors.log
```

### **Status do Servidor:**
```bash
# Verificar processos
tasklist | findstr node

# Verificar porta
netstat -an | findstr :3000

# Testar conectividade
curl http://localhost:3000/health
```

---

## 🔄 **Atualizações**

### **Atualizar Dependências:**
```bash
# Verificar atualizações
npm outdated

# Atualizar dependências
npm update

# Atualizar dependências específicas
npm install express@latest
```

### **Backup:**
```bash
# Criar backup
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz var/data/

# Restaurar backup
tar -xzf backup-YYYYMMDD-HHMMSS.tar.gz
```

---

## 📞 **Suporte**

### **Comandos de Emergência:**
```bash
# Parar tudo
taskkill /F /IM node.exe

# Limpar cache
npm cache clean --force

# Reinstalar dependências
rm -rf node_modules
npm install

# Verificar integridade
npm audit
```

### **Logs de Debug:**
```bash
# Executar com debug
node --inspect server.js

# Executar com logs detalhados
DEBUG=* node server.js
```

---

**Guia criado em:** 02/01/2025  
**Versão:** 1.0.0  
**Status:** ✅ **GUIA COMPLETO DE INSTALAÇÃO**
