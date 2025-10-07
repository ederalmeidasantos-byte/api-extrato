# 🚨 Guia de Troubleshooting - server.js

## 📋 **Problemas Comuns e Soluções**

Este guia contém soluções para os erros mais comuns encontrados ao executar o `server.js`.

---

## ❌ **Erro: Cannot find module 'C:\Users\srcor\server.js'**

### **Descrição do Erro:**
```
Error: Cannot find module 'C:\Users\srcor\server.js'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)
```

### **Causa:**
- Comando executado no diretório errado
- Arquivo `server.js` não existe no diretório atual
- Caminho incorreto especificado

### **Solução:**
```bash
# 1. Verificar diretório atual
pwd
# ou
Get-Location

# 2. Navegar para o diretório correto
cd "C:\Users\srcor\API Lunas"

# 3. Verificar se o arquivo existe
ls server.js
# ou
dir server.js

# 4. Executar o servidor
node server.js
```

### **Prevenção:**
- Sempre verificar o diretório antes de executar
- Usar caminho absoluto se necessário
- Criar script de inicialização

---

## ❌ **Erro: ReferenceError: Cannot access '__dirname' before initialization**

### **Descrição do Erro:**
```
ReferenceError: Cannot access '__dirname' before initialization
    at Object.<anonymous> (C:\Users\srcor\API Lunas\server.js:1:1)
```

### **Causa:**
- `__dirname` sendo usado antes da definição
- Ordem incorreta de imports
- Configuração do dotenv antes da definição

### **Solução:**
```javascript
// CORRETO - Topo do arquivo server.js
import { fileURLToPath } from 'url';
import path from 'path';

// Definir __dirname PRIMEIRO
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Depois configurar dotenv
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '.env') });

// Depois os outros imports
import express from 'express';
// ... resto dos imports
```

### **Estrutura Correta:**
```javascript
// 1. Imports do Node.js
import { fileURLToPath } from 'url';
import path from 'path';

// 2. Definir __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3. Configurar dotenv
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '.env') });

// 4. Imports do Express e outros
import express from 'express';
import http from 'http';
import cors from 'cors';
// ... resto dos imports
```

---

## ❌ **Erro: Port 3000 is already in use**

### **Descrição do Erro:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

### **Causa:**
- Porta 3000 já está sendo usada por outro processo
- Servidor anterior não foi finalizado corretamente
- Múltiplas instâncias do servidor rodando

### **Solução:**
```bash
# 1. Matar todos os processos Node.js
taskkill /F /IM node.exe

# 2. Verificar se a porta está livre
netstat -an | findstr :3000

# 3. Executar o servidor
node server.js
```

### **Alternativa - Usar Porta Diferente:**
```bash
# Definir porta diferente
set PORT=3001
node server.js

# Ou
node server.js --port 3001
```

### **Prevenção:**
- Sempre finalizar o servidor com Ctrl+C
- Verificar processos antes de iniciar
- Usar script de inicialização

---

## ❌ **Erro: Cannot GET /operacional/**

### **Descrição do Erro:**
```
Cannot GET /operacional/
```

### **Causa:**
- Middleware de arquivos estáticos não configurado
- Diretório `operacional` não existe
- Rota não definida

### **Solução:**
```javascript
// Adicionar middleware de arquivos estáticos
app.use('/operacional', express.static(path.join(__dirname, 'operacional')));

// Adicionar rota específica
app.get('/operacional', (req, res) => {
  res.sendFile(path.join(__dirname, 'operacional', 'index.html'));
});
```

### **Verificação:**
```bash
# Verificar se o diretório existe
dir operacional

# Verificar se o arquivo existe
dir operacional\index.html
```

---

## ❌ **Erro: dotenv não carrega variáveis**

### **Descrição do Erro:**
```
process.env.FGTS_USER_1: undefined
```

### **Causa:**
- Arquivo `.env` em encoding incorreto (UTF-16)
- Arquivo `.env` não existe
- Caminho incorreto do arquivo `.env`

### **Solução:**
```bash
# 1. Verificar se o arquivo existe
dir .env

# 2. Verificar encoding
Get-Content .env -Encoding UTF8

# 3. Converter para UTF-8
Get-Content .env -Encoding Unicode | Out-File .env.new -Encoding UTF8
Move-Item .env .env.backup
Move-Item .env.new .env

# 4. Verificar conteúdo
Get-Content .env
```

### **Estrutura Correta do .env:**
```env
# Arquivo .env deve estar em UTF-8
FGTS_USER_1=usuario1@exemplo.com
FGTS_PASS_1=senha123
FGTS_USER_2=usuario2@exemplo.com
FGTS_PASS_2=senha456
```

---

## ❌ **Erro: Module not found**

### **Descrição do Erro:**
```
Error: Cannot find module 'express'
Error: Cannot find module 'cors'
```

### **Causa:**
- Dependências não instaladas
- `node_modules` não existe
- `package.json` não existe

### **Solução:**
```bash
# 1. Verificar se package.json existe
dir package.json

# 2. Instalar dependências
npm install

# 3. Verificar se node_modules foi criado
dir node_modules

# 4. Executar o servidor
node server.js
```

---

## ❌ **Erro: SyntaxError: Unexpected token**

### **Descrição do Erro:**
```
SyntaxError: Unexpected token 'import'
```

### **Causa:**
- Usando sintaxe ES6 modules sem configuração
- `package.json` não tem `"type": "module"`

