# 🎯 Sistema de Menu Padrão Lunas Digital

## 📋 Visão Geral

O Sistema de Menu Padrão permite criar um menu único e consistente para todas as páginas do sistema operacional, similar ao Wix. Você edita apenas um arquivo e todas as páginas se atualizam automaticamente.

## 🚀 Como Funciona

### 1. **Arquivo de Configuração Único**
- **`menu-padrao.js`** - Contém toda a configuração do menu
- **`menu-padrao.css`** - Contém todos os estilos do menu
- **Edite apenas estes arquivos** para alterar o menu em todas as páginas

### 2. **Carregamento Automático**
- O menu é carregado automaticamente em todas as páginas
- Detecta a página atual e marca como ativa
- Gera breadcrumb automaticamente

### 3. **Responsivo e Moderno**
- Design responsivo para mobile e desktop
- Animações suaves
- Temas personalizáveis

## 📁 Estrutura de Arquivos

```
operacional/
├── menu-padrao.js          # Configuração do menu
├── menu-padrao.css         # Estilos do menu
├── buscar-cliente-menu.html # Exemplo de uso
└── outras-paginas.html     # Todas as páginas usam o mesmo sistema
```

## 🔧 Como Usar

### 1. **Incluir os Arquivos**

Em qualquer página HTML, adicione:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <!-- Feather Icons -->
    <script src="https://unpkg.com/feather-icons"></script>
    
    <!-- Menu Padrão CSS -->
    <link rel="stylesheet" href="/operacional/menu-padrao.css">
</head>
<body>
    <div class="main-container">
        <!-- Container do Menu -->
        <div id="menu-container"></div>
        
        <!-- Área de Conteúdo -->
        <div class="content-area">
            <!-- Breadcrumb -->
            <div id="breadcrumb-container"></div>
            
            <!-- Seu Conteúdo -->
            <div class="page-content">
                <!-- Conteúdo da página -->
            </div>
        </div>
    </div>

    <!-- Menu Padrão JS -->
    <script src="/operacional/menu-padrao.js"></script>
</body>
</html>
```

### 2. **CSS Necessário**

Adicione este CSS básico:

```css
body {
    margin: 0;
    padding: 0;
    background: #f8fafc;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.main-container {
    display: flex;
    min-height: 100vh;
}

.content-area {
    flex: 1;
    margin-left: 280px; /* Largura do menu */
    padding: 0;
    background: #f8fafc;
}

.page-content {
    padding: 2rem;
}

@media (max-width: 768px) {
    .content-area {
        margin-left: 0;
    }
}
```

## ⚙️ Configuração do Menu

### Editar `menu-padrao.js`

```javascript
const MENU_CONFIG = {
  // Logo
  logo: {
    src: '/assets/logo-lunas.png',
    alt: 'Lunas Digital',
    link: '/operacional'
  },
  
  // Itens do Menu
  items: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'home',
      link: '/operacional',
      active: false
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: 'users',
      link: '/operacional/buscar-cliente.html',
      active: false
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: 'settings',
      submenu: [
        {
          id: 'status-produtos',
          label: 'Status & Produtos',
          link: '/operacional/configuracoes-status.html'
        }
      ]
    }
  ]
};
```

### Adicionar Novo Item

```javascript
{
  id: 'novo-item',
  label: 'Novo Item',
  icon: 'star',
  link: '/operacional/novo-item.html',
  active: false
}
```

### Adicionar Submenu

```javascript
{
  id: 'menu-principal',
  label: 'Menu Principal',
  icon: 'menu',
  submenu: [
    {
      id: 'subitem1',
      label: 'Subitem 1',
      link: '/operacional/subitem1.html'
    },
    {
      id: 'subitem2',
      label: 'Subitem 2',
      link: '/operacional/subitem2.html'
    }
  ]
}
```

## 🎨 Personalização Visual

### Temas Disponíveis

```javascript
style: {
  theme: 'lunas-blue',    // Azul (padrão)
  // theme: 'lunas-green', // Verde
  // theme: 'lunas-purple' // Roxo
}
```

### Modo Compacto

```javascript
style: {
  compact: true  // Menu compacto (apenas ícones)
}
```

### Desabilitar Ícones

```javascript
style: {
  showIcons: false  // Sem ícones, apenas texto
}
```

## 📱 Responsividade

O menu é totalmente responsivo:

- **Desktop**: Menu lateral fixo (280px)
- **Mobile**: Menu em tela cheia com toggle
- **Tablet**: Adaptação automática

## 🔄 Atualizações Automáticas

### Detecção de Página Ativa

O sistema detecta automaticamente a página atual baseada na URL:

```javascript
const pageMapping = {
  '/operacional': 'dashboard',
  '/operacional/buscar-cliente.html': 'clientes',
  '/operacional/configuracoes-status.html': 'status-produtos'
};
```

### Breadcrumb Automático

O breadcrumb é gerado automaticamente baseado na estrutura do menu.

## 🛠️ Funções Disponíveis

### JavaScript Global

```javascript
// Renderizar menu manualmente
LunasMenu.render('menu-container', 'clientes');

// Atualizar página ativa
LunasMenu.updateActive('novo-item');

// Renderizar breadcrumb
LunasMenu.renderBreadcrumb('breadcrumb-container', [
  { label: 'Dashboard' },
  { label: 'Clientes' }
]);

// Acessar configuração
console.log(LunasMenu.config);
```

## 📋 Checklist de Implementação

### Para Cada Nova Página:

- [ ] Incluir `menu-padrao.css` no `<head>`
- [ ] Incluir `menu-padrao.js` antes do `</body>`
- [ ] Adicionar container `<div id="menu-container"></div>`
- [ ] Adicionar container `<div id="breadcrumb-container"></div>`
- [ ] Adicionar CSS básico do layout
- [ ] Mapear URL da página em `pageMapping` (se necessário)

### Para Alterar o Menu:

- [ ] Editar `MENU_CONFIG` em `menu-padrao.js`
- [ ] Adicionar/remover itens conforme necessário
- [ ] Testar em todas as páginas
- [ ] Verificar responsividade

## 🎯 Vantagens

### ✅ **Manutenção Centralizada**
- Edite um arquivo, todas as páginas se atualizam
- Sem duplicação de código
- Consistência visual garantida

### ✅ **Flexibilidade**
- Fácil adição de novos itens
- Suporte a submenus
- Temas personalizáveis

### ✅ **Performance**
- Carregamento otimizado
- Cache automático
- Animações suaves

### ✅ **Responsividade**
- Funciona em todos os dispositivos
- Menu adaptativo
- UX moderna

## 🚀 Exemplo Prático

Veja o arquivo `buscar-cliente-menu.html` para um exemplo completo de implementação.

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique se os arquivos estão no servidor
2. Confirme se os caminhos estão corretos
3. Verifique o console do navegador para erros
4. Teste em diferentes dispositivos

---

**🎉 Agora você tem um sistema de menu profissional e centralizado, igual ao Wix!**



