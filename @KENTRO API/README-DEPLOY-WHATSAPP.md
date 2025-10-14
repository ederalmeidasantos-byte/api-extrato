# Disparador WhatsApp Kentro - Documentação de Deploy

## 📋 Resumo do Sistema Implementado

Sistema completo de disparo em massa de mensagens WhatsApp via API Kentro, com interface web para gerenciamento e monitoramento em tempo real.

### 🏗️ Arquitetura

- **Container**: Porta 3004 (novo serviço independente)
- **Backend**: Node.js + Express com endpoints REST
- **Frontend**: Interface web HTML/CSS/JS responsiva
- **Armazenamento**: Arquivos JSON para fila e histórico
- **Integração**: API Kentro para disparo de mensagens

### 📁 Arquivos Criados

```
@KENTRO API/
├── whatsapp-dispatcher-server.js    # Servidor Express principal
├── whatsapp-dispatcher.html         # Interface web completa
├── Dockerfile.whatsapp              # Container Docker
├── teste-local-disparador.sh        # Script de teste (Linux/Mac)
├── teste-local-disparador.ps1       # Script de teste (Windows)
└── data/                            # Diretório de dados (criado automaticamente)
    ├── dispatcher-queue.json        # Fila atual de disparos
    ├── dispatcher-history.json      # Histórico completo
    └── dispatcher-config.json       # Configurações
```

### 🔧 Configurações Atualizadas

#### docker-compose.yml
- Novo serviço `whatsapp-dispatcher` na porta 3004
- Volume para persistir dados em `./@KENTRO API/data`
- Integrado à rede `lunas-network`

#### config-vps-restructured.env
- `PORT_WHATSAPP_DISPATCHER=3004`
- Credenciais Kentro: `KENTRO_API_KEY`, `KENTRO_QUEUE_ID`, `KENTRO_TEMPLATE_ID`
- Configurações de rate limiting e retry

#### nginx/nginx.conf
- Upstream `whatsapp_dispatcher` para porta 3004
- Location `/whatsapp/` com proxy reverso
- Configurações específicas para SSE (Server-Sent Events)

## 🚀 Funcionalidades Implementadas

### Backend (whatsapp-dispatcher-server.js)

#### Endpoints da API
- `POST /api/disparar` - Iniciar disparo em massa
- `GET /api/status` - Status atual do sistema
- `GET /api/historico` - Histórico paginado de disparos
- `GET /api/logs` - Stream de logs em tempo real (SSE)
- `POST /api/pause` - Pausar processamento
- `POST /api/resume` - Retomar processamento
- `DELETE /api/queue` - Limpar fila

#### Sistema de Fila
- Processamento sequencial (1 disparo por vez)
- Delay configurável entre disparos (padrão 2s)
- Retry automático com backoff exponencial
- Máximo 3 tentativas por número

#### Normalização de Números
- Remove caracteres especiais: `( ) - espaços`
- Adiciona DDI 55 se ausente
- Valida formato brasileiro (55 + 11 dígitos)
- Remove duplicados automaticamente

### Frontend (whatsapp-dispatcher.html)

#### Interface Responsiva
- **Seção 1**: Formulário de configuração de disparo
- **Seção 2**: Dashboard de status em tempo real
- **Seção 3**: Logs detalhados com filtros

#### Funcionalidades da Interface
- Campo textarea para colar números (múltiplos formatos)
- Seleção de templateId e queueId
- Configuração de dados do template (JSON)
- Cards de status: Total, Sucesso, Falha, Fila
- Barra de progresso visual
- Controles: Pausar, Retomar, Limpar Fila
- Tabela de logs com filtros e atualização em tempo real
- Mascaramento de números para privacidade

## 🔧 Configuração da API Kentro

### Endpoint Utilizado
```
POST https://lunasdigital.atenderbem.com/int/sendWaTemplate
Headers: 
  - accept: application/json
  - Content-Type: application/json
Body: {
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "number": "11959088554",
  "templateId": 99,
  "data": ["nome"]
}
```

### Configurações Padrão
- **API Key**: `cd4d0509169d4e2ea9177ac66c1c9376`
- **Queue ID**: `25`
- **Template ID**: `99`
- **Delay entre disparos**: `2000ms`
- **Máximo de retries**: `3`
- **Tamanho máximo do lote**: `1000` números

## 🧪 Testes Locais

### Scripts de Teste
- **Linux/Mac**: `teste-local-disparador.sh`
- **Windows**: `teste-local-disparador.ps1`

### O que os testes verificam
1. ✅ Node.js e npm instalados
2. ✅ Arquivos necessários presentes
3. ✅ Dependências instaladas
4. ✅ Servidor inicia corretamente
5. ✅ Endpoints da API funcionando
6. ✅ Interface web carregando
7. ✅ Disparo simulado funcionando
8. ✅ Conexão SSE para logs em tempo real

