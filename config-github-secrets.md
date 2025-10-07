# 🔐 CONFIGURAÇÃO DOS SECRETS NO GITHUB

## 📋 **Secrets necessários no GitHub:**

Acesse: `https://github.com/SEU-USUARIO/SEU-REPOSITORIO/settings/secrets/actions`

### **1. VPS_HOST**
```
72.60.159.149
```

### **2. VPS_USER**
```
root
```

### **3. VPS_PATH**
```
/root/api-lunas
```

### **4. VPS_SSH_KEY**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAACFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAgEA4oUEp3/A/M4+PaV2kK63klV10pFYfRSPdJ0W7IjsbPfb3guwLB8p
/0sjuy0CIiLlVwmBog6Qqjf0SCjxvptpUL5dCbhprOqIdll6u+tJwiq9lRrADOk3fBZ9y
hxWCpVkpt7uusoEVa8ybHkpBN2Z1IgKR9d94U+51lCaWcQaNj4tWRDXrAjWPu6q4gs6kx
7eSVlILtKWvwtG/C8xug3VKFM+X2t83vSYI3M9NIPSpupFNrwCe48ioIN041fzcfTgELp
nYy5bsBZgS0z3x/I9JHwwcSrhMJggtUMr/MBJED7hFgHreM/l76xU58iUf6Cln4VAcA/2
pV0s6F7nlFJnRlR6hD5yNXGheRoYT8LC/ofL/idARZmWG/TY+BF7MXei/ZJ7V4BazlOU2
7GPJ2W4NIoRZX8WXTHx+EtujCEEGKEsReCQ25HojIMd4QVX6eESiQ4uHcNVMJi7lZuTmF
9Flb0GdPsB0aXzzNZZo3pFMSPCpiCKOdoiBOfgRZ1bQlPwHx2Qs8P1q2WDfXa29nQ4v1w
lmZnjEFfqBLtY78mlP/XcTFI6BtwZJ455iSXnOQcRWtCdvjU2TCnplv/YlhiVeg8KmO3V
fMsMWF7Ctzjqlh5mQ8Cw51aIHce9+tp8FbIrCOL+i4uYl0wpJDh+wkWiAujjJVo/6N8C9
iCuz+ph5UcAAABkAHN0Y2FyZEBob3RtYWlsLmNvbQ==
-----END OPENSSH PRIVATE KEY-----
```

## 🚀 **Como configurar:**

1. **Acesse o repositório no GitHub**
2. **Vá em Settings > Secrets and variables > Actions**
3. **Clique em "New repository secret"**
4. **Adicione cada secret com o nome e valor correspondente**

## ✅ **Após configurar os secrets:**

1. **Faça push deste workflow**
2. **O deploy será executado automaticamente**
3. **Monitore em Actions > Deploy VPS Hostinger**

## 🔍 **Verificação:**

- **Status**: Actions > Deploy VPS Hostinger
- **Logs**: Clique no job para ver detalhes
- **Aplicação**: https://lunasdigital.com.br/

