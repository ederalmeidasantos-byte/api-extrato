# 🚀 Guia para Criar Repositórios no GitHub

## 📋 Repositórios a Criar

### **1. Sistema CRM Lunas Digital**
- **Nome**: `crm-lunasdigital`
- **Descrição**: Sistema CRM completo para gestão de clientes, propostas e integração WhatsApp
- **URL**: `https://github.com/lunasdigital/crm-lunasdigital`

### **2. Sistema INSS Simulador**
- **Nome**: `inss-simulador`
- **Descrição**: Simulador de empréstimos consignados do INSS com extração de PDFs e cálculos financeiros
- **URL**: `https://github.com/lunasdigital/inss-simulador`

## 🔧 Passos para Criar no GitHub

### **1. Criar Repositório CRM**

#### **Via Interface Web**
1. **Acessar**: https://github.com/new
2. **Preencher**:
   ```
   Repository name: crm-lunasdigital
   Description: Sistema CRM completo para gestão de clientes, propostas e integração WhatsApp
   Visibility: Public (ou Private)
   Initialize: ❌ (não marcar - já temos arquivos)
   ```
3. **Clicar**: "Create repository"

#### **Via GitHub CLI**
```bash
# Instalar GitHub CLI (se não tiver)
# https://cli.github.com/

# Fazer login
gh auth login

# Criar repositório
gh repo create lunasdigital/crm-lunasdigital --public --description "Sistema CRM completo para gestão de clientes, propostas e integração WhatsApp"
```

### **2. Criar Repositório INSS**

#### **Via Interface Web**
1. **Acessar**: https://github.com/new
2. **Preencher**:
   ```
   Repository name: inss-simulador
   Description: Simulador de empréstimos consignados do INSS com extração de PDFs e cálculos financeiros
   Visibility: Public (ou Private)
   Initialize: ❌ (não marcar - já temos arquivos)
   ```
3. **Clicar**: "Create repository"

#### **Via GitHub CLI**
```bash
gh repo create lunasdigital/inss-simulador --public --description "Simulador de empréstimos consignados do INSS com extração de PDFs e cálculos financeiros"
```

## 📤 Upload dos Códigos

### **1. Upload CRM**

```bash
# Navegar para a pasta CRM
cd CRM-INTEGRACAO

# Adicionar remote do GitHub
git remote add origin https://github.com/lunasdigital/crm-lunasdigital.git

# Fazer push
git branch -M main
git push -u origin main
```

### **2. Upload INSS**

```bash
# Navegar para a pasta INSS
cd INSS-INTEGRACAO

# Adicionar remote do GitHub
git remote add origin https://github.com/lunasdigital/inss-simulador.git

# Fazer push
git branch -M main
git push -u origin main
```

## 🏷️ Configurações dos Repositórios

### **1. Topics/Tags**
Adicionar os seguintes topics em ambos os repositórios:
```
crm
inss
nodejs
express
docker
nginx
whatsapp
kentro
lunas-digital
simulador
emprestimo-consignado
```

### **2. README.md**
- ✅ **CRM**: Já incluído com documentação completa
- ✅ **INSS**: Já incluído com documentação completa

### **3. Licença**
Adicionar licença MIT em ambos os repositórios:
```bash
# CRM
cd CRM-INTEGRACAO
echo "MIT" > LICENSE
git add LICENSE
git commit -m "Add MIT license"
git push

# INSS
cd INSS-INTEGRACAO
echo "MIT" > LICENSE
git add LICENSE
git commit -m "Add MIT license"
git push
```

### **4. Issues e Projects**
- ✅ **Issues**: Habilitar para reportar bugs
- ✅ **Projects**: Criar boards para organização
- ✅ **Wiki**: Habilitar para documentação adicional

## 🔗 Links dos Repositórios

### **CRM Lunas Digital**
- **Repositório**: https://github.com/lunasdigital/crm-lunasdigital
- **Issues**: https://github.com/lunasdigital/crm-lunasdigital/issues
- **Wiki**: https://github.com/lunasdigital/crm-lunasdigital/wiki

### **INSS Simulador**
- **Repositório**: https://github.com/lunasdigital/inss-simulador
- **Issues**: https://github.com/lunasdigital/inss-simulador/issues
- **Wiki**: https://github.com/lunasdigital/inss-simulador/wiki

## 📊 Estrutura dos Repositórios

### **CRM-INTEGRACAO**
```
crm-lunasdigital/
├── README.md
├── LICENSE
├── .gitignore
├── package.json
├── docker-compose.yml
├── Dockerfile.crm
├── deploy.sh
├── server-crm.js
├── index.html
├── crm-cliente.html
├── configuracoes-status-whatsapp-corrigido.html
├── digitation-interface.html
├── digitar-proposta.html
├── teste-kentro-apis.html
├── client-manager.js
├── kentro-api.js
├── assets/
│   ├── crm-layout.css
│   └── crm-layout.js
├── nginx-crm.conf
├── nginx-unificado.conf
├── env-example.txt
├── DEPLOY-RAPIDO.md
└── GUIA-DOMINIOS-DNS.md
```

### **INSS-INTEGRACAO**
```
inss-simulador/
├── README.md
├── LICENSE
├── .gitignore
├── package.json
├── docker-compose.yml
├── Dockerfile.inss
├── deploy.sh
├── server-inss.js
├── simulador.html
├── simulador-logic.js
├── calculo.js
├── extrair_pdf.js
├── coeficientes_96.json
├── roteiro-bancos-simulador.js
├── ecosystem.config.js
├── nginx-inss.conf
├── nginx-unificado.conf
├── env-example.txt
├── DEPLOY-RAPIDO.md
└── GUIA-DOMINIOS-DNS.md
```

## 🚀 Comandos de Deploy

### **Clone e Deploy CRM**
```bash
# Clone
git clone https://github.com/lunasdigital/crm-lunasdigital.git
cd crm-lunasdigital

# Configurar
cp env-example.txt .env
# Editar .env com suas configurações

# Deploy
./deploy.sh
```

### **Clone e Deploy INSS**
```bash
# Clone
git clone https://github.com/lunasdigital/inss-simulador.git
cd inss-simulador

# Configurar
cp env-example.txt .env
# Editar .env com suas configurações

# Deploy
./deploy.sh
```

## 📋 Checklist de Criação

### **Repositório CRM**
- [ ] Criar repositório no GitHub
- [ ] Adicionar remote origin
- [ ] Fazer push do código
- [ ] Adicionar topics/tags
- [ ] Adicionar licença MIT
- [ ] Configurar Issues e Projects
- [ ] Testar clone e deploy

### **Repositório INSS**
- [ ] Criar repositório no GitHub
- [ ] Adicionar remote origin
- [ ] Fazer push do código
- [ ] Adicionar topics/tags
- [ ] Adicionar licença MIT
- [ ] Configurar Issues e Projects
- [ ] Testar clone e deploy

## 🔄 Workflow de Desenvolvimento

### **Para Contribuições**
```bash
# Fork do repositório
# Clone do fork
git clone https://github.com/seu-usuario/crm-lunasdigital.git

# Criar branch para feature
git checkout -b feature/nova-funcionalidade

# Fazer alterações
# Commit
git add .
git commit -m "Add: nova funcionalidade"

# Push
git push origin feature/nova-funcionalidade

# Criar Pull Request
```

### **Para Atualizações**
```bash
# Pull das mudanças
git pull origin main

# Deploy
./deploy.sh
```

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2025  
**Status**: Pronto para GitHub ✅


