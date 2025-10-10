# 🚀 PORTAS DO SISTEMA PRINCIPAL

## 📋 Resumo das Portas

| Sistema | Porta | Descrição | Container Docker |
|---------|-------|-----------|------------------|
| **Servidor Principal** | `3000` | API principal + Simulador | `servidor-principal` |
| **CRM Operacional** | `3001` | Sistema CRM e operacional | `crm` |
| **INSS Simulador** | `3002` | Simulador INSS + API | `api-simulador` |
| **Base de Dados** | `3003` | Clientes + Propostas | `base-dados` |
| **Nginx** | `80/443` | Load Balancer + Proxy | `nginx` |

## 🎯 Servidor Principal (Porta 3000)

### Arquivos Principais
- `server.js` - Servidor principal
- `index.js` - Ponto de entrada
- `package.json` - Dependências

### Endpoints Principais
- `GET /` - Página inicial
- `GET /api/health` - Status do sistema
- `POST /api/extrato` - Processar extrato
- `POST /api/simulador` - Simulação de contratos

### Configuração Docker
```yaml
servidor-principal:
  ports:
    - "3000:3000"
  environment:
    - PORT=3000
```

## 🔧 Comandos Úteis

### Verificar Status
```bash
# Verificar se está rodando
ps aux | grep server.js

# Verificar porta
netstat -tlnp | grep :3000

# Verificar container
docker ps | grep servidor-principal
```

### Logs
```bash
# Logs do servidor
tail -f /root/api-lunas/server.log

# Logs do container
docker logs servidor-principal-lunasdigital
```

### Reiniciar
```bash
# Parar processo
pkill -f 'server.js'

# Iniciar servidor
cd /root/api-lunas && nohup node server.js > server.log 2>&1 &

# Ou reiniciar container
docker restart servidor-principal-lunasdigital
```

## ⚠️ IMPORTANTE

- **NÃO** pare o container Docker sem necessidade
- **NÃO** altere a porta 3000 sem atualizar o docker-compose
- **SEMPRE** verificar se a porta está livre antes de iniciar
- **SEMPRE** documentar mudanças de porta

## 🌐 URLs de Acesso

- **Servidor Principal**: http://72.60.159.149:3000/
- **API Principal**: http://72.60.159.149:3000/api/
- **Health Check**: http://72.60.159.149:3000/api/health

---
*Documentação criada em: 03/01/2025*
*Última atualização: 03/01/2025*

