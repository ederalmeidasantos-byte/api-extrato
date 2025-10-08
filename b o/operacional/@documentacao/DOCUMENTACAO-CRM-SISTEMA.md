# 🏢 **DOCUMENTAÇÃO COMPLETA - SISTEMA CRM LUNAS DIGITAL**

## 📋 **VISÃO GERAL**

Sistema CRM completo com sidebar fixa, integração Kentro API e funcionalidades operacionais para gerenciamento de clientes e propostas.

---

## 🏗️ **ARQUITETURA DO SISTEMA**

### **📂 Estrutura de Arquivos**
```
operacional/
├── assets/
│   ├── crm-layout.css          # CSS principal do CRM
│   ├── crm-layout.js           # JavaScript do CRM
│   └── sidebar-template.js     # Template da sidebar
├── buscar-cliente.html         # Busca e listagem de clientes
├── formulario-cliente.html     # Formulário multi-etapas
├── digitation-interface.html   # Fila de digitação
├── client-manager.js           # Gerenciador de clientes
├── kentro-integration.js       # Integração Kentro API
└── README.md                   # Documentação
```

---

## 🎨 **DESIGN CRM - LAYOUT PADRÃO**

### **🏢 Estrutura Principal:**
```
┌─────────────────────────────────────────────────────────┐
│ 📋 SIDEBAR FIXA (280px)    │  📊 CONTEÚDO PRINCIPAL     │
│                            │                            │
│ 🏢 LUNAS CRM              │  Header do Cliente         │
│ ─────────────────────     │  ┌─────────────────────────┐ │
│                            │  │ Avatar + Nome + Badges  │ │
│ 👥 PRINCIPAL               │  │ Botões de Ação         │ │
│ • Clientes                 │  └─────────────────────────┘ │
│ • Fila de Digitação        │                            │
│ • Nova Proposta            │  📈 Cards de Estatísticas │
│                            │  ┌─────┬─────┬─────┬─────┐ │
│ 🧮 SIMULADOR               │  │Props│Contr│Valor│Ativ │ │
│ • Simulador INSS           │  └─────┴─────┴─────┴─────┘ │
│                            │                            │
│ ⚙️ SISTEMA                 │  📋 Tabs de Conteúdo      │
│ • Configurações            │  ┌─────────────────────────┐ │
│ • Relatórios               │  │ Dados│Props│Timeline    │ │
│ • Logs                     │  │ ─────────────────────── │ │
│                            │  │ Conteúdo da Tab Ativa  │ │
│ 🔍 BUSCA RÁPIDA            │  │                        │ │
│ [_______________] 🔍        │  │                        │ │
│                            │  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **📋 Sidebar Fixa**
```css
.sidebar {
  width: 280px;
  position: fixed;
  height: 100vh;
  background: linear-gradient(180deg, #1e293b 0%, #334155 100%);
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow-y: auto;
}
```

### **🎨 Estrutura da Sidebar**
```html
<!-- Logo -->
<div class="sidebar-header">
  <a href="/operacional/" class="logo">
    <div class="logo-icon">
      <i data-feather="hexagon"></i>
    </div>
    <span class="logo-text">Lunas Digital</span>
  </a>
</div>

<!-- Navegação Principal -->
<nav class="sidebar-nav">
  <div class="nav-section">
    <h4 class="nav-section-title">PRINCIPAL</h4>
    <a href="/operacional/" class="nav-item">
      👥 Dashboard
    </a>
    <a href="/INSS/simulador.html" class="nav-item">
      🧮 Simulador
    </a>
  </div>
  
  <div class="nav-section">
    <h4 class="nav-section-title">CLIENTES</h4>
    <a href="/operacional/buscar-cliente.html" class="nav-item">
      🔍 Buscar Cliente
    </a>
    <a href="/operacional/formulario-cliente.html" class="nav-item">
      ➕ Novo Cliente
    </a>
  </div>
  
  <div class="nav-section">
    <h4 class="nav-section-title">OPERACIONAL</h4>
    <a href="/operacional/digitation-interface.html" class="nav-item">
      📋 Fila de Digitação
    </a>
  </div>
</nav>
```

---

## 🔘 **SISTEMA DE BOTÕES CRM**

### **Estados dos Botões:**
- **🔵 Ativo:** Background azul, texto branco
- **⚪ Normal:** Background transparente, texto cinza
- **🟡 Hover:** Background cinza claro

### **Ações de Cliente:**
```html
<div class="client-actions">
  <button class="btn btn-secondary" onclick="verDetalhes(clientId)">
    <i data-feather="eye"></i>
    Ver Detalhes
  </button>
  
  <button class="btn btn-primary" onclick="editarCliente(clientId)">
    <i data-feather="edit"></i>
    Editar
  </button>
  
  <button class="btn btn-success" onclick="novaProposta(clientId)">
    <i data-feather="plus"></i>
    Nova Proposta
  </button>
</div>
```

### **🎨 Paleta de Cores CRM**

```css
:root {
  --primary-blue: linear-gradient(135deg, #3b82f6, #1d4ed8);
  --secondary-gray: #f8fafc;
  --success-green: linear-gradient(135deg, #10b981, #059669);
  --warning-yellow: linear-gradient(135deg, #f59e0b, #d97706);
  --danger-red: linear-gradient(135deg, #ef4444, #dc2626);
  
  /* Bordas e Separadores */
  --border-light: #e2e8f0;
  --border-medium: #cbd5e1;
  
  /* Textos */
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-light: #94a3b8;
}
```

---

## 📱 **RESPONSIVIDADE MOBILE**

```css
@media (max-width: 1024px) {
  .sidebar {
    width: 280px;
    transform: translateX(-100%);
  }
  
  .sidebar.mobile-open {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .client-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

## 🔄 **FLUXO DE NAVEGAÇÃO CRM**

### **1. 🏠 Página Inicial → Busca de Clientes**
```
/operacional/buscar-cliente.html
├── 🔍 Busca por CPF/NB/Nome
├── 📊 Estatísticas do sistema
└── 📋 Lista de clientes encontrados
```

### **2. 👤 Card de Cliente → Ações Disponíveis**
```
Cliente Card
├── 👁️ Ver Detalhes → /operacional/formulario-cliente.html?view=true
├── ✏️ Editar → /operacional/formulario-cliente.html?clientId=X
└── ➕ Nova Proposta → /INSS/simulador.html?clientId=X
```

### **3. 📋 Fila de Digitação → Processar Propostas**
```
Fila de Digitação
├── 📊 Estatísticas da fila
├── 🔍 Filtros de busca
├── 📋 Lista de propostas
└── 🎯 Ações de processamento
```

---

## ⚡ **AÇÕES RÁPIDAS DISPONÍVEIS**

| 🔘 Botão | 📍 Localização | 🎯 Função | 🔗 Destino |
|----------|----------------|-----------|------------|
| 👁️ Ver Detalhes | Lista de Clientes | Visualizar dados completos | `formulario-cliente.html?view=true` |
| ✏️ Editar | Lista/CRM | Editar dados do cliente | `formulario-cliente.html?clientId=X` |
| ➕ Nova Proposta | Lista/CRM | Criar nova simulação | `simulador.html?clientId=X` |
| 📋 Processar | Fila | Processar proposta | `formulario-cliente.html?edit=true` |
| 🔍 Buscar | Sidebar | Busca rápida | JavaScript |
| ⚙️ Config | Sidebar | Configurações sistema | `configuracoes.html` |

---

## 🎨 **ESTADOS VISUAIS DOS COMPONENTES**

### **Sidebar Navigation:**
```css
/* Estado Normal */
.nav-item {
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  transition: all 0.3s ease;
}

/* Estado Hover */
.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateX(4px);
}

/* Estado Ativo */
.nav-item.active {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
```

### **Cards de Cliente:**
```css
.client-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.client-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}
```

---

## 🗃️ **ESTRUTURA DE DADOS**

### **Cliente**
```javascript
{
  id: "cliente_1234567890_abc123",
  cpf: "123.456.789-01",
  nb: "1234567890",
  nome: "João Silva",
  telefone: "(11) 99999-9999",
  email: "joao@email.com",
  nascimento: "1980-01-01",
  endereco: {
    cep: "01234-567",
    logradouro: "Rua das Flores",
    numero: "123",
    bairro: "Centro",
    cidade: "São Paulo",
    uf: "SP"
  },
  propostas: [],
  createdAt: "2025-10-02T14:30:00.000Z",
  updatedAt: "2025-10-02T14:30:00.000Z"
}
```

### **Proposta**
```javascript
{
  id: "proposta_1234567890_xyz789",
  clientId: "cliente_1234567890_abc123",
  extrato: {
    id: "7025",
    margens: { disponivel_emprestimo: 1500.00 }
  },
  contratos: [
    {
      contrato: "12345678901",
      banco: "237",
      valor_parcela: 250.00,
      simulacao: { troco: 2500.00 }
    }
  ],
  status: "CLIENTE_ACEITOU",
  origem: "simulador",
  createdAt: "2025-10-02T14:30:00.000Z"
}
```

---

## 🚀 **FUNCIONALIDADES PRINCIPAIS**

### **🔍 Sistema de Busca**
- Busca por CPF, nome, telefone, email, NB
- Filtros por status de propostas
- Busca em tempo real com debounce
- Integração com LocalStorage

### **📊 Dashboard e Estatísticas**
- Total de clientes
- Clientes com propostas ativas
- Propostas em andamento
- Propostas finalizadas

### **📋 Gestão de Propostas**
- Sistema de status avançado
- Fila de digitação organizada
- Filtros e ordenação
- Ações em lote

### **🔗 Integrações**
- **Kentro API:** Sincronização de clientes
- **ViaCEP:** Preenchimento automático de endereços
- **WhatsApp API:** Comunicação com clientes

---

## 💾 **GESTÃO DE ESTADO**

### **LocalStorage**
```javascript
// Estrutura no localStorage
{
  "clientManager": {
    "clients": [[clientId, clientData]],
    "cpfIndex": [[cpf, clientId]],
    "nbIndex": [[nb, clientId]],
    "lastUpdated": "2025-10-02T14:30:00.000Z"
  }
}
```

### **ClientManager**
```javascript
class ClientManager {
  constructor() {
    this.clients = new Map();
    this.cpfIndex = new Map();
    this.nbIndex = new Map();
  }
  
  createOrUpdateClient(clientData) { /* ... */ }
  addProposalToClient(clientId, proposalData) { /* ... */ }
  getProposalsByStatus(status) { /* ... */ }
}
```

---

## 🛠️ **APIs E INTEGRAÇÕES**

### **📄 API de Extração**
```javascript
POST /extrair
{
  "fileId": "7025",
  "idoportunidade": "36400"
}

Response:
{
  "success": true,
  "data": { /* dados extraídos */ },
  "idoportunidade": "36400"
}
```

### **🔗 Integração Kentro**
```javascript
class KentroIntegration {
  async buscarPorCpf(cpf) { /* ... */ }
  async buscarPorNb(nb) { /* ... */ }
  async atualizarStatusOportunidade(id, status) { /* ... */ }
}
```

---

## 🔒 **SEGURANÇA E VALIDAÇÃO**

### **Validações de Cliente**
- CPF: Algoritmo de validação completo
- Email: Regex para formato válido
- Telefone: Formatação automática
- CEP: Integração com ViaCEP

### **Controle de Acesso**
- Validação de sessão
- Timeouts de segurança
- Logs de auditoria

---

## 📊 **MONITORAMENTO E LOGS**

### **Sistema de Logs**
```javascript
console.log('🔍 Buscando cliente:', searchParams);
console.log('✅ Cliente encontrado:', clientData);
console.log('❌ Erro ao processar:', error);
```

### **Métricas do Sistema**
- Tempo de resposta das buscas
- Taxa de conversão de propostas
- Uso de recursos do sistema

---

## 🚀 **DEPLOYMENT**

### **Requisitos**
- Node.js 18+
- Express.js
- Feather Icons (CDN)
- LocalStorage habilitado

### **Configuração**
```javascript
// server.js
app.use('/operacional', express.static('operacional'));
app.get('/operacional/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'operacional', 'index.html'));
});
```

---

## 🔧 **MANUTENÇÃO**

### **Backup de Dados**
```javascript
// Exportar dados
const backup = clientManager.exportData();
localStorage.setItem('backup', JSON.stringify(backup));

// Restaurar dados
const backup = JSON.parse(localStorage.getItem('backup'));
clientManager.importData(backup);
```

### **Limpeza Periódica**
- Cache de imagens (7 dias)
- Logs antigos (30 dias)
- Propostas expiradas (90 dias)

---

## ✅ **CHECKLIST DE FUNCIONALIDADES**

### **🏢 CRM Layout**
- ✅ Sidebar fixa com navegação
- ✅ Logo e branding Lunas
- ✅ Menu responsivo para mobile
- ✅ Estados visuais (hover, ativo)

### **👥 Gestão de Clientes**
- ✅ Busca por múltiplos critérios
- ✅ Cadastro e edição de clientes
- ✅ Validações automáticas
- ✅ Integração com Kentro

### **📋 Sistema de Propostas**
- ✅ Fila de digitação organizada
- ✅ Status avançado de propostas
- ✅ Filtros e ordenação
- ✅ Ações em lote

### **🧮 Simulador**
- ✅ Integração com dados do cliente
- ✅ Cálculos automáticos
- ✅ Envio de propostas

### **📱 Mobile**
- ✅ Layout responsivo
- ✅ Menu colapsável
- ✅ Touch-friendly
- ✅ Performance otimizada

---

## 📅 **ROADMAP FUTURO**

### **📈 Melhorias Planejadas**
- [ ] Dashboard com gráficos avançados
- [ ] Relatórios personalizáveis
- [ ] Integração com mais CRMs
- [ ] Notificações push
- [ ] API REST completa

### **🔗 Integrações Futuras**
- [ ] WhatsApp Business API
- [ ] Telegram Bot
- [ ] Email Marketing
- [ ] Assinatura Digital

---

## 📞 **SUPORTE**

### **Contatos**
- **Sistema:** Lunas Digital CRM v3.2
- **Documentação:** `/operacional/README.md`
- **Logs:** `/logs/api-errors.log`

### **Troubleshooting**
1. Verificar LocalStorage disponível
2. Confirmar APIs externas funcionando
3. Validar estrutura de dados
4. Revisar logs do console

---

*📝 Documentação atualizada em 02/10/2025 - Sistema Operacional Lunas Digital v3.2*
