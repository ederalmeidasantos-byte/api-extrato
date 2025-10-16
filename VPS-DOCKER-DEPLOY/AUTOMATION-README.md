# 🚀 Automação Completa VPS + Docker + API Hostinger

## 📋 Visão Geral

Esta solução integra a **API Hostinger** com **Docker** para automatizar completamente o gerenciamento do seu VPS Lunas Digital. Você pode controlar seu VPS, fazer deploy, backup e monitoramento tudo via API! 🎯

## ✨ Funcionalidades Principais

### 🖥️ **Gerenciamento VPS via API Hostinger**
- ✅ Status do VPS em tempo real
- ✅ Backup automático do VPS
- ✅ Reinicialização do VPS
- ✅ Métricas de performance
- ✅ Listagem de backups

### 🐳 **Gerenciamento Docker Completo**
- ✅ Status dos containers
- ✅ Iniciar/parar/reiniciar containers
- ✅ Visualização de logs
- ✅ Deploy automático
- ✅ Limpeza automática

### 🚀 **Deploy Automático**
- ✅ Deploy completo do sistema
- ✅ Deploy individual por serviço
- ✅ Backup antes do deploy
- ✅ Rollback automático
- ✅ Verificação pós-deploy

### 💾 **Backup e Restore**
- ✅ Backup completo do sistema
- ✅ Backup do VPS via API
- ✅ Backup dos containers Docker
- ✅ Backup das configurações
- ✅ Restore completo

### 📊 **Monitoramento em Tempo Real**
- ✅ Status completo do sistema
- ✅ Health check dos serviços
- ✅ Monitoramento contínuo
- ✅ Alertas automáticos
- ✅ Relatórios de status

## 🎯 Arquivos Principais

### **Scripts de Automação**
- `hostinger-docker-automation.js` - Classe principal de automação
- `vps-docker-automation.sh` - Script interativo completo
- `server-integration.js` - Integração com server.js

### **Configurações**
- `automation-config.env` - Configurações completas
- `package-vps-automation.json` - Dependências Node.js

## 🚀 Como Usar

### **1. Instalação Rápida**

```bash
# 1. Instalar dependências
npm install axios

# 2. Tornar script executável
chmod +x VPS-DOCKER-DEPLOY/vps-docker-automation.sh

# 3. Executar automação
./VPS-DOCKER-DEPLOY/vps-docker-automation.sh
```

### **2. Integração com server.js**

```javascript
// Adicionar ao seu server.js
import './VPS-DOCKER-DEPLOY/server-integration.js';

// Agora você tem todas as rotas disponíveis:
// GET  /api/system/status
// POST /api/system/deploy
// POST /api/system/backup
// GET  /api/docker/status
// POST /api/vps/restart
// E muito mais!
```

### **3. Uso Programático**

```javascript
import HostingerDockerAutomation from './VPS-DOCKER-DEPLOY/hostinger-docker-automation.js';

const automation = new HostingerDockerAutomation();

// Status completo
const status = await automation.getCompleteStatus();

// Deploy completo
const deploy = await automation.deployComplete();

// Backup completo
const backup = await automation.createCompleteBackup();

// Monitoramento contínuo
const stopMonitoring = await automation.startContinuousMonitoring();
```

## 📊 Endpoints da API

### **Sistema Completo**
- `GET /api/system/status` - Status completo do sistema
- `POST /api/system/deploy` - Deploy completo
- `POST /api/system/backup` - Backup completo
- `POST /api/system/restore` - Restore do sistema

### **VPS (API Hostinger)**
- `GET /api/vps/status` - Status do VPS
- `POST /api/vps/backup` - Backup do VPS
- `POST /api/vps/restart` - Reiniciar VPS

### **Docker**
- `GET /api/docker/status` - Status dos containers
- `POST /api/docker/restart/:name` - Reiniciar container
- `GET /api/docker/logs/:name` - Logs do container

### **Serviços**
- `GET /api/services/health` - Health check completo

## 🔧 Configuração

### **1. Configurar Variáveis**

```bash
# Copiar arquivo de configuração
cp VPS-DOCKER-DEPLOY/automation-config.env .env

# Editar configurações
nano .env
```

### **2. Configurações Principais**

```env
# API Hostinger
HOSTINGER_API_TOKEN="seu_token_aqui"
VPS_ID="1035582"
VPS_IP="72.60.159.149"

# Docker
CRM_CONTAINER="crm-lunas-digital"
INSS_CONTAINER="inss-lunas-digital"

# Backup
BACKUP_DIR="/opt/lunasdigital/backups"
AUTO_BACKUP_ENABLED="true"

# Monitoramento
MONITORING_INTERVAL="60"
ALERT_EMAIL="suporte@lunasdigital.com.br"
```

