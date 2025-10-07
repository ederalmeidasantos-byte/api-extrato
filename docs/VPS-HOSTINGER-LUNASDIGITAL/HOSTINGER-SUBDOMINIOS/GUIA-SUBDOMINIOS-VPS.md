# 🌐 Guia Completo: Configuração de Subdomínios na VPS

## 📋 **Visão Geral**

Este guia te ensina como configurar múltiplos subdomínios na sua VPS para rodar sistemas separados, cada um em sua própria porta e subdomínio.

## 🎯 **Estrutura Proposta**

```
api.seudominio.com     → Porta 3000 (API Principal)
fgts.seudominio.com    → Porta 3001 (Sistema FGTS)
inss.seudominio.com    → Porta 3002 (Sistema INSS)
admin.seudominio.com   → Porta 3003 (Painel Admin)
```

## 🚀 **Passo a Passo**

### **1. Configuração de DNS**

No seu provedor de domínio (GoDaddy, Namecheap, etc.), configure:

```
Tipo: A
Nome: api
Valor: 72.60.159.149
TTL: 3600

Tipo: A
Nome: fgts
Valor: 72.60.159.149
TTL: 3600

Tipo: A
Nome: inss
Valor: 72.60.159.149
TTL: 3600

Tipo: A
Nome: admin
Valor: 72.60.159.149
TTL: 3600
```

### **2. Configuração na VPS**

#### **2.1. Conectar na VPS**
```bash
ssh root@72.60.159.149
```

#### **2.2. Executar Script de Configuração**
```bash
cd "/root/API Lunas"
chmod +x configurar-subdominios.sh
sudo bash configurar-subdominios.sh
```

#### **2.3. Configurar PM2 para Múltiplos Serviços**
```bash
# Parar serviços atuais
pm2 stop all
pm2 delete all

# Iniciar com nova configuração
pm2 start ecosystem-subdominios.config.cjs

# Salvar configuração
pm2 save
pm2 startup
```

### **3. Configuração dos Sistemas**

#### **3.1. Modificar server.js para Detectar Subdomínio**

Adicione no início do seu `server.js`:

```javascript
// Detectar subdomínio e porta
const subdominio = process.env.SUBDOMINIO || 'api';
const porta = process.env.PORT || 3000;

console.log(`🚀 Iniciando sistema ${subdominio} na porta ${porta}`);

// Configurações específicas por subdomínio
const configs = {
  api: {
    titulo: 'API Principal - Extratos',
    rota: '/api',
    cors: true
  },
  fgts: {
    titulo: 'Sistema FGTS',
    rota: '/fgts',
    cors: true
  },
  inss: {
    titulo: 'Sistema INSS',
    rota: '/inss',
    cors: true
  },
  admin: {
    titulo: 'Painel Administrativo',
    rota: '/admin',
    cors: false
  }
};

const config = configs[subdominio] || configs.api;
```

#### **3.2. Criar Servidores Específicos**

**Para FGTS (`fgts/server-fgts.js`):**
```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas específicas do FGTS
app.get('/', (req, res) => {
  res.json({
    sistema: 'FGTS',
    subdominio: 'fgts.seudominio.com',
    porta: PORT,
    status: 'online'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', sistema: 'FGTS' });
});

// Suas rotas específicas do FGTS aqui...

app.listen(PORT, () => {
  console.log(`🚀 Sistema FGTS rodando na porta ${PORT}`);
});
```

### **4. Configuração de SSL (Certificados)**

#### **4.1. Instalar Certbot**
```bash
sudo apt install certbot python3-certbot-nginx
```

#### **4.2. Obter Certificados**
```bash
# Para cada subdomínio
sudo certbot --nginx -d api.seudominio.com
sudo certbot --nginx -d fgts.seudominio.com
sudo certbot --nginx -d inss.seudominio.com
sudo certbot --nginx -d admin.seudominio.com
```

### **5. Verificação e Testes**

#### **5.1. Verificar Status dos Serviços**
```bash
# Status do Nginx
sudo systemctl status nginx

# Status dos processos Node.js
pm2 status

# Logs em tempo real
pm2 logs

# Logs específicos
pm2 logs api-principal
pm2 logs fgts-sistema
pm2 logs inss-sistema
pm2 logs admin-painel
```

#### **5.2. Testar Subdomínios**
```bash
# Testar cada subdomínio
curl http://api.seudominio.com/health
curl http://fgts.seudominio.com/health
curl http://inss.seudominio.com/health
curl http://admin.seudominio.com/health
```

### **6. Comandos Úteis**

#### **6.1. Gerenciamento de Serviços**
```bash
# Reiniciar todos os serviços
pm2 restart all

# Reiniciar serviço específico
pm2 restart api-principal

# Parar serviço específico
pm2 stop fgts-sistema

# Ver logs de um serviço
pm2 logs fgts-sistema --lines 100

# Monitorar recursos
pm2 monit
```

#### **6.2. Gerenciamento do Nginx**
```bash
# Testar configuração
sudo nginx -t

# Recarregar configuração
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs
sudo tail -f /var/log/nginx/api-extrato.access.log
sudo tail -f /var/log/nginx/fgts.access.log
```

## 🔧 **Troubleshooting**

### **Problema: Subdomínio não resolve**
- Verifique se o DNS foi propagado: `nslookup api.seudominio.com`
- Aguarde até 24h para propagação completa

### **Problema: Erro 502 Bad Gateway**
- Verifique se o serviço está rodando: `pm2 status`
- Verifique logs: `pm2 logs nome-do-servico`
- Verifique se a porta está correta

### **Problema: Certificado SSL não funciona**
- Verifique se o domínio está resolvendo corretamente
- Execute: `sudo certbot certificates`
- Renove certificados: `sudo certbot renew`

## 📊 **Monitoramento**

### **Script de Monitoramento**
```bash
#!/bin/bash
# monitor-subdominios.sh

echo "=== Status dos Subdomínios ==="
echo "API Principal: $(curl -s http://api.seudominio.com/health | jq -r '.status')"
echo "FGTS: $(curl -s http://fgts.seudominio.com/health | jq -r '.status')"
echo "INSS: $(curl -s http://inss.seudominio.com/health | jq -r '.status')"
echo "Admin: $(curl -s http://admin.seudominio.com/health | jq -r '.status')"
echo ""
echo "=== Status PM2 ==="
pm2 status
```

## 🎉 **Vantagens desta Configuração**

1. **Isolamento**: Cada sistema roda independentemente
2. **Escalabilidade**: Pode escalar cada sistema separadamente
3. **Manutenção**: Pode reiniciar um sistema sem afetar outros
4. **Logs**: Logs separados para cada sistema
5. **SSL**: Certificados individuais para cada subdomínio
6. **Performance**: Cada sistema otimizado para sua função

## ⚠️ **Importante**

- Substitua `seudominio.com` pelo seu domínio real
- Configure firewall para permitir portas 80, 443, 3000-3003
- Faça backup antes de aplicar mudanças
- Teste em ambiente de desenvolvimento primeiro

---

**Pronto! Agora você tem um sistema completo de subdomínios na sua VPS! 🚀**
