# 📊 README - Sistema CRM Lunas Digital

## 🏗️ **Arquitetura do Sistema**

### **Containers Ativos**
```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA LUNAS DIGITAL                        │
├─────────────────────────────────────────────────────────────────┤
│  🌐 nginx-lunasdigital (Porta 80/443)                          │
│     ├── lunasdigital.com.br → servidor-principal:3000          │
│     ├── inss.lunasdigital.com.br → api-simulador:3002          │
│     └── crm.lunasdigital.com.br → crm-lunasdigital:3001        │
├─────────────────────────────────────────────────────────────────┤
│  🖥️ servidor-principal (Porta 3000)                            │
│     └── Sistema principal Lunas Digital                       │
├─────────────────────────────────────────────────────────────────┤
│  🧮 api-simulador-lunasdigital (Porta 3002)                    │
│     └── Simulador INSS + APIs relacionadas                     │
├─────────────────────────────────────────────────────────────────┤
│  📊 crm-lunasdigital (Porta 3001)                              │
│     └── Sistema CRM + Interface Operacional                    │
├─────────────────────────────────────────────────────────────────┤
│  🗄️ base-dados-lunasdigital (Porta 3003)                      │
│     └── API de dados (clientes/propostas)                      │
├─────────────────────────────────────────────────────────────────┤
│  🐳 portainer-lunasdigital (Porta 9000)                        │
│     └── Interface de gerenciamento Docker                     │
└─────────────────────────────────────────────────────────────────┘
```

## 🔗 **URLs de Acesso**

### **Sistema Principal**
- **URL**: `https://lunasdigital.com.br`
- **Container**: `servidor-principal:3000`
- **Função**: Sistema principal Lunas Digital

### **Simulador INSS**
- **URL**: `https://inss.lunasdigital.com.br`
- **Container**: `api-simulador-lunasdigital:3002`
- **Função**: Simulador INSS + APIs de extração e cálculo

### **CRM Operacional**
- **URL**: `http://72.60.159.149:3001`
- **Container**: `crm-lunasdigital:3001`
- **Função**: Sistema CRM + Interface operacional

### **Base de Dados**
- **URL**: `http://72.60.159.149:3003`
- **Container**: `base-dados-lunasdigital:3003`
- **Função**: API de persistência de dados

### **Portainer**
- **URL**: `http://72.60.159.149:9000`
- **Container**: `portainer-lunasdigital:9000`
- **Função**: Gerenciamento Docker

## 📁 **Estrutura de Dados**

### **Volume Compartilhado**
```
/root/api-lunas/var/data/
├── clientes/           # Arquivos JSON dos clientes
│   ├── 1.json         # Cliente ID 1
│   ├── 2.json         # Cliente ID 2
│   └── ...
├── propostas/          # Arquivos JSON das propostas
│   ├── 1.json         # Proposta ID 1
│   ├── proposta_*.json # Propostas com timestamp
│   └── ...
├── extratos/           # PDFs e JSONs dos extratos INSS
│   ├── extrato_*.pdf   # PDFs baixados da Kentro
│   ├── extrato_*.json  # Dados extraídos pelo ChatGPT
│   └── ...
├── uploads/            # Arquivos enviados
└── backup/             # Backups do sistema
```

### **Estrutura do Cliente**
```json
{
  "id": "1",
  "nome": "NELSON JOSE CAVASSONI DE OLIVEIRA",
  "cpf": "37407287287",
  "nb": "7013370321",
  "telefone": "",
  "email": "",
  "nascimento": "",
  "nomeMae": "",
  "endereco": {
    "cep": "",
    "logradouro": "",
    "numero": "",
    "complemento": "",
    "bairro": "",
    "cidade": "",
    "uf": ""
  },
  "beneficio": {
    "numero": "7013370321",
    "especie": "88",
    "nomeBeneficio": "BENEFICIO DE PRESTACAO CONTINUADA A PESSOA IDOSA",
    "valor": "",
    "banco_pagamento": "756",
    "agencia": "6044",
    "conta": "0011401273",
    "origem": "INSS",
    "dataExtrato": "16/09/2025"
  },
  "contratos": [
    {
      "contrato": "1100123506",
      "banco": {
        "codigo": "643",
        "nome": "Banco Pine"
      },
      "situacao": "ATIVO",
      "data_inclusao": "09/05/2022",
      "competencia_inicio_desconto": "06/2022",
      "qtde_parcelas": 84,
      "valor_parcela": 355.35,
      "valor_liberado": "19.806,25",
      "iof": "104,79",
      "cet_mensal": "0,00",
      "cet_anual": "0,00",
      "taxa_juros_mensal": "1,56",
      "taxa_juros_anual": "20,36",
      "valor_pago": "0,00",
      "primeiro_desconto": null,
      "status_taxa": "RECALCULADA",
      "prazo_total": 84,
      "parcelas_pagas": 39,
      "prazo_restante": 45,
      "aprovado": true,
      "id": 2,
      "selecionado": true,
      "simulacao": {
        "aprovado": true,
        "banco": "BRB",
        "troco": 1824.73,
        "taxa": 1.85,
        "parcela": 355.35,
        "parcelasPagas": 39,
        "valorEmprestimo": 15467.48,
        "coeficiente": 0.022974
      },
      "troco": 1824.73,
      "editando": false,
      "__parcela_original__": 424.2,
      "valor_parcela_original": 424.2,
      "saldo_devedor": 13642.756293241075,
      "especie": "88"
    }
  ],
  "contratosRMC": [],
  "contratosRCC": [],
  "margens": {
    "disponivel": "7,05",
    "extrapolada": "68,85",
    "rmc": "0,00",
    "rcc": "0,00"
  },
  "kentroId": null
}
```

