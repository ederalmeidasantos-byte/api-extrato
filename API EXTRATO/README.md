# FGTS Token API

API dedicada para geração de tokens de autenticação do sistema V8 FGTS.

## 🚀 Funcionalidades

- Geração automática de tokens V8
- Cache inteligente de tokens
- Múltiplas credenciais
- Endpoints RESTful
- CORS habilitado

## 📋 Endpoints

### GET /
Informações básicas da API

### GET /health
Status de saúde da API

### GET /status
Status detalhado com informações de cache e credenciais

### GET /credentials
Lista todas as credenciais disponíveis

### GET /token/:credencialId
Obtém token para uma credencial específica

### POST /token/:credencialId
Obtém token com opção de refresh forçado

## 🔧 Configuração

1. Copie `env-example.txt` para `.env`
2. Configure suas credenciais V8
3. Execute `npm install`
4. Execute `npm start`

## 📦 Dependências

- express
- axios
- dotenv

## 🌐 Deploy

Esta API está configurada para deploy no Render.com

