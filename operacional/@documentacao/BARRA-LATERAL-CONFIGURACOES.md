# ⚙️ Barra Lateral de Configurações - Painel FGTS

## 🎯 Visão Geral

A barra lateral de configurações oferece uma interface intuitiva para gerenciar todas as configurações do sistema FGTS, incluindo horários, credenciais e parâmetros de performance.

## 🎨 Design e Funcionalidades

### **Botão Toggle**
- **Posição**: Canto superior direito (fixo)
- **Ícone**: ⚙️ (engrenagem)
- **Comportamento**: Clique para abrir/fechar a sidebar
- **Responsivo**: Adapta-se a diferentes tamanhos de tela

### **Barra Lateral**
- **Largura**: 400px (desktop) / 100% (mobile)
- **Animação**: Desliza suavemente da direita
- **Overlay**: Sombra sutil para destaque
- **Scroll**: Conteúdo rolável quando necessário

## 📋 Seções de Configuração

### 1. **⏰ Horário Comercial**
```html
- Horário de Início: 08:00
- Horário de Fim: 22:00
- Fuso Horário: Brasília (GMT-3)
```

**Funcionalidades:**
- Campos de tempo nativos do navegador
- Validação de horários (início < fim)
- Suporte a múltiplos fusos horários
- Aplicação imediata das mudanças

### 2. **🔑 Credenciais FGTS**
```html
- Usuário 1: usuario1@email.com
- Senha 1: ••••••••
- Usuário 2: usuario2@email.com
- Senha 2: ••••••••
- [🧪 Testar] botão
```

**Funcionalidades:**
- Campos de senha mascarados
- Suporte a múltiplas credenciais
- Teste de conexão individual
- Validação de formato de email

### 3. **🔑 Credenciais V8 Sistema**
```html
- Client ID: seu_client_id
- Audience: https://bff.v8sistema.com
- Username: usuario@email.com
- Password: ••••••••
- [🧪 Testar] botão
```

**Funcionalidades:**
- Configuração OAuth2 completa
- Validação de URLs
- Teste de autenticação
- Suporte a credenciais dinâmicas

### 4. **🔑 Credenciais Lunas CRM**
```html
- API Key: ••••••••••••••••
- Queue ID: 25
- Stage ID: 4
- [🧪 Testar] botão
```

**Funcionalidades:**
- Chave API mascarada
- IDs numéricos validados
- Teste de conectividade
- Configuração de pipeline

### 5. **⚡ Performance**
```html
- Delay Base: 1000ms
- Delay Mínimo: 500ms
- Delay Máximo: 5000ms
- Taxa de Erro: 10%
```

**Funcionalidades:**
- Controle de delay dinâmico
- Validação de limites
- Ajuste automático baseado em erros
- Otimização de performance

## 🔧 Funcionalidades Técnicas

### **Backend (server.js)**
```javascript
// Endpoints implementados
GET  /fgts/config     - Carregar configurações
POST /fgts/config     - Salvar configurações
POST /fgts/test/:api  - Testar conexões
```

### **Frontend (index.html)**
```javascript
// Funções principais
toggleSidebar()       - Abrir/fechar sidebar
loadConfig()          - Carregar configurações
saveConfigToServer()  - Salvar no servidor
testConnection()      - Testar APIs
```

### **Validações**
- **Horários**: Início deve ser menor que fim
- **Delays**: Base deve estar entre mínimo e máximo
- **Credenciais**: Formato de email válido
- **URLs**: Formato de URL válido

## 🎯 Benefícios

### **Para o Usuário**
- ✅ **Interface intuitiva** e fácil de usar
- ✅ **Configuração centralizada** em um local
- ✅ **Teste de conexões** antes de salvar
- ✅ **Validação em tempo real** dos campos
- ✅ **Acesso rápido** via botão toggle

### **Para o Sistema**
- ✅ **Configuração dinâmica** sem reiniciar
- ✅ **Validação robusta** de parâmetros
- ✅ **Teste de conectividade** integrado
- ✅ **Estrutura expansível** para futuras funcionalidades
- ✅ **Segurança** com campos mascarados

## 🔐 Segurança

### **Credenciais**
- **Campos de senha** sempre mascarados
- **Valores não expostos** no frontend
- **Teste de conexão** sem expor credenciais
- **Validação** antes de salvar

### **Validação**
- **Client-side**: Validação imediata
- **Server-side**: Validação robusta
- **Sanitização**: Limpeza de inputs
- **Escape**: Prevenção de XSS

## 📱 Responsividade

### **Desktop (>1024px)**
- Sidebar: 400px de largura
- Posição: Fixa à direita
- Overlay: Sombra sutil

### **Mobile (<1024px)**
- Sidebar: 100% da largura
- Posição: Overlay completo
- Botão: Mantém posição fixa

## 🚀 Expansibilidade

### **Estrutura Preparada**
- **Seções modulares** para fácil adição
- **Sistema de validação** reutilizável
- **Endpoints padronizados** para novas APIs
- **Interface consistente** para novas funcionalidades

### **Futuras Funcionalidades**
- **Configurações de notificações**
- **Configurações de logs**
- **Configurações de backup**
- **Configurações de monitoramento**

## 🎉 Resultado Final

**A barra lateral oferece:**
- 🎨 **Design moderno** e intuitivo
- ⚙️ **Configuração completa** do sistema
- 🔒 **Segurança** nas credenciais
- 📱 **Responsividade** total
- 🚀 **Estrutura expansível** para o futuro

**Todas as configurações agora podem ser gerenciadas de forma centralizada e segura! 🎯**
