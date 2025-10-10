# 🚀 PORTAS DO SISTEMA INSS

## 📋 Resumo das Portas

| Sistema | Porta | Descrição | Container Docker |
|---------|-------|-----------|------------------|
| **Servidor Principal** | `3000` | API principal + Simulador | `servidor-principal` |
| **CRM Operacional** | `3001` | Sistema CRM e operacional | `crm` |
| **INSS Simulador** | `3002` | Simulador INSS + API | `api-simulador` |
| **Base de Dados** | `3003` | Clientes + Propostas | `base-dados` |
| **Nginx** | `80/443` | Load Balancer + Proxy | `nginx` |

## 🎯 INSS Simulador (Porta 3002)

### Arquivos Principais
- `server-inss.js` - Servidor principal
- `simulador.html` - Interface do simulador
- `simulador-logic.js` - Lógica JavaScript
- `extrair_pdf.js` - Extração de dados do PDF

### Endpoints Principais
- `GET /inss/simulador.html` - Interface do simulador
- `POST /api/processar-extrato` - Processar extrato PDF
- `POST /api/kentro/criar-oportunidade` - Criar oportunidade na Kentro
- `POST /api/kentro/buscar-cliente` - Buscar cliente na Kentro

### Configuração Docker
```yaml
api-simulador:
  ports:
    - "3002:3002"
  environment:
    - PORT=3002
```

## 🔧 Comandos Úteis

### Verificar Status
```bash
# Verificar se está rodando
ps aux | grep server-inss

# Verificar porta
netstat -tlnp | grep :3002

# Verificar container
docker ps | grep api-simulador
```

### Logs
```bash
# Logs do servidor
tail -f /root/api-lunas/INSS/server.log

# Logs do container
docker logs api-simulador-lunasdigital
```

### Reiniciar
```bash
# Parar processo
pkill -f 'server-inss.js'

# Iniciar servidor
cd /root/api-lunas/INSS && nohup node server-inss.js > server.log 2>&1 &

# Ou reiniciar container
docker restart api-simulador-lunasdigital
```

## ⚠️ IMPORTANTE

- **NÃO** pare o container Docker sem necessidade
- **NÃO** altere a porta 3002 sem atualizar o docker-compose
- **SEMPRE** verificar se a porta está livre antes de iniciar
- **SEMPRE** documentar mudanças de porta

## 🌐 URLs de Acesso

- **Simulador INSS**: http://72.60.159.149:3002/inss/simulador.html
- **API INSS**: http://72.60.159.149:3002/api/
- **Logs**: http://72.60.159.149:3002/logs.html

---
*Documentação criada em: 03/01/2025*
*Última atualização: 03/01/2025*

