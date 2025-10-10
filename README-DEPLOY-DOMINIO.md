# 🚀 Deploy VPS com Domínio - Lunas Digital

## 📋 **Configuração Completa do Simulador INSS**

### 🎯 **Funcionalidades Implementadas:**

1. **✅ CPF Cache + Kentro Integration**
   - Cache local no `localStorage`
   - Salvamento automático na base de dados (porta 3003)
   - Integração com Kentro para buscar/criar oportunidades

2. **✅ Upload de PDF**
   - Frontend: `uploadExtrato()` com FormData
   - Backend: `/api/processar-extrato` no servidor INSS
   - Multer configurado para receber PDFs

3. **✅ OpenAI + Kentro Keys**
   - Chaves configuradas no `.env`
   - Verificação automática de configurações
   - Integração com extração de PDF

4. **✅ Configuração de Domínio**
   - Nginx configurado para `lunasdigital.com.br`
   - Roteamento correto para todas as APIs
   - Docker containers otimizados

### 🌐 **URLs de Produção:**

- **Site Principal**: https://lunasdigital.com.br
- **CRM**: https://lunasdigital.com.br/operacional/
- **Simulador INSS**: https://lunasdigital.com.br/inss/simulador.html
- **API Base de Dados**: https://lunasdigital.com.br/db/

### 🔧 **Arquitetura Multi-Container:**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx:80      │    │ Servidor:3000   │    │     CRM:3001    │
│  (Load Balancer)│    │  (Principal)    │    │  (Operacional)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────┐    ┌─────────────────┐
         │  INSS API:3002  │    │ Base Dados:3003 │
         │  (Simulador)    │    │ (Clientes/Props)│
         └─────────────────┘    └─────────────────┘
```

### 📁 **Arquivos de Deploy:**

- `deploy-vps-dominio.sh` - Script Linux/Mac
- `deploy-vps-dominio.ps1` - Script PowerShell Windows
- `Dockerfile.inss` - Container específico do INSS
- `nginx/nginx.conf` - Configuração do Nginx
- `config-vps-restructured.env` - Variáveis de ambiente

### 🚀 **Como Fazer Deploy:**

#### **1. Preparar Ambiente:**
```bash
# Linux/Mac
chmod +x deploy-vps-dominio.sh
./deploy-vps-dominio.sh

# Windows
.\deploy-vps-dominio.ps1
```

#### **2. Configurar Chaves:**
Edite o arquivo `.env` com suas chaves reais:
```env
OPENAI_API_KEY=sk-sua_chave_openai_aqui
LUNAS_API_KEY=sua_chave_lunas_aqui
LUNAS_API_URL=https://api.lunasdigital.com.br
```

#### **3. Verificar Deploy:**
```bash
# Status dos containers
docker-compose ps

# Logs em tempo real
docker-compose logs -f

# Testar endpoints
curl https://lunasdigital.com.br/health
curl https://lunasdigital.com.br/inss/simulador.html
```

### 🔍 **APIs Disponíveis:**

#### **Simulador INSS:**
- `POST /api/processar-extrato` - Upload de PDF
- `POST /api/kentro/buscar-cliente` - Buscar na Kentro
- `POST /api/kentro/criar-oportunidade` - Criar oportunidade
- `GET /inss/simulador.html` - Interface do simulador

#### **Base de Dados:**
- `GET /db/api/clientes` - Listar clientes
- `POST /db/api/clientes` - Criar cliente
- `GET /db/api/propostas` - Listar propostas
- `POST /db/api/propostas` - Criar proposta

### 📊 **Monitoramento:**

```bash
# Status dos containers
docker-compose ps

# Logs específicos
docker-compose logs -f api-simulador
docker-compose logs -f base-dados

# Uso de recursos
docker stats

# Reiniciar serviço específico
docker-compose restart api-simulador
```

### 🛠️ **Troubleshooting:**

#### **Problema: Simulador não carrega**
```bash
# Verificar logs do container
docker-compose logs api-simulador

# Verificar se a porta está aberta
netstat -tlnp | grep :3002
```

#### **Problema: Upload de PDF falha**
```bash
# Verificar tamanho do arquivo (máx 10MB)
# Verificar logs do nginx
docker-compose logs nginx

# Verificar permissões
ls -la var/data/extratos/
```

#### **Problema: Kentro não conecta**
```bash
# Verificar chaves no .env
grep LUNAS_API .env

# Testar conectividade
curl -X POST https://lunasdigital.com.br/api/kentro/buscar-cliente \
  -H "Content-Type: application/json" \
  -d '{"cpf":"12345678901"}'
```

### 🔐 **Segurança:**

- **Rate Limiting**: Configurado no Nginx
- **CORS**: Configurado para domínios específicos
- **Upload Limits**: Máximo 10MB por arquivo
- **SSL**: Configurado para HTTPS (certificado necessário)

### 📈 **Performance:**

- **Cache**: CPF em localStorage
- **Load Balancing**: Nginx distribui requisições
- **Keep-Alive**: Conexões persistentes
- **Gzip**: Compressão habilitada

### 🎯 **Próximos Passos:**

1. **Configurar SSL** com certificado válido
2. **Implementar backup** automático dos dados
3. **Configurar monitoramento** com alertas
4. **Otimizar performance** com CDN
5. **Implementar logs** centralizados

---

**✅ Simulador INSS totalmente configurado e pronto para produção!**

