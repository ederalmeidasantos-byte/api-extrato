# FGTS Token API

API dedicada para geração de tokens V8 Sistema com fallback automático entre credenciais.

## 🚀 Funcionalidades

- ✅ Geração automática de tokens
- ✅ 4 credenciais funcionando com fallback
- ✅ Renovação automática de tokens
- ✅ Troca de credenciais em tempo real
- ✅ Teste de validade de tokens
- ✅ Histórico de tokens gerados

## 📡 Endpoints

- `GET /` - Informações da API
- `GET /token` - Obter token atual
- `POST /token/refresh` - Renovar token
- `POST /token/switch-credential` - Trocar credencial
- `POST /token/test` - Testar token atual
- `GET /status` - Status detalhado
- `GET /health` - Health check

## 🔐 Credenciais Configuradas

1. **Cris** - `crislunasdigital@gmail.com` ✅
2. **Sérgio** - `srcor1@hotmail.com` ✅
3. **Lee** - `leemarsiglia@gmail.com` ✅

## 🎯 Link da API

Após o deploy: `https://fgts-token-api.onrender.com`

## 📊 Status

✅ 3/3 credenciais funcionando
✅ Tokens válidos por 24 horas
✅ Fallback automático entre credenciais
✅ Environment variables configuradas

## 🔧 Configuração no Render

1. **Configurar Environment Variables:**
   - `FGTS_USER_2` = leemarsiglia@gmail.com
   - `FGTS_USER_3` = srcor1@hotmail.com
   - `FGTS_USER_4` = crislunasdigital@gmail.com
   - `FGTS_PASS_2` = H^UnXygvOv)6
   - `FGTS_PASS_3` = ty#lN6z1
   - `FGTS_PASS_4` = 7.O?v>coI>5E

## 📋 Uso

```javascript
// Obter token
const response = await fetch('https://fgts-token-api.onrender.com/token');
const data = await response.json();
const token = data.token;

// Usar token na API V8
const fgtsResponse = await fetch('https://bff.v8sistema.com/fgts/balance?search=12345678901', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 🔄 Fallback Automático

A API automaticamente:
1. Tenta a primeira credencial
2. Se falhar, tenta a próxima
3. Continua até encontrar uma que funcione
4. Renova tokens antes de expirar
5. Mantém histórico de qual credencial está sendo usada

## 📊 Monitoramento

- `GET /status` - Status completo da API