# Sistema FGTS - Container Docker

## Visão Geral

O Sistema FGTS foi containerizado usando Docker para facilitar o deploy e manutenção. O container roda um servidor Node.js Express com Socket.IO na porta 3005.

## Arquitetura

- **Container**: `fgts-lunasdigital`
- **Porta**: 3005
- **Network**: `fgts-network` (isolada)
- **Volumes**: Cache persistente, uploads, extratos, logs

## Acesso ao Sistema

**✅ Acesso Direto por IP:**
- `http://72.60.159.149:3005/` - ✅ **FUNCIONANDO PERFEITAMENTE**

### 🎯 **Como Usar o Sistema:**

1. **Acesse:** `http://72.60.159.149:3005/`
2. **Configure:** "CPFs Simultâneos" (1-20)
3. **Configure:** "Delay (ms)" (100-5000ms)
4. **Faça upload** do CSV
5. **Monitore** processamento em tempo real

### Processamento Simultâneo
- **Concorrência Configurável**: 1-20 CPFs simultâneos
- **Controle em Tempo Real**: Via painel web
- **Fluxo Contínuo**: Quando um CPF termina, o próximo inicia
- **Performance**: Até 1200 CPFs/hora com 20 simultâneos

### Processamento Individual
- **Validação de CPF**: Verificação automática
- **Consulta V8**: Integração com API de saldo
- **Simulação**: Tabelas NORMAL e ACELERA
- **Kentro**: Disparo automático de oportunidades
- **Cache**: Evita consultas duplicadas

### Monitoramento
- **Logs em Tempo Real**: Via Socket.IO
- **Contadores**: Sucessos, pendentes, erros
- **Progresso**: Atualização contínua
- **Status**: Sistema sempre visível

## Comandos Principais

### Build e Deploy
```bash
# Build da imagem
docker-compose build

# Iniciar container
docker-compose up -d

# Parar container
docker-compose down

# Ver logs
docker-compose logs -f

# Restart
docker-compose restart
```

### Scripts Automatizados
```bash
# Deploy completo
./deploy-fgts.sh

# Testes funcionais
./test-fgts.sh
```

## Volumes Persistentes

- `fgts-cache`: Cache de CPFs processados (`/var/data/cache`)
- `fgts-uploads`: Arquivos CSV enviados (`/app/fgts/uploads`)
- `fgts-extratos`: PDFs processados (`/app/fgts/extratos`)
- `fgts-json`: Dados JSON (`/app/fgts/jsonDir`)
- `fgts-logs`: Logs de erro (`/app/fgts/logs`)

## Endpoints Principais

### Status e Health Check
- `GET /fgts/status` - Status do sistema
- `GET /fgts/config` - Configurações atuais

### Processamento
- `POST /fgts/run` - Upload e processamento de CSV
- `POST /fgts/pause` - Pausar processamento
- `POST /fgts/resume` - Retomar processamento
- `POST /fgts/delay` - Alterar delay entre requisições
- `Socket.IO setConcurrency` - Alterar número de CPFs simultâneos
- `Socket.IO setDelay` - Alterar delay via Socket.IO

### Cache e Dados
- `GET /fgts/cache/estatisticas` - Estatísticas do cache
- `POST /fgts/cache/limpar` - Limpar cache
- `GET /fgts/listas` - Listas de CPFs processados
- `GET /fgts/logs/erros` - Logs de erro recentes

### Configurações
- `POST /fgts/config/backup` - Backup das configurações
- `POST /fgts/config/restore` - Restaurar configurações

## Variáveis de Ambiente

### Obrigatórias
```bash
PORT=3005
FGTS_USER_1=crislunasdigital@gmail.com
FGTS_PASS_1=7.O?v>coI>5E
FGTS_USER_2=leemarsiglia@gmail.com
FGTS_PASS_2=H^UnXygvOv)6
FGTS_USER_3=srcor1@hotmail.com
FGTS_PASS_3="ty#lN6z1"
FGTS_USER_4=crislunasdigital@gmail.com
FGTS_PASS_4=7.O?v>coI>5E
LUNAS_API_KEY=cd4d0509169d4e2ea9177ac66c1c9376
LUNAS_QUEUE_ID=25
DEST_STAGE_ID=4
CLIENT_ID=DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn
```

### Opcionais
```bash
NODE_ENV=production
OPENAI_API_KEY=sk-proj-...
PROVIDER=cartos
```

## Integração com Nginx

Para acesso via `fgts.lunasdigital.com.br`, adicione ao nginx.conf:

```nginx
server {
    listen 80;
    server_name fgts.lunasdigital.com.br;
    
    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoramento

### Health Check
O container inclui health check automático que verifica o endpoint `/fgts/status` a cada 30 segundos.

### Logs
```bash
# Logs em tempo real
docker-compose logs -f

# Logs específicos do container
docker logs fgts-lunasdigital -f

# Logs de erro do sistema
docker exec fgts-lunasdigital cat /app/fgts/logs/api-errors.log
```

### Métricas
- **CPU**: Monitorar uso durante processamento
- **Memória**: Cache pode crescer com muitos CPFs
- **Rede**: Conexões com APIs externas (V8, Lunas)
- **Disco**: Volumes persistentes para cache e logs

## Troubleshooting

### Container não inicia
```bash
# Verificar logs
docker-compose logs

# Verificar se porta está livre
netstat -tulpn | grep 3005

# Rebuild completo
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### API não responde
```bash
# Verificar health check
docker inspect fgts-lunasdigital | grep Health

# Testar endpoint diretamente
curl http://localhost:3005/fgts/status

# Verificar logs de erro
docker exec fgts-lunasdigital tail -f /app/fgts/logs/api-errors.log
```

### Problemas de Cache
```bash
# Limpar cache via API
curl -X POST http://localhost:3005/fgts/cache/limpar

# Verificar estatísticas
curl http://localhost:3005/fgts/cache/estatisticas

# Limpar volumes (CUIDADO: perde dados)
docker-compose down -v
docker-compose up -d
```

## Backup e Restore

### Backup Manual
```bash
# Backup de volumes
docker run --rm -v fgts-cache:/data -v $(pwd):/backup alpine tar czf /backup/fgts-cache-backup.tar.gz -C /data .

# Backup de configurações
docker exec fgts-lunasdigital cat /app/fgts/config.json > config-backup.json
```

### Restore
```bash
# Restore de volumes
docker run --rm -v fgts-cache:/data -v $(pwd):/backup alpine tar xzf /backup/fgts-cache-backup.tar.gz -C /data

# Restore de configurações
docker cp config-backup.json fgts-lunasdigital:/app/fgts/config.json
docker-compose restart
```

## Desenvolvimento

### Modo Debug
```bash
# Executar com logs detalhados
docker-compose up

# Acessar container para debug
docker exec -it fgts-lunasdigital sh
```

### Testes Locais
```bash
# Executar suite de testes
npm test

# Teste manual de endpoints
curl http://localhost:3005/fgts/status
```

## Segurança

- Container roda como usuário `node` (não root)
- Network isolada (`fgts-network`)
- Volumes com permissões restritas
- Logs de erro para auditoria
- Health check para monitoramento

## Performance

- **Alpine Linux**: Imagem leve (~50MB)
- **Node.js 18**: Performance otimizada
- **Cache persistente**: Evita reprocessamento
- **Queue system**: Processamento controlado
- **Health check**: Recuperação automática
