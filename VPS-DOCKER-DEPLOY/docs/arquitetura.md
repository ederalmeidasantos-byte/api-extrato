# 🏗️ Arquitetura Detalhada do Sistema

## 📋 Visão Geral

O sistema Lunas Digital é composto por múltiplos serviços que trabalham em conjunto para fornecer uma solução completa de CRM e simulador INSS.

## 🎯 Componentes Principais

### **1. Sistema CRM**
- **Função**: Gestão de clientes, propostas e integração WhatsApp
- **Tecnologia**: Node.js + Express
- **Porta**: 3001
- **Domínio**: crm.lunasdigital.com.br

### **2. Sistema INSS**
- **Função**: Simulador de empréstimos consignados
- **Tecnologia**: Node.js + Express
- **Porta**: 3002
- **Domínio**: inss.lunasdigital.com.br

### **3. Banco de Dados**
- **Função**: Armazenamento de dados
- **Tecnologia**: PostgreSQL 15
- **Porta**: 5432
- **Databases**: crm_db, inss_db

### **4. Cache**
- **Função**: Cache de dados e sessões
- **Tecnologia**: Redis 7
- **Porta**: 6379

### **5. Proxy Reverso**
- **Função**: Roteamento e SSL
- **Tecnologia**: Nginx
- **Portas**: 80, 443

### **6. Monitoramento**
- **Função**: Interface de gerenciamento Docker
- **Tecnologia**: Portainer
- **Porta**: 9000
- **Domínio**: portainer.lunasdigital.com.br

## 🌐 Arquitetura de Rede

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                │
└─────────────────────┬───────────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────────┐
│                    NGINX PROXY                                 │
│              (Porta 80/443)                                     │
│  • SSL Termination                                             │
│  • Load Balancing                                              │
│  • Rate Limiting                                               │
│  • Security Headers                                            │
└─────────────────────┬───────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
│     CRM      │ │   INSS    │ │  PORTAINER  │
│   (3001)     │ │  (3002)   │ │   (9000)    │
└───────┬──────┘ └─────┬─────┘ └─────────────┘
        │              │
        └──────────────┼──────────────┐
                       │              │
                ┌──────▼──────┐ ┌─────▼─────┐
                │ POSTGRESQL  │ │   REDIS   │
                │   (5432)    │ │  (6379)   │
                └─────────────┘ └───────────┘
```

## 🔄 Fluxo de Dados

### **1. Requisição HTTP**
```
Cliente → Nginx → Aplicação → Banco de Dados
```

### **2. Processamento**
```
1. Nginx recebe requisição
2. Verifica SSL/TLS
3. Aplica rate limiting
4. Roteia para aplicação apropriada
5. Aplicação processa requisição
6. Consulta cache (Redis)
7. Consulta banco de dados (PostgreSQL)
8. Retorna resposta
9. Nginx envia resposta ao cliente
```

### **3. Cache Strategy**
```
1. Verificar cache Redis
2. Se hit: retornar dados do cache
3. Se miss: consultar banco de dados
4. Armazenar no cache
5. Retornar dados
```

## 🐳 Arquitetura Docker

### **Containers**
```yaml
services:
  crm:                    # Sistema CRM
  inss:                   # Sistema INSS
  postgres:               # Banco de dados
  redis:                  # Cache
  nginx:                  # Proxy reverso
  portainer:              # Monitoramento
```

### **Volumes**
```yaml
volumes:
  postgres_data:          # Dados PostgreSQL
  redis_data:             # Dados Redis
  portainer_data:         # Dados Portainer
```

### **Networks**
```yaml
networks:
  lunasdigital-network:   # Rede interna
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## 🔒 Arquitetura de Segurança

### **1. SSL/TLS**
- Certificados Let's Encrypt
- TLS 1.2 e 1.3
- Ciphers seguros
- HSTS habilitado

### **2. Firewall**
- UFW ou firewalld
- Portas abertas: 22, 80, 443
- Portas internas: 3001, 3002, 5432, 6379, 9000

### **3. Headers de Segurança**
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- Content-Security-Policy

### **4. Rate Limiting**
- API: 10 req/s
- Login: 1 req/s
- Burst: 20 req/s

## 📊 Arquitetura de Monitoramento

### **1. Logs**
- Nginx: /var/log/nginx/
- Docker: /var/lib/docker/containers/
- Aplicação: /opt/lunasdigital/logs/

### **2. Métricas**
- CPU, Memória, Disco
- Status dos containers
- Conectividade
- SSL certificates

### **3. Alertas**
- Email: admin@lunasdigital.com.br
- Thresholds: CPU 80%, Memória 80%, Disco 80%

## 🔄 Arquitetura de Backup

### **1. Backup Automático**
- Diário às 2:00 AM
- Retenção: 30 dias
- Compressão: gzip
- Criptografia: opcional

### **2. Componentes Backup**
- Containers Docker
- Configurações Nginx
- Certificados SSL
- Bancos de dados
- Dados da aplicação
- Logs

### **3. Restore**
- Restore completo
- Restore por componente
- Verificação de integridade

## 🚀 Arquitetura de Deploy

### **1. Deploy Automático**
- GitHub Actions
- Docker Compose
- Nginx reload
- SSL renewal

### **2. Deploy Manual**
- Scripts de deploy
- Backup antes do deploy
- Rollback automático
- Verificação pós-deploy

### **3. CI/CD Pipeline**
```
Code → Build → Test → Deploy → Monitor
```

## 📈 Arquitetura de Performance

### **1. Otimizações Nginx**
- Gzip compression
- Static file caching
- Keep-alive connections
- Worker processes

### **2. Otimizações Docker**
- Multi-stage builds
- Layer caching
- Resource limits
- Health checks

### **3. Otimizações Aplicação**
- Connection pooling
- Query optimization
- Caching strategy
- Lazy loading

## 🔧 Arquitetura de Configuração

### **1. Variáveis de Ambiente**
- .env files
- Docker secrets
- ConfigMaps
- Environment-specific configs

### **2. Configuração Dinâmica**
- Hot reload
- Configuration validation
- Default values
- Override mechanism

### **3. Configuração de Segurança**
- Secret management
- Encryption at rest
- Encryption in transit
- Access control

## 📋 Resumo da Arquitetura

### **Características Principais**
- ✅ **Microserviços**: CRM e INSS separados
- ✅ **Containerização**: Docker para todos os serviços
- ✅ **Proxy Reverso**: Nginx para roteamento e SSL
- ✅ **Banco de Dados**: PostgreSQL para persistência
- ✅ **Cache**: Redis para performance
- ✅ **Monitoramento**: Portainer para gerenciamento
- ✅ **Backup**: Sistema automático de backup
- ✅ **Segurança**: SSL, firewall, headers de segurança
- ✅ **Performance**: Otimizações em todas as camadas
- ✅ **Escalabilidade**: Arquitetura preparada para crescimento

### **Benefícios**
- **Alta Disponibilidade**: Containers com restart automático
- **Segurança**: Múltiplas camadas de segurança
- **Performance**: Cache e otimizações
- **Manutenibilidade**: Código organizado e documentado
- **Escalabilidade**: Fácil adição de novos serviços
- **Monitoramento**: Visibilidade completa do sistema

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2025  
**Status**: Arquitetura de produção ✅