### **Estrutura da Proposta**
```json
{
  "clientId": "16",
  "cpf": "12345678901",
  "status": "TESTE_SEQUENCIAL_3",
  "origem": "TESTE_SIMULADOR",
  "id": "1",
  "createdAt": "2025-10-08T23:19:06.250Z",
  "updatedAt": "2025-10-08T23:19:06.250Z"
}
```

## 🔧 **APIs Disponíveis**

### **CRM Service (Porta 3001)**

#### **Clientes**
- `GET /api/clientes` - Listar todos os clientes
- `GET /api/clientes/:id` - Buscar cliente por ID
- `POST /api/clientes` - Criar/atualizar cliente

#### **Propostas**
- `GET /api/propostas` - Listar todas as propostas
- `GET /api/propostas/:id` - Buscar proposta por ID
- `POST /api/propostas` - Criar/atualizar proposta
- `PUT /api/propostas/:id/status` - Atualizar status da proposta

#### **Dashboard**
- `GET /api/dashboard/stats` - Estatísticas do dashboard

#### **Webhooks**
- `POST /webhook/simulador` - Receber dados do simulador INSS

#### **Páginas**
- `GET /` - Dashboard principal
- `GET /clientes` - Página de clientes
- `GET /propostas` - Página de propostas
- `GET /cliente/:id` - Detalhes do cliente
- `GET /proposta/:id` - Detalhes da proposta

### **Database Service (Porta 3003)**

#### **Clientes**
- `GET /api/clientes` - Listar todos os clientes
- `POST /api/clientes` - Salvar cliente

#### **Propostas**
- `GET /api/propostas` - Listar todas as propostas
- `POST /api/propostas` - Salvar proposta

## 🌐 **Rede Docker**

### **Rede Principal**
- **Nome**: `api-lunas_lunas-network`
- **Tipo**: Bridge
- **Containers Conectados**:
  - `servidor-principal` (172.18.0.6)
  - `nginx-lunasdigital` (172.18.0.5)
  - `api-simulador-lunasdigital` (172.18.0.4)
  - `crm-lunasdigital` (172.18.0.3)
  - `base-dados-lunasdigital` (172.18.0.2)

### **Comunicação Interna**
```
CRM (3001) ←→ Base de Dados (3003)
Simulador (3002) ←→ Base de Dados (3003)
Nginx (80/443) ←→ Todos os serviços
```

## 📋 **Páginas do CRM**

### **Dashboard Principal**
- **URL**: `http://72.60.159.149:3001/`
- **Arquivo**: `/root/api-lunas/operacional/index.html`
- **Função**: Visão geral do sistema

### **Buscar Cliente**
- **URL**: `http://72.60.159.149:3001/operacional/buscar-cliente.html`
- **Arquivo**: `/root/api-lunas/operacional/buscar-cliente.html`
- **Função**: Busca e gerenciamento de clientes

### **Clientes**
- **URL**: `http://72.60.159.149:3001/clientes`
- **Arquivo**: `/root/api-lunas/operacional/clientes.html`
- **Função**: Listagem de clientes

### **Propostas**
- **URL**: `http://72.60.159.149:3001/propostas`
- **Arquivo**: `/root/api-lunas/operacional/propostas.html`
- **Função**: Listagem de propostas

