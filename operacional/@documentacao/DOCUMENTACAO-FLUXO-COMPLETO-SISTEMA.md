# 📋 Documentação Completa do Fluxo do Sistema Lunas

## 🎯 Visão Geral do Sistema

O Sistema Lunas é uma plataforma completa de gestão de clientes que integra:
- **Extração de dados de PDFs** (extratos bancários)
- **Integração com Kentro API** (CRM externo)
- **Sistema híbrido de dados** (local + externo)
- **Formulário multi-etapas** para cadastro de clientes
- **CRM interno** para visualização e gestão

---

## 🔄 Fluxo Completo do Sistema

### **1. 📄 ANEXO E PROCESSAMENTO DO EXTRATO**

#### **1.1 Upload do Extrato**
- **Local**: `INSS/simulador.html`
- **Arquivo**: `INSS/extrair-pdf.js`
- **Processo**:
  1. Usuário seleciona arquivo PDF do extrato
  2. Sistema valida formato e tamanho
  3. Upload via `FormData` para `/api/upload-extrato`
  4. Geração de ID único para o extrato

#### **1.2 Extração de Dados**
- **Endpoint**: `POST /api/upload-extrato`
- **Arquivo**: `server.js` (linha ~200)
- **Processo**:
  1. Recebe PDF via `multer`
  2. Chama `extrairDadosPDF()` do `extrair-pdf.js`
  3. Extrai dados estruturados do PDF
  4. Salva em `var/data/extratos/extrato_[timestamp].json`

#### **1.3 Dados Extraídos do PDF**
```json
{
  "cliente": {
    "nome": "ANTONIO MACHADO DINIZ",
    "cpf": "18640900906",
    "nb": "5513909797"
  },
  "beneficio": {
    "nome": "APOSENTADORIA POR INVALIDEZ PREVIDENCIARIA",
    "valor": "1200.00",
    "banco_pagamento": "341",
    "dib": "15/03/2020"
  },
  "margens": {
    "emprestimo": "1200.00",
    "rmc": "150.00",
    "rcc": "75.00"
  },
  "contratos": [...],
  "propostas": [...]
}
```

---

### **2. 🔗 INTEGRAÇÃO COM KENTRO API**

#### **2.1 Busca de Oportunidade**
- **Arquivo**: `operacional/kentro-integration.js`
- **Função**: `buscarOportunidadePorId(kentroId)`
- **Processo**:
  1. Busca dados da oportunidade no Kentro
  2. Extrai informações pessoais e de contato
  3. Mapeia campos específicos do Kentro
  4. Retorna dados estruturados

#### **2.2 Mapeamento de Campos Kentro**
```javascript
const camposKentro = {
  '9e7f92b0': 'email',           // Email
  '9e7f92b1': 'telefone',        // Telefone
  '9e7f92b2': 'dataNascimento',  // Data de Nascimento
  '9e7f92b3': 'nomeMae',         // Nome da Mãe
  '9e7f92b4': 'endereco'         // Endereço
};
```

---

### **3. 🏗️ SISTEMA HÍBRIDO DE DADOS**

#### **3.1 Estratégia de Dados**
- **Prioridade 1**: Dados locais (`var/data/clientes/:clientId.json`)
- **Prioridade 2**: Dados do Kentro (enriquecimento)
- **Prioridade 3**: Dados do extrato (atualização)

#### **3.2 Sincronização de Dados**
- **Endpoint**: `POST /api/sincronizar-cliente-real`
- **Arquivo**: `server.js` (linha ~400)
- **Função**: `mesclarDadosKentroExtrato()`

#### **3.3 Processo de Mesclagem**
```javascript
function mesclarDadosKentroExtrato(oportunidadeKentro, dadosExtrato) {
  return {
    // Dados pessoais do Kentro
    nome: oportunidadeKentro.nome,
    email: oportunidadeKentro.email,
    telefone: oportunidadeKentro.telefone,
    
    // Dados bancários do extrato
    banco: {
      codigo: dadosExtrato.beneficio.banco_pagamento,
      nome: mapearCodigoBanco(dadosExtrato.beneficio.banco_pagamento)
    },
    
    // Dados do benefício do extrato
    beneficio: dadosExtrato.beneficio,
    
    // Margens do extrato
    margens: dadosExtrato.margens,
    
    // Contratos e propostas do extrato
    contratos: dadosExtrato.contratos,
    propostas: dadosExtrato.propostas
  };
}
```

---

### **4. 📝 FORMULÁRIO MULTI-ETAPAS**

#### **4.1 Estrutura do Formulário**
- **Arquivo**: `operacional/formulario-cliente.html`
- **JavaScript**: `operacional/formulario-cliente.js`
- **Etapas**:
  1. **Dados Pessoais** (nome, CPF, email, telefone)
  2. **Endereço** (CEP, logradouro, número, bairro, cidade, UF)
  3. **Dados do Benefício** (nome, número, valor, DIB)
  4. **Dados Bancários** (banco, agência, conta)
  5. **Confirmação** (revisão final)

