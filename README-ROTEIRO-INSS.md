# 🏛️ Roteiro Operacional INSS - Lunas Digital

## 📋 **Visão Geral**

Sistema de consulta de procedimentos e benefícios do INSS desenvolvido seguindo o design system da Lunas Digital. A página oferece uma interface moderna e intuitiva para consultar informações sobre procedimentos do INSS, incluindo códigos, prazos, documentos necessários e descrições detalhadas.

## 🎨 **Design System**

A página segue rigorosamente o **Design System Lunas Digital** com:

- **Cores da Marca**: Gradientes teal/cyan e purple/indigo
- **Tipografia**: Inter font family
- **Componentes**: Cards, botões, inputs e sidebar seguindo padrões estabelecidos
- **Layout**: Grid responsivo e sistema de espaçamentos consistente
- **Interações**: Animações suaves e feedback visual

## 🚀 **Funcionalidades**

### **Busca e Filtros**
- ✅ **Busca por código**: Digite "001" para encontrar "Aposentadoria por Idade"
- ✅ **Busca por nome**: Digite "auxilio" para encontrar auxílios
- ✅ **Busca por descrição**: Digite "incapacidade" para encontrar benefícios relacionados
- ✅ **Filtros por categoria**: Aposentadorias, Auxílios, Pensões, BPC, Rural, Revisões
- ✅ **Filtros avançados**: Por prazo e quantidade de documentos

### **Interface**
- ✅ **Cards informativos**: Exibição clara de cada procedimento
- ✅ **Estatísticas em tempo real**: Contadores de procedimentos por categoria
- ✅ **Sidebar de configurações**: Filtros avançados e exportação
- ✅ **Sistema de notificações**: Feedback visual para ações do usuário
- ✅ **Design responsivo**: Funciona perfeitamente em desktop e mobile

### **Exportação e Relatórios**
- ✅ **Exportar CSV**: Download dos procedimentos filtrados
- ✅ **Estatísticas detalhadas**: Análise por prazo e documentos
- ✅ **Relatórios personalizados**: Filtros customizáveis

## 📁 **Estrutura de Arquivos**

```
roteiro-inss.html          # Página principal
roteiro-inss.js           # Módulo com dados e funções
menu.js                   # Sistema de menu lateral (reutilizado)
README-ROTEIRO-INSS.md    # Esta documentação
```

## 🔧 **Tecnologias Utilizadas**

- **HTML5**: Estrutura semântica
- **CSS3**: Design system e animações
- **JavaScript ES6+**: Funcionalidades interativas
- **Modules**: Import/export para organização do código
- **Design System Lunas Digital**: Padrões visuais e componentes

## 📊 **Dados dos Procedimentos**

O sistema inclui **20 procedimentos INSS** organizados por categorias:

### **Aposentadorias (8)**
- Aposentadoria por Idade
- Aposentadoria por Tempo de Contribuição
- Aposentadoria Especial
- Aposentadoria por Invalidez
- Aposentadoria Rural
- Aposentadoria por Idade Rural
- Aposentadoria por Idade Urbana

### **Auxílios (6)**
- Auxílio-Doença
- Auxílio-Acidente
- Auxílio-Reclusão
- Salário-Maternidade
- Auxílio-Funeral
- Auxílio-Inclusão

### **Pensões (3)**
- Pensão por Morte
- Pensão Rural

### **BPC (3)**
- BPC - Idoso
- BPC - Deficiente

### **Outros (2)**
- Revisão de Benefício
- Restabelecimento de Benefício

## 🎯 **Como Usar**

### **1. Busca Básica**
1. Digite um termo na barra de busca
2. Pressione Enter ou clique em "🔍 Buscar"
3. Os resultados aparecerão automaticamente

### **2. Filtros por Categoria**
1. Clique nos botões de categoria (Aposentadorias, Auxílios, etc.)
2. Os resultados serão filtrados automaticamente
3. Use "Todos" para ver todos os procedimentos

### **3. Filtros Avançados**
1. Clique no botão "⚙️" no canto superior direito
2. Configure os filtros desejados:
   - Prazo mínimo/máximo
   - Quantidade mínima de documentos
3. Os resultados serão atualizados automaticamente

### **4. Exportação**
1. Abra a sidebar de configurações
2. Clique em "📄 Exportar CSV"
3. O arquivo será baixado automaticamente

## 🎨 **Personalização**

### **Cores e Gradientes**
```css
/* Gradiente principal */
background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 50%, #7c3aed 100%);

/* Cores de status */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

### **Componentes**
- **Cards**: Bordas arredondadas, sombras suaves
- **Botões**: Gradientes, hover effects, estados disabled
- **Inputs**: Focus states, validação visual
- **Sidebar**: Slide-in animation, overlay

## 📱 **Responsividade**

A página é totalmente responsiva com breakpoints:

- **Desktop**: Layout em grid com múltiplas colunas
- **Tablet**: Grid adaptativo com 2-3 colunas
- **Mobile**: Layout em coluna única, sidebar fullscreen

## 🔄 **Integração com Sistema Existente**

A página foi desenvolvida para se integrar perfeitamente com o sistema existente:

- **Menu lateral**: Reutiliza o `menu.js` existente
- **Design system**: Segue os padrões estabelecidos
- **Notificações**: Sistema de feedback visual consistente
- **Sidebar**: Padrão de configurações do sistema

## 🚀 **Próximas Funcionalidades**

- [ ] **Exportação PDF**: Geração de relatórios em PDF
- [ ] **Favoritos**: Sistema para marcar procedimentos favoritos
- [ ] **Histórico**: Rastreamento de consultas realizadas
- [ ] **Compartilhamento**: Links para procedimentos específicos
- [ ] **API Integration**: Integração com APIs do INSS

## 📞 **Suporte**

Para dúvidas ou sugestões sobre o Roteiro Operacional INSS, consulte a documentação do Design System Lunas Digital ou entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ pela equipe Lunas Digital**
