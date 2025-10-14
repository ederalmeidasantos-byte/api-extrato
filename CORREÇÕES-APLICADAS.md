# 🔧 Correções Aplicadas na API do Extrato

## ✅ Alterações Realizadas

### 1. **Nginx - Correção do Nome do Container**
**Arquivo:** `nginx/nginx.conf` (linha 64)

**Antes:**
```nginx
upstream api_simulador {
    server api-simulador-lunasdigital:3002;
    keepalive 32;
}
```

**Depois:**
```nginx
upstream api_simulador {
    server api-simulador:3002;
    keepalive 32;
}
```

### 2. **Nginx - Adição de Rotas Específicas para INSS**
**Arquivo:** `nginx/nginx.conf` (linhas 110-145)

**Adicionado:**
```nginx
# INSS (Porta 3002) - Endpoints específicos
location /extrato/ {
    limit_req zone=api burst=5 nodelay;
    proxy_pass http://api_simulador/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 180s;
    proxy_send_timeout 180s;
    proxy_read_timeout 180s;
}

location /extrair {
    limit_req zone=api burst=5 nodelay;
    proxy_pass http://api_simulador/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 180s;
    proxy_send_timeout 180s;
    proxy_read_timeout 180s;
}

location /api/calcular/ {
    limit_req zone=api burst=5 nodelay;
    proxy_pass http://api_simulador/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 180s;
    proxy_send_timeout 180s;
    proxy_read_timeout 180s;
}
```

### 3. **Server INSS - Adição de Endpoint `/extrato/:fileId`**
**Arquivo:** `INSS/server-inss.js` (linhas 560-649)

**Funcionalidade:**
- Processamento automático de PDFs
- Cache de 14 dias
- Download automático da API Kentro
- Extração via GPT-4

### 4. **Calculo.js - Correção da Função Assíncrona**
**Arquivo:** `INSS/calculo.js` (linha 442)

**Antes:**
```javascript
function calcularTrocoEndpoint(JSON_DIR) {
  return (_req, res) => {
    const extrato = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
```

**Depois:**
```javascript
function calcularTrocoEndpoint(JSON_DIR) {
  return async (_req, res) => {
    const extrato = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
```

### 5. **Server INSS - Correção da Chamada Assíncrona**
**Arquivo:** `INSS/server-inss.js` (linha 532)

**Antes:**
```javascript
calcularTroco(req, res);
```

**Depois:**
```javascript
await calcularTroco(req, res);
```

---

## 🚀 Como Aplicar no VPS

### Opção 1: Atualizar via Git
```bash
# No VPS
cd /root/API\ Lunas
git pull origin master
docker-compose restart nginx
docker-compose restart api-simulador
```

### Opção 2: Atualizar Manualmente
```bash
# 1. Copiar nginx.conf para o VPS
scp nginx/nginx.conf root@72.60.159.149:/root/API\ Lunas/nginx/

# 2. Copiar server-inss.js para o VPS
scp INSS/server-inss.js root@72.60.159.149:/root/API\ Lunas/INSS/

# 3. Copiar calculo.js para o VPS
scp INSS/calculo.js root@72.60.159.149:/root/API\ Lunas/INSS/

# 4. Reiniciar containers
ssh root@72.60.159.149 "cd /root/API\ Lunas && docker-compose restart nginx api-simulador"
```

---

## 🧪 Testes Necessários

Após aplicar as correções no VPS, executar:

```powershell
# 1. Testar endpoint /extrato/:id (com processamento automático)
Invoke-RestMethod -Uri "https://inss.lunasdigital.com.br/extrato/7578" -Method GET

# 2. Testar endpoint /extrato/:id/raw (somente leitura)
Invoke-RestMethod -Uri "https://inss.lunasdigital.com.br/extrato/7578/raw" -Method GET

# 3. Testar endpoint /extrair
Invoke-RestMethod -Uri "https://inss.lunasdigital.com.br/extrair" -Method POST -ContentType "application/json" -Body '{"fileId": "7578"}'

# 4. Testar endpoint /api/calcular/:id
Invoke-RestMethod -Uri "https://inss.lunasdigital.com.br/api/calcular/7578" -Method GET

# 5. Testar processamento automático com ID 7656
Invoke-RestMethod -Uri "https://inss.lunasdigital.com.br/extrato/7656" -Method GET -TimeoutSec 60
```

---

## 📊 Endpoints Esperados

| Endpoint | Método | Funcionalidade | Status Esperado |
|----------|--------|----------------|-----------------|
| `/extrato/:id` | GET | Processa PDF automaticamente | ✅ 200 |
| `/extrato/:id/raw` | GET | Retorna JSON cacheado | ✅ 200 |
| `/extrair` | POST | Processa PDF via POST | ✅ 200 |
| `/api/calcular/:id` | GET | Calcula simulação | ✅ 200 |

---

## ⚠️ Observações Importantes

1. **Nginx** precisa ser reiniciado para aplicar as novas rotas
2. **API Simulador** precisa ser reiniciado para aplicar as correções de código
3. **Timeouts longos** (180s) para processamento com GPT-4
4. **Cache de 14 dias** para evitar reprocessamento desnecessário
5. **Download automático** da Kentro se PDF não existir localmente

---

## 🎯 Próximos Passos

1. ✅ Aplicar correções no VPS via Git ou SCP
2. ✅ Reiniciar containers Nginx e API Simulador
3. ✅ Executar testes de todos os endpoints
4. ✅ Verificar logs para garantir funcionamento correto
5. ✅ Testar com ID 7656 (que não existe em cache)