### **Buscar Propostas**
- **URL**: `http://72.60.159.149:3001/operacional/buscar-propostas.html`
- **Arquivo**: `/root/api-lunas/operacional/buscar-propostas.html`
- **Função**: Busca de propostas

### **Interface de Digitação**
- **URL**: `http://72.60.159.149:3001/operacional/digitation-interface.html`
- **Arquivo**: `/root/api-lunas/operacional/digitation-interface.html`
- **Função**: Interface para digitação de dados

### **Configurações**
- **URL**: `http://72.60.159.149:3001/operacional/configuracoes-status.html`
- **Arquivo**: `/root/api-lunas/operacional/configuracoes-status.html`
- **Função**: Configurações do sistema

### **Teste Kentro**
- **URL**: `http://72.60.159.149:3001/operacional/kentro-test.html`
- **Arquivo**: `/root/api-lunas/operacional/kentro-test.html`
- **Função**: Testes de integração com Kentro

## 🔄 **Fluxo de Dados**

### **1. Criação de Cliente**
```
Simulador INSS → Webhook → CRM Service → Database Service → Arquivo JSON
```

### **2. Criação de Proposta**
```
Simulador INSS → Webhook → CRM Service → Database Service → Arquivo JSON
```

### **3. Busca de Clientes**
```
Interface CRM → CRM Service → Database Service → Arquivos JSON → Resposta
```

### **4. Atualização de Status**
```
Interface CRM → CRM Service → Database Service → Arquivo JSON Atualizado
```

## 🛠️ **Comandos de Gerenciamento**

### **Verificar Status dos Containers**
```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
```

### **Ver Logs do CRM**
```bash
docker logs crm-lunasdigital --tail 20
```

### **Ver Logs da Base de Dados**
```bash
docker logs base-dados-lunasdigital --tail 20
```

### **Reiniciar CRM**
```bash
docker restart crm-lunasdigital
```

### **Reiniciar Base de Dados**
```bash
docker restart base-dados-lunasdigital
```

### **Verificar Rede**
```bash
docker network inspect api-lunas_lunas-network
```

### **Testar API de Clientes**
```bash
curl -s http://localhost:3001/api/clientes | jq '.clientes | length'
```

### **Testar API de Propostas**
```bash
curl -s http://localhost:3001/api/propostas | jq '.propostas | length'
```

## 🚨 **Problemas Conhecidos**

### **1. Exclusão de Clientes**
- **Problema**: Função `excluirCliente` não funciona corretamente
- **Causa**: ClientManager local não sincronizado com dados da API
- **Solução**: Implementar endpoint DELETE na API ou usar fallback local

### **2. Sincronização de Dados**
- **Problema**: Dados podem ficar desatualizados entre localStorage e API
- **Causa**: Múltiplas fontes de dados (API + localStorage)
- **Solução**: Centralizar em uma única fonte de dados

### **3. IDs Duplicados**
- **Problema**: Clientes podem ter IDs duplicados
- **Causa**: Geração de IDs não sequencial
- **Solução**: Implementar validação de unicidade

## 📈 **Estatísticas Atuais**

### **Clientes Cadastrados**
- **Total**: ~25 clientes
- **Com Propostas**: ~15 clientes
- **Sem Propostas**: ~10 clientes

### **Propostas Cadastradas**
- **Total**: ~30 propostas
- **Status Ativo**: ~20 propostas
- **Status Finalizado**: ~10 propostas

### **Extratos Processados**
- **Total**: ~50 extratos
- **PDFs Baixados**: ~50 arquivos
- **JSONs Gerados**: ~50 arquivos

## 🔮 **Próximos Passos**

### **1. Implementar Endpoint DELETE**
- Adicionar `DELETE /api/clientes/:id` na API
- Adicionar `DELETE /api/propostas/:id` na API

### **2. Sincronização de Dados**
- Implementar cache inteligente
- Sincronizar localStorage com API

### **3. Validação de Dados**
- Implementar validação de CPF único
- Implementar validação de NB único

### **4. Interface de Relatórios**
- Dashboard com gráficos
- Relatórios de performance
- Exportação de dados

### **5. Integração Completa**
- Webhooks bidirecionais
- Sincronização em tempo real
- Notificações automáticas

---

## 📞 **Suporte**

Para problemas ou dúvidas sobre o sistema CRM:
1. Verificar logs dos containers
2. Testar APIs diretamente
3. Verificar sincronização de dados
4. Consultar este README

**Sistema CRM Lunas Digital - Versão 1.0** 🚀
