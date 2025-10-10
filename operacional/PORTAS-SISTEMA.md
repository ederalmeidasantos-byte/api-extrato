# 🚀 PORTAS DO SISTEMA OPERACIONAL

## 📋 Resumo das Portas

| Sistema | Porta | Descrição | Container Docker |
|---------|-------|-----------|------------------|
| **Servidor Principal** | `3000` | API principal + Simulador | `servidor-principal` |
| **CRM Operacional** | `3001` | Sistema CRM e operacional | `crm` |
| **INSS Simulador** | `3002` | Simulador INSS + API | `api-simulador` |
| **Base de Dados** | `3003` | Clientes + Propostas | `base-dados` |
| **Nginx** | `80/443` | Load Balancer + Proxy | `nginx` |

## 🎯 CRM Operacional (Porta 3001)

### Arquivos Principais
- `server.js` - Servidor principal
- `index.html` - Interface principal
- `client-manager.js` - Gerenciamento de clientes
- `kentro-integration.cjs` - Integração com Kentro

### Endpoints Principais
- `GET /` - Interface principal
- `GET /clientes` - Lista de clientes
- `POST /api/clientes` - Criar/atualizar cliente
- `POST /api/kentro/buscar-cliente` - Buscar na Kentro
- `POST /api/kentro/criar-oportunidade` - Criar oportunidade

### Configuração Docker
```yaml
crm:
  ports:
    - "3001:3001"
  environment:
    - PORT=3001
```

## 🔧 Comandos Úteis

### Verificar Status
```bash
# Verificar se está rodando
ps aux | grep server.js

# Verificar porta
netstat -tlnp | grep :3001

# Verificar container
docker ps | grep crm
```

### Logs
```bash
# Logs do servidor
tail -f /root/api-lunas/operacional/server.log

# Logs do container
docker logs crm-lunasdigital
```

### Reiniciar
```bash
# Parar processo
pkill -f 'server.js'

# Iniciar servidor
cd /root/api-lunas/operacional && nohup node server.js > server.log 2>&1 &

# Ou reiniciar container
docker restart crm-lunasdigital
```

## ⚠️ IMPORTANTE

- **NÃO** pare o container Docker sem necessidade
- **NÃO** altere a porta 3001 sem atualizar o docker-compose
- **SEMPRE** verificar se a porta está livre antes de iniciar
- **SEMPRE** documentar mudanças de porta

## 🌐 URLs de Acesso

- **CRM Operacional**: http://72.60.159.149:3001/
- **API CRM**: http://72.60.159.149:3001/api/
- **Clientes**: http://72.60.159.149:3001/clientes

---
*Documentação criada em: 03/01/2025*
*Última atualização: 03/01/2025*

