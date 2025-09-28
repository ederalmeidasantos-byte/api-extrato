# 🎯 Menu Lateral Separado - Guia de Uso

## 📋 Visão Geral

Este sistema de menu lateral foi criado para ser facilmente incluído em qualquer página do projeto, mantendo consistência visual e funcional.

## 🗂️ Arquivos do Menu

- **`menu.js`** - JavaScript do menu (lógica de funcionamento)
- **`menu-template.html`** - Template HTML do menu (estrutura e CSS)
- **`exemplo-pagina-com-menu.html`** - Exemplo de como usar o menu

## 🚀 Como Usar em Uma Nova Página

### Método 1: Incluir Diretamente (Recomendado)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sua Página</title>
    <!-- Seus estilos aqui -->
</head>
<body>
    <!-- Seu conteúdo aqui -->
    
    <!-- ===== INCLUIR O MENU AQUI ===== -->
    <!-- Zona de Hover para abrir menu -->
    <div class="hover-zone" title="Passe o mouse aqui para abrir o menu"></div>

    <!-- Barra Lateral de Navegação -->
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <h2 class="sidebar-title" id="sidebarTitle">
                <span id="sidebarIcon">🏠</span>
                <span id="sidebarText">Sua Página</span>
            </h2>
            <button class="sidebar-close" id="sidebarClose">×</button>
        </div>
        <div class="sidebar-content">
            <ul class="nav-menu">
                <li class="nav-item">
                    <a href="/teste-menu" class="nav-link">
                        🏠 <span class="nav-text">Página Inicial</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/pagina-fgts" class="nav-link">
                        📊 <span class="nav-text">Painel FGTS</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/pagina-dashboard" class="nav-link">
                        📈 <span class="nav-text">Dashboard</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/pagina-configuracoes" class="nav-link">
                        ⚙️ <span class="nav-text">Configurações</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/pagina-logs" class="nav-link">
                        📋 <span class="nav-text">Logs</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/pagina-cache" class="nav-link">
                        💾 <span class="nav-text">Cache</span>
                    </a>
                </li>
            </ul>
        </div>
    </div>

    <!-- CSS do Menu (copiar do menu-template.html) -->
    <style>
    /* CSS do menu aqui */
    </style>

    <!-- JavaScript do Menu -->
    <script src="/menu.js"></script>
</body>
</html>
```

### Método 2: Carregar Dinamicamente

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sua Página</title>
    <!-- Seus estilos aqui -->
</head>
<body>
    <!-- Seu conteúdo aqui -->
    
    <!-- Container para o menu -->
    <div id="menu-container"></div>

    <!-- Carregar o menu dinamicamente -->
    <script>
        // Carregar o menu
        fetch('/menu-template.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('menu-container').innerHTML = html;
                // Inicializar o menu
                if (window.menuLateral) {
                    window.menuLateral.inicializar();
                }
            });
    </script>
</body>
</html>
```

## 🎨 Personalização

### Alterar Cores do Menu

Edite as variáveis CSS no arquivo `menu-template.html`:

```css
/* Cores principais */
.sidebar-header {
    background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 50%, #7c3aed 100%);
}

.nav-link.active {
    background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 100%);
}
```

### Adicionar Novas Páginas

1. Adicione o item no menu:
```html
<li class="nav-item">
    <a href="/sua-nova-pagina" class="nav-link">
        🆕 <span class="nav-text">Nova Página</span>
    </a>
</li>
```

2. Crie a rota no servidor:
```javascript
app.get("/sua-nova-pagina", (req, res) => res.sendFile(path.join(__dirname, "sua-nova-pagina.html")));
```

3. Crie o arquivo HTML da página incluindo o menu.

## 🔧 Funcionalidades

- **Hover para abrir**: Passe o mouse na lateral esquerda
- **Header dinâmico**: Mostra o nome da página ativa
- **Navegação**: Links funcionais para todas as páginas
- **Responsivo**: Adapta-se a diferentes tamanhos de tela
- **Fechar menu**: Clique no X ou fora da área do menu

## 📱 URLs de Teste

- **Página Principal**: http://localhost:3001/teste-menu
- **Exemplo com Menu**: http://localhost:3001/teste-completo
- **Painel FGTS**: http://localhost:3001/pagina-fgts
- **Dashboard**: http://localhost:3001/pagina-dashboard
- **Configurações**: http://localhost:3001/pagina-configuracoes
- **Logs**: http://localhost:3001/pagina-logs
- **Cache**: http://localhost:3001/pagina-cache

## 🎯 Vantagens do Menu Separado

1. **Reutilização**: Um menu para todas as páginas
2. **Manutenção**: Alterações em um local só
3. **Consistência**: Visual e funcional uniforme
4. **Facilidade**: Fácil de incluir em novas páginas
5. **Modularidade**: Código organizado e separado

## 🚨 Importante

- Sempre inclua o CSS do menu em cada página
- O JavaScript (`menu.js`) deve ser carregado após o HTML do menu
- Mantenha os IDs dos elementos (`sidebar`, `sidebarTitle`, etc.)
- Teste em diferentes resoluções de tela