#### **4.2 Carregamento Híbrido de Dados**
```javascript
async function carregarDadosCliente() {
  // 1. Buscar dados locais primeiro
  const response = await fetch(`/api/cliente/${clientId}`);
  const data = await response.json();
  
  // 2. Se não encontrar, buscar no Kentro
  if (!data.dadosCliente) {
    await carregarDadosKentro();
  }
  
  // 3. Preencher formulário com dados encontrados
  preencherFormulario(data.dadosCliente);
}
```

#### **4.3 Validações Implementadas**
- **CPF**: Validação com algoritmo oficial
- **Telefone**: Formato brasileiro (DDD + número)
- **Email**: Validação de formato
- **CEP**: Validação de formato brasileiro

---

### **5. 💾 PERSISTÊNCIA DE DADOS**

#### **5.1 Estrutura de Arquivos**
```
var/data/
├── clientes/
│   └── 1.json                    # Dados do cliente
├── extratos/
│   └── extrato_1759465704363.json # Extrato processado
└── cache/
    ├── listas.json               # Cache de listas
    └── listas-resultados.json    # Cache de resultados
```

#### **5.2 Estrutura do Cliente (1.json)
```json
{
  "id": "1",
  "kentroId": "15508",
  "nome": "ANTONIO MACHADO DINIZ",
  "cpf": "18640900906",
  "email": "adiniz10@hotmail.com",
  "telefone": "(34) 99393-9465",
  "dataNascimento": "19/03/1963",
  "nomeMae": "VICENTINA DINIZ",
  "endereco": {
    "cep": "38400-000",
    "logradouro": "Rua Antônio Domingues",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "Uberlândia",
    "uf": "MG"
  },
  "beneficio": {
    "nb": "5513909797",
    "nomeBeneficio": "APOSENTADORIA POR INVALIDEZ PREVIDENCIARIA",
    "codigoBeneficio": "32",
    "valor": "1200.00",
    "dib": "15/03/2020",
    "banco_pagamento": "341",
    "bloqueio_beneficio": "NAO"
  },
  "banco": {
    "codigo": "341",
    "nome": "Itaú Unibanco S.A.",
    "agencia": "1234-5",
    "conta": "12345-6",
    "tipoConta": "Conta Corrente"
  },
  "margens": {
    "emprestimo": "1200.00",
    "rmc": "150.00",
    "rcc": "75.00",
    "extrapolada": "0.00"
  },
  "contratos": [...],
  "propostas": [...],
  "timeline": [...],
  "createdAt": "2025-01-03T14:00:00.000Z",
  "updatedAt": "2025-01-03T14:00:00.000Z"
}
```

---

### **6. 🖥️ CRM INTERNO**

#### **6.1 Estrutura do CRM**
- **Arquivo**: `operacional/crm-cliente.html`
- **JavaScript**: Inline no HTML
- **Abas**:
  1. **Dados** (informações pessoais e benefício)
  2. **Propostas** (propostas de empréstimo)
  3. **Timeline** (histórico de eventos)
  4. **Contratos** (contratos ativos)

#### **6.2 Carregamento de Dados no CRM**
```javascript
async function carregarDadosCliente() {
  // 1. Buscar dados do sistema híbrido
  const response = await fetch(`/api/cliente/${clientId}`);
  const data = await response.json();
  
  // 2. Mapear dados para o formato do CRM
  clientData = {
    id: data.dadosCliente.id,
    nome: data.dadosCliente.nome,
    cpf: data.dadosCliente.cpf,
    // ... outros campos
  };
  
  // 3. Preencher todas as seções
  preencherHeader();
  preencherDadosDetalhados();
  preencherPropostas();
  preencherContratos();
  preencherTimeline();
}
```

#### **6.3 Seções do CRM**

**6.3.1 Cabeçalho do Cliente**
- Avatar com inicial do nome
- Nome completo
- ID, CPF, telefone, email
- Data de cadastro e última atualização

**6.3.2 Dados Pessoais**
- Informações pessoais completas
- Endereço completo
- Dados do benefício (incluindo bloqueio)
- Dados bancários

**6.3.3 Margens**
- Margem disponível para empréstimo
- Margem RMC (Cartão de Crédito)
- Margem RCC (Cartão de Crédito)
- Lógica de margem extrapolada (valor negativo)

**6.3.4 Contratos (Modelo Expansível)**
```
┌─────────────────────────────────────────┐
│ Banco: Daycoval                         │
│ Contrato: 55024871199/25                │
│ Status: ATIVO                           │
│                                         │
│ R$ 74,26  ← Valor da parcela           │
│ 0/96      ← Parcelas pagas/total       │
│                                         │
│ [▼] (expandir detalhes)                │
└─────────────────────────────────────────┘
```

