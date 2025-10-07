# 🐳 Portainer Setup - Visualização de Deploys

## 📋 **Visão Geral**

O Portainer oferece uma interface similar ao Render para visualizar:
- ✅ **Histórico de deploys** com timeline
- ✅ **Logs em tempo real** de cada container
- ✅ **Status de saúde** dos serviços
- ✅ **Métricas** de uso de recursos
- ✅ **Gerenciamento** de containers e imagens

## 🚀 **Instalação do Portainer**

### **1. Instalar Portainer via Docker Compose**
```bash
# Executar no VPS
docker-compose up -d portainer
```

### **2. Acessar Interface**
- **URL**: `http://seu-ip:9000`
- **Primeiro acesso**: Criar usuário admin
- **Configurar**: Conectar ao Docker local

## 📊 **Visualizar Deploys da API Lunas**

### **1. Container da API**
- **Nome**: `api-lunas`
- **Status**: Running/Stopped
- **Porta**: 3002
- **Imagem**: `api-lunas:latest`

### **2. Timeline de Deploys**
No Portainer você verá:
- ✅ **Deploy iniciado** - Container sendo criado
- ✅ **Deploy concluído** - Container rodando
- ❌ **Deploy falhou** - Container parado
- 🔄 **Deploy em andamento** - Container reiniciando

### **3. Logs Detalhados**
- **Logs de aplicação** - Console.log da API
- **Logs de sistema** - Docker/Node.js
- **Logs de erro** - Falhas e exceções
- **Logs de deploy** - Processo de build

## 🔧 **Comandos Úteis**

### **Deploy Manual**
```bash
# Rebuild e restart
docker-compose up -d --build api-lunas

# Ver logs
docker-compose logs -f api-lunas

# Status
docker-compose ps
```

### **Via Portainer**
1. **Stacks** → **api-lunas** → **Editor**
2. **Atualizar** código
3. **Deploy** → **Update the stack**
4. **Ver logs** em tempo real

## 📈 **Monitoramento**

### **Métricas Disponíveis**
- **CPU Usage** - Uso de processador
- **Memory Usage** - Uso de memória
- **Network I/O** - Tráfego de rede
- **Disk I/O** - Uso de disco

### **Alertas**
- **Container parado** - Notificação automática
- **Alto uso de CPU** - Alerta de performance
- **Falta de memória** - Alerta de recursos

## 🎯 **Vantagens do Portainer**

### **Comparado ao Render:**
- ✅ **Interface similar** - Timeline de eventos
- ✅ **Logs em tempo real** - Debug mais fácil
- ✅ **Controle total** - Gerenciamento completo
- ✅ **Gratuito** - Sem custos adicionais
- ✅ **Local** - Dados ficam no seu VPS

### **Funcionalidades Extras:**
- 🔄 **Rollback** - Voltar versão anterior
- 📊 **Métricas** - Performance detalhada
- 🔧 **Configuração** - Editar variáveis
- 📋 **Templates** - Deploy padronizado

## 🚀 **Próximos Passos**

1. **Instalar Portainer** no VPS
2. **Containerizar** a aplicação
3. **Configurar** stack no Portainer
4. **Testar** deploy e visualização
5. **Configurar** alertas e monitoramento

## 📞 **Suporte**

Se precisar de ajuda:
- **Logs**: Verificar console do Portainer
- **Deploy**: Usar script `deploy-portainer.sh`
- **Configuração**: Editar `docker-compose.yml`