## 🎮 Menu Interativo

O script `vps-docker-automation.sh` oferece um menu completo:

```
🚀 === AUTOMAÇÃO COMPLETA VPS + DOCKER ===

Escolha uma categoria:
1) 🖥️  Gerenciamento VPS (API Hostinger)
2) 🐳 Gerenciamento Docker
3) 🚀 Deploy e Backup
4) 📊 Monitoramento
5) 🔧 Manutenção
6) 📋 Status Completo
7) ❓ Ajuda
8) 🚪 Sair
```

### **Exemplos de Uso**

#### **Deploy Completo**
```bash
# Via script interativo
./VPS-DOCKER-DEPLOY/vps-docker-automation.sh
# Escolher opção 3 → 1

# Via API
curl -X POST http://localhost:3002/api/system/deploy \
  -H "Authorization: Bearer seu_token"
```

#### **Backup Completo**
```bash
# Via script interativo
./VPS-DOCKER-DEPLOY/vps-docker-automation.sh
# Escolher opção 3 → 2

# Via API
curl -X POST http://localhost:3002/api/system/backup
```

#### **Monitoramento Contínuo**
```bash
# Via script interativo
./VPS-DOCKER-DEPLOY/vps-docker-automation.sh
# Escolher opção 4 → 3

# Via código
const stopMonitoring = await automation.startContinuousMonitoring();
```

## 🔒 Segurança

### **Autenticação**
- ✅ Tokens de API obrigatórios para ações críticas
- ✅ Rate limiting configurável
- ✅ Logs de auditoria

### **Backup Seguro**
- ✅ Backup do VPS via API Hostinger
- ✅ Backup local dos containers
- ✅ Criptografia opcional
- ✅ Retenção configurável

### **Monitoramento**
- ✅ Alertas automáticos
- ✅ Health checks contínuos
- ✅ Logs de segurança

## 📈 Monitoramento

### **Métricas Disponíveis**
- 🖥️ Status do VPS (CPU, RAM, Disco)
- 🐳 Status dos containers Docker
- 🌐 Conectividade dos serviços
- 💾 Status dos backups
- 🔒 Status dos certificados SSL

### **Alertas Automáticos**
- ⚠️ Serviços offline
- 🚨 VPS offline
- 💾 Backup falhou
- 🔒 SSL expirando
- 📊 Recursos altos

## 🛠️ Manutenção

### **Limpeza Automática**
- 🧹 Containers parados
- 🗑️ Imagens não utilizadas
- 📦 Volumes órfãos
- 🌐 Redes não utilizadas

### **Atualizações**
- 🔄 Deploy automático
- 📦 Atualização de dependências
- 🔒 Renovação de certificados
- 🐳 Atualização de containers

## 🚨 Troubleshooting

### **Problemas Comuns**

#### **API Hostinger não responde**
```bash
# Verificar token
echo $HOSTINGER_API_TOKEN

# Testar conexão
curl -H "Authorization: Bearer $HOSTINGER_API_TOKEN" \
  https://developers.hostinger.com/api/vps/v1/virtual-machines
```

#### **Containers não iniciam**
```bash
# Verificar logs
docker logs crm-lunas-digital
docker logs inss-lunas-digital

# Verificar status
docker ps -a
```

#### **Serviços offline**
```bash
# Verificar conectividade
curl http://localhost:3001
curl http://localhost:3002

# Verificar Nginx
nginx -t
systemctl status nginx
```

## 📞 Suporte

### **Contatos**
- **Email**: suporte@lunasdigital.com.br
- **WhatsApp**: +55 11 95908-8554
- **GitHub**: https://github.com/lunasdigital

### **Documentação Adicional**
- [README Principal](README.md)
- [Deploy Rápido](DEPLOY-RAPIDO.md)
- [Configuração VPS](CONFIGURACAO-VPS.md)

## 🎉 Benefícios

### **Para Desenvolvedores**
- 🚀 Deploy em um comando
- 📊 Monitoramento em tempo real
- 🔄 Rollback automático
- 📋 Logs centralizados

### **Para Operações**
- 🖥️ Controle total do VPS
- 💾 Backup automático
- 🚨 Alertas proativos
- 📈 Relatórios detalhados

### **Para o Negócio**
- ⚡ Tempo de inatividade reduzido
- 🔒 Maior segurança
- 💰 Custos otimizados
- 📊 Visibilidade completa

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2025  
**Status**: Pronto para produção ✅

## 🚀 Próximos Passos

1. **Configure suas credenciais** no arquivo `.env`
2. **Teste a conexão** com a API Hostinger
3. **Execute o deploy** completo
4. **Configure monitoramento** contínuo
5. **Teste backup e restore**

**Sua automação VPS + Docker está pronta! 🎯**