### **Solução:**
```json
// Adicionar no package.json
{
  "type": "module",
  "scripts": {
    "start": "node server.js"
  }
}
```

---

## 🔧 **Scripts de Diagnóstico**

### **Script de Verificação Completa:**
```powershell
# Verificar diretório
Write-Host "Diretório atual: $(Get-Location)"

# Verificar arquivos essenciais
Write-Host "Verificando arquivos..."
Test-Path "server.js" | ForEach-Object { Write-Host "server.js: $_" }
Test-Path ".env" | ForEach-Object { Write-Host ".env: $_" }
Test-Path "package.json" | ForEach-Object { Write-Host "package.json: $_" }
Test-Path "node_modules" | ForEach-Object { Write-Host "node_modules: $_" }

# Verificar diretórios
Write-Host "Verificando diretórios..."
Test-Path "operacional" | ForEach-Object { Write-Host "operacional: $_" }
Test-Path "INSS" | ForEach-Object { Write-Host "INSS: $_" }
Test-Path "fgts" | ForEach-Object { Write-Host "fgts: $_" }

# Verificar processos Node.js
Write-Host "Processos Node.js:"
Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, ProcessName

# Verificar porta 3000
Write-Host "Porta 3000:"
netstat -an | findstr :3000
```

### **Script de Inicialização Segura:**
```powershell
# Navegar para diretório
cd "C:\Users\srcor\API Lunas"

# Verificar se está no diretório correto
if (!(Test-Path "server.js")) {
    Write-Host "❌ Arquivo server.js não encontrado!"
    Write-Host "Diretório atual: $(Get-Location)"
    exit 1
}

# Matar processos Node.js existentes
Write-Host "🔄 Finalizando processos Node.js..."
taskkill /F /IM node.exe 2>$null

# Aguardar
Start-Sleep 2

# Verificar porta
$portCheck = netstat -an | findstr :3000
if ($portCheck) {
    Write-Host "⚠️ Porta 3000 ainda em uso"
    Write-Host $portCheck
}

# Executar servidor
Write-Host "🚀 Iniciando servidor..."
node server.js
```

---

## 📋 **Checklist de Inicialização**

### **Antes de Executar:**
- [ ] Estar no diretório: `C:\Users\srcor\API Lunas`
- [ ] Arquivo `server.js` existe
- [ ] Arquivo `.env` existe e está em UTF-8
- [ ] Arquivo `package.json` existe
- [ ] Diretório `node_modules` existe
- [ ] Dependências instaladas: `npm install`
- [ ] Porta 3000 disponível
- [ ] Diretórios `operacional/`, `INSS/`, `fgts/` existem

### **Comandos de Verificação:**
```bash
# Verificar diretório
pwd

# Verificar arquivos
ls server.js .env package.json

# Verificar dependências
npm list

# Verificar porta
netstat -an | findstr :3000

# Verificar processos
tasklist | findstr node
```

### **Comandos de Correção:**
```bash
# Matar processos
taskkill /F /IM node.exe

# Instalar dependências
npm install

# Converter .env para UTF-8
Get-Content .env -Encoding Unicode | Out-File .env.new -Encoding UTF8
Move-Item .env .env.backup
Move-Item .env.new .env

# Executar servidor
node server.js
```

---

## 🚀 **Script de Inicialização Automática**

### **Criar arquivo `start-server.bat`:**
```batch
@echo off
echo 🚀 Iniciando servidor API Lunas...

cd /d "C:\Users\srcor\API Lunas"

echo 📁 Diretório: %CD%

echo 🔄 Finalizando processos Node.js...
taskkill /F /IM node.exe 2>nul

echo ⏳ Aguardando...
timeout /t 2 /nobreak >nul

echo 🚀 Iniciando servidor...
node server.js

pause
```

### **Criar arquivo `start-server.ps1`:**
```powershell
Write-Host "🚀 Iniciando servidor API Lunas..." -ForegroundColor Green

# Navegar para diretório
Set-Location "C:\Users\srcor\API Lunas"
Write-Host "📁 Diretório: $(Get-Location)" -ForegroundColor Yellow

# Verificar arquivos essenciais
if (!(Test-Path "server.js")) {
    Write-Host "❌ Arquivo server.js não encontrado!" -ForegroundColor Red
    exit 1
}

if (!(Test-Path ".env")) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    exit 1
}

# Finalizar processos Node.js
Write-Host "🔄 Finalizando processos Node.js..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Aguardar
Start-Sleep 2

# Executar servidor
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Green
node server.js
```

---

## 📞 **Suporte Rápido**

### **Comandos de Emergência:**
```bash
# Parar tudo e recomeçar
taskkill /F /IM node.exe
cd "C:\Users\srcor\API Lunas"
node server.js

# Verificar status
netstat -an | findstr :3000
tasklist | findstr node

# Backup rápido
copy server.js server.js.backup
copy .env .env.backup
```

### **Logs de Debug:**
```javascript
// Adicionar no server.js para debug
console.log('🔍 Debug Info:');
console.log('  - __dirname:', __dirname);
console.log('  - __filename:', __filename);
console.log('  - process.cwd():', process.cwd());
console.log('  - process.env.NODE_ENV:', process.env.NODE_ENV);
```

---

**Guia criado em:** 02/01/2025  
**Versão:** 1.0.0  
**Status:** ✅ **GUIA COMPLETO DE TROUBLESHOOTING**