**6.3.5 Propostas (Modelo Expansível)**
```
┌─────────────────────────────────────────┐
│ Banco: Daycoval                         │
│ Proposta PROP_55024871199/25            │
│ Status: Aprovada                        │
│                                         │
│ R$ 3.485,39                            │
│ 96x                                     │
│                                         │
│ [▼] (expandir detalhes)                │
└─────────────────────────────────────────┘
```

---

### **7. 🔄 FLUXO DE ATUALIZAÇÃO EM TEMPO REAL**

#### **7.1 Atualização do Kentro**
- **Função**: `atualizarKentroEmTempoReal()`
- **Trigger**: Mudanças no formulário
- **Debounce**: 2 segundos para evitar muitas chamadas
- **Endpoint**: `POST /api/atualizar-kentro`

#### **7.2 Sincronização Bidirecional**
1. **Lunas → Kentro**: Atualizações do formulário
2. **Kentro → Lunas**: Verificação periódica de mudanças
3. **Extrato → Lunas**: Atualização de margens e contratos

---

### **8. 🛠️ ENDPOINTS DA API**

#### **8.1 Upload e Processamento**
- `POST /api/upload-extrato` - Upload de PDF
- `GET /api/extrato/:id` - Buscar extrato processado

#### **8.2 Gestão de Clientes**
- `GET /api/cliente/:id` - Buscar dados do cliente
- `POST /api/sincronizar-cliente-real` - Sincronizar com extrato
- `PATCH /api/atualizar-campos-cliente/:id` - Atualizar campos específicos

#### **8.3 Integração Kentro**
- `POST /api/buscar-oportunidade-kentro` - Buscar no Kentro
- `POST /api/atualizar-kentro` - Atualizar no Kentro

---

### **9. 🎨 INTERFACE E UX**

#### **9.1 Design System**
- **Cores**: Paleta consistente com simulador
- **Tipografia**: Fontes legíveis e hierarquia clara
- **Componentes**: Cards expansíveis, botões uniformes
- **Responsividade**: Adaptável a diferentes telas

#### **9.2 Funcionalidades UX**
- **Loading Screens**: Feedback visual durante carregamento
- **Validação em Tempo Real**: Feedback imediato de erros
- **Scroll Indicator**: Indicador de progresso no formulário
- **Notificações**: Alertas de sucesso, erro e aviso

---

### **10. 🔧 CONFIGURAÇÃO E DEPLOY**

#### **10.1 Dependências**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "cors": "^2.8.5"
  }
}
```

#### **10.2 Estrutura de Arquivos**
```
API Lunas/
├── server.js                          # Servidor principal
├── operacional/
│   ├── formulario-cliente.html        # Formulário multi-etapas
│   ├── formulario-cliente.js          # Lógica do formulário
│   ├── crm-cliente.html               # CRM interno
│   ├── kentro-integration.js          # Integração Kentro
│   └── assets/
│       └── crm-layout.js              # Layout do CRM
├── INSS/
│   ├── simulador.html                 # Interface principal
│   └── extrair-pdf.js                 # Extração de PDF
├── var/data/
│   ├── clientes/                      # Dados dos clientes
│   └── extratos/                      # Extratos processados
└── docs/                              # Documentação
```

---

### **11. 📊 MONITORAMENTO E LOGS**

#### **11.1 Sistema de Logs**
- **Console Logs**: Debug detalhado em desenvolvimento
- **Error Logs**: Logs de erro em `logs/api-errors.log`
- **Performance**: Monitoramento de tempo de resposta

#### **11.2 Métricas Importantes**
- Tempo de processamento de PDF
- Taxa de sucesso da integração Kentro
- Tempo de carregamento do CRM
- Validação de dados

---

### **12. 🚀 PRÓXIMOS PASSOS**

#### **12.1 Melhorias Planejadas**
- [ ] Cache inteligente para dados Kentro
- [ ] Sincronização em tempo real via WebSocket
- [ ] Relatórios avançados no CRM
- [ ] API de webhooks para integrações externas

#### **12.2 Otimizações**
- [ ] Compressão de imagens
- [ ] Lazy loading de dados
- [ ] PWA (Progressive Web App)
- [ ] Offline support

---

## 🎯 Resumo do Fluxo Completo

1. **📄 Usuário anexa extrato PDF** → Sistema extrai dados estruturados
2. **🔗 Sistema busca dados no Kentro** → Enriquece informações pessoais
3. **🏗️ Sistema mescla dados** → Cria registro híbrido local
4. **📝 Usuário preenche formulário** → Valida e atualiza dados
5. **💾 Sistema salva localmente** → Persiste em JSON
6. **🖥️ CRM exibe dados completos** → Interface expansível e responsiva
7. **🔄 Sistema sincroniza** → Mantém dados atualizados

**Status: Sistema completo e funcional! ✅**