### Como executar os testes
```bash
# Linux/Mac
cd "@KENTRO API"
chmod +x teste-local-disparador.sh
./teste-local-disparador.sh

# Windows PowerShell
cd "@KENTRO API"
.\teste-local-disparador.ps1
```

## 🚀 Deploy na VPS

### 1. Preparação
```bash
# No VPS, navegar para o diretório do projeto
cd /caminho/para/API\ Lunas

# Verificar se arquivos estão presentes
ls -la "@KENTRO API/"
```

### 2. Build e Deploy
```bash
# Build da nova imagem
docker-compose build whatsapp-dispatcher

# Iniciar o novo serviço
docker-compose up -d whatsapp-dispatcher

# Verificar se está rodando
docker-compose ps whatsapp-dispatcher
```

### 3. Verificação
```bash
# Verificar logs do container
docker-compose logs whatsapp-dispatcher

# Testar endpoint
curl http://localhost:3004/api/status

# Testar interface web
curl http://localhost:3004/
```

### 4. Acesso via Nginx
- **URL**: `http://lunasdigital.com.br/whatsapp/`
- **Interface**: `http://lunasdigital.com.br/whatsapp/`
- **API**: `http://lunasdigital.com.br/whatsapp/api/status`

## 📊 Monitoramento

### Logs do Container
```bash
# Logs em tempo real
docker-compose logs -f whatsapp-dispatcher

# Últimas 100 linhas
docker-compose logs --tail=100 whatsapp-dispatcher
```

### Status da API
```bash
# Status geral
curl http://localhost:3004/api/status

# Histórico
curl http://localhost:3004/api/historico?page=1&limit=10
```

### Interface Web
- Acesse `http://lunasdigital.com.br/whatsapp/`
- Dashboard mostra status em tempo real
- Logs atualizam automaticamente via SSE

## 🔒 Segurança

### Validações Implementadas
- ✅ Validação de números brasileiros
- ✅ Sanitização de entrada
- ✅ Rate limiting (máximo 1000 números por lote)
- ✅ CORS configurado apenas para domínios permitidos
- ✅ Mascaramento de números nos logs
- ✅ Timeout de 30s para requisições à API Kentro

### Configurações de Segurança
- Headers de segurança no Nginx
- Rate limiting por IP
- Validação de payload JSON
- Limite de tamanho de requisição (10MB)

## 🛠️ Manutenção

### Limpeza de Dados
```bash
# Limpar fila via API
curl -X DELETE http://localhost:3004/api/queue

# Ou via interface web (botão "Limpar Fila")
```

### Backup de Histórico
```bash
# Backup do histórico
cp "@KENTRO API/data/dispatcher-history.json" "backup-history-$(date +%Y%m%d).json"
```

### Atualização de Configurações
- Editar `config-vps-restructured.env`
- Reiniciar container: `docker-compose restart whatsapp-dispatcher`

## 📈 Métricas e Performance

### Limites Configurados
- **Rate Limit**: 10 requisições/segundo por IP
- **Batch Size**: Máximo 1000 números por disparo
- **Retry**: Máximo 3 tentativas por número
- **Delay**: 2 segundos entre disparos
- **Timeout**: 30 segundos por requisição à API Kentro

### Monitoramento Recomendado
- Verificar logs regularmente
- Monitorar uso de CPU/memória do container
- Acompanhar taxa de sucesso/falha dos disparos
- Verificar conectividade com API Kentro

## 🆘 Troubleshooting

### Problemas Comuns

#### Container não inicia
```bash
# Verificar logs
docker-compose logs whatsapp-dispatcher

# Verificar se porta 3004 está livre
netstat -tulpn | grep 3004
```

#### API Kentro não responde
```bash
# Testar conectividade
curl -X POST https://lunasdigital.atenderbem.com/int/sendWaTemplate \
  -H "Content-Type: application/json" \
  -d '{"queueId":25,"apiKey":"cd4d0509169d4e2ea9177ac66c1c9376","number":"11959088554","templateId":99,"data":["teste"]}'
```

#### Interface web não carrega
```bash
# Verificar Nginx
docker-compose logs nginx

# Testar acesso direto
curl http://localhost:3004/
```

#### Logs SSE não funcionam
- Verificar configurações do Nginx para SSE
- Confirmar que proxy_buffering está desabilitado
- Verificar timeout do proxy (24h configurado)

## ✅ Checklist de Deploy

- [ ] Arquivos criados e configurados
- [ ] docker-compose.yml atualizado
- [ ] config-vps-restructured.env configurado
- [ ] nginx.conf atualizado
- [ ] Testes locais executados com sucesso
- [ ] Build da imagem Docker concluído
- [ ] Container iniciado e rodando
- [ ] Endpoints da API respondendo
- [ ] Interface web carregando
- [ ] Nginx proxy funcionando
- [ ] Teste de disparo realizado
- [ ] Logs SSE funcionando
- [ ] Monitoramento configurado

---

**Sistema implementado com sucesso! 🎉**

O disparador WhatsApp está pronto para uso em produção na VPS.
