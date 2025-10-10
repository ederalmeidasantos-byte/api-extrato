# 🔧 CORREÇÃO SSL - ERR_CERT_COMMON_NAME_INVALID

## ❌ PROBLEMA IDENTIFICADO
**Erro**: `ERR_CERT_COMMON_NAME_INVALID`
**Causa**: Certificado SSL não configurado corretamente para o subdomínio

## 🚀 SOLUÇÃO AUTOMÁTICA

Criei um script específico para corrigir este problema SSL:

### 📋 **SCRIPT: corrigir-ssl.sh**
- ✅ Remove configurações SSL antigas
- ✅ Configura Nginx básico (HTTP)
- ✅ Gera certificado SSL correto
- ✅ Testa conectividade
- ✅ Configura renovação automática

## 🎯 **EXECUÇÃO NO VPS**

### **OPÇÃO 1: Upload e Execução**
```bash
# 1. Upload do script para VPS
scp corrigir-ssl.sh root@72.60.159.149:/home/

# 2. Conectar ao VPS
ssh root@72.60.159.149

# 3. Executar correção
cd /home
chmod +x corrigir-ssl.sh
./corrigir-ssl.sh
```

### **OPÇÃO 2: Execução Direta**
```bash
# Conectar ao VPS
ssh root@72.60.159.149

# Executar comandos de correção
systemctl stop nginx
rm -f /etc/nginx/sites-enabled/fgts
rm -rf /etc/letsencrypt/live/fgts.lunasdigital.com.br

# Configurar Nginx básico
cat > /etc/nginx/sites-available/fgts << 'EOF'
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
EOF

# Ativar e iniciar
ln -sf /etc/nginx/sites-available/fgts /etc/nginx/sites-enabled/
systemctl start nginx

# Gerar certificado SSL
certbot --nginx -d fgts.lunasdigital.com.br --non-interactive --agree-tos --email admin@lunasdigital.com.br --force-renewal
```

## 🔍 **VERIFICAÇÕES NECESSÁRIAS**

### 1. **DNS Propagado**
```bash
nslookup fgts.lunasdigital.com.br
# Deve retornar: 72.60.159.149
```

### 2. **Container Rodando**
```bash
docker ps | grep fgts
# Deve mostrar container ativo
```

### 3. **Porta 3005 Livre**
```bash
netstat -tuln | grep 3005
# Deve mostrar porta em uso pelo container
```

## 🧪 **TESTES APÓS CORREÇÃO**

### 1. **Teste HTTP**
```bash
curl -I http://fgts.lunasdigital.com.br
# Deve retornar: 200 OK ou redirecionamento
```

### 2. **Teste HTTPS**
```bash
curl -I https://fgts.lunasdigital.com.br
# Deve retornar: 200 OK com certificado válido
```

### 3. **Teste no Navegador**
- **HTTP**: http://fgts.lunasdigital.com.br
- **HTTPS**: https://fgts.lunasdigital.com.br

## ⚠️ **ALTERNATIVA TEMPORÁRIA**

Se o SSL não funcionar imediatamente:

1. **Use HTTP temporariamente**: http://fgts.lunasdigital.com.br
2. **Configure certificado manualmente** no painel do Hostinger
3. **Use certificado wildcard** para *.lunasdigital.com.br

## 🎯 **RESULTADO ESPERADO**

Após executar a correção:

- ✅ **HTTP**: http://fgts.lunasdigital.com.br (funcionando)
- ✅ **HTTPS**: https://fgts.lunasdigital.com.br (certificado válido)
- ✅ **SSL**: Sem erros de certificado
- ✅ **Navegador**: Acesso seguro sem avisos

---

## 🚀 **EXECUTE AGORA**

```bash
ssh root@72.60.159.149
./corrigir-ssl.sh
```

**Este script vai resolver definitivamente o erro SSL!** 🔒
