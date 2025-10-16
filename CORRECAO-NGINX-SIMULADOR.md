# Correção do Nginx para Simulador INSS

## Problema Identificado
O simulador INSS não estava funcionando devido a uma configuração incorreta do nginx que estava tentando redirecionar para HTTPS sem certificados SSL configurados.

## Correções Aplicadas

### 1. Arquivo: `nginx/nginx.conf`
**Problema:** O servidor INSS estava configurado para redirecionar HTTP para HTTPS, mas os certificados SSL não estavam configurados.

**Solução:** Removido o redirecionamento HTTPS e configurado o servidor para aceitar conexões HTTP diretamente.

**Alteração:**
```nginx
# ANTES (com redirecionamento HTTPS)
server {
    listen 80;
    server_name inss.lunasdigital.com.br;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name inss.lunasdigital.com.br;
    # ... configurações SSL
}

# DEPOIS (apenas HTTP)
server {
    listen 80;
    server_name inss.lunasdigital.com.br;
    # ... configurações do proxy
}
```

### 2. Configuração do Docker
A configuração do `docker-compose.yml` está correta:
- Container `api-simulador` na porta 3002
- Container `nginx` configurado para fazer proxy para `api-simulador:3002`
- Upstream `api_simulador` apontando para `api-simulador:3002`

## Instruções para Aplicar no Servidor

### 1. Conectar ao Servidor
```bash
ssh root@seu-servidor
cd /caminho/para/api-lunas
```

### 2. Parar os Containers
```bash
docker-compose down
```

### 3. Aplicar as Correções
O arquivo `nginx/nginx.conf` já foi corrigido localmente. Se necessário, copie o conteúdo do arquivo corrigido para o servidor.

### 4. Reconstruir e Iniciar
```bash
# Reconstruir apenas o nginx
docker-compose build --no-cache nginx

# Iniciar todos os containers
docker-compose up -d
```

### 5. Verificar Status
```bash
# Verificar containers rodando
docker-compose ps

# Verificar logs do nginx
docker-compose logs nginx --tail=20

# Verificar logs do api-simulador
docker-compose logs api-simulador --tail=20
```

### 6. Testar o Simulador
```bash
# Testar localmente
curl -I http://localhost/inss/simulador.html

# Testar via domínio
curl -I http://inss.lunasdigital.com.br/inss/simulador.html
```

## URL de Teste
Após aplicar as correções, o simulador deve estar acessível em:
- **HTTP:** http://inss.lunasdigital.com.br/inss/simulador.html?extrato=7539
- **Local:** http://localhost/inss/simulador.html?extrato=7539

## Verificação de Funcionamento
1. ✅ Nginx configurado para aceitar HTTP (sem redirecionamento HTTPS)
2. ✅ Proxy configurado para `api-simulador:3002`
3. ✅ Container `api-simulador` rodando na porta 3002
4. ✅ Servidor INSS (`server-inss.js`) configurado para porta 3002
5. ✅ Rota `/inss/simulador.html` configurada no servidor INSS

## Logs para Debug
Se ainda houver problemas, verificar:
```bash
# Logs do nginx
docker-compose logs nginx

# Logs do api-simulador
docker-compose logs api-simulador

# Logs de todos os containers
docker-compose logs
```

## Próximos Passos (Opcional)
Para configurar HTTPS corretamente no futuro:
1. Configurar certificados SSL Let's Encrypt
2. Adicionar configuração HTTPS no nginx
3. Configurar redirecionamento HTTP → HTTPS




