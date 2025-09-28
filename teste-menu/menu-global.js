// ===== SISTEMA GLOBAL DE MENU =====
// Carrega automaticamente o menu em todas as páginas

class MenuGlobal {
    constructor() {
        this.isInitialized = false;
        this.menuHTML = null;
        this.menuCSS = null;
    }

    // Verificar se a página já tem menu
    temMenu() {
        return document.getElementById('sidebar') !== null;
    }

    // Carregar HTML do menu
    async carregarMenuHTML() {
        if (this.menuHTML) return this.menuHTML;
        
        try {
            const response = await fetch('/menu-template.html');
            this.menuHTML = await response.text();
            return this.menuHTML;
        } catch (error) {
            console.error('Erro ao carregar menu:', error);
            return this.criarMenuFallback();
        }
    }

    // Criar menu de fallback se não conseguir carregar
    criarMenuFallback() {
        return `
        <!-- Menu de Fallback -->
        <div class="hover-zone" title="Passe o mouse aqui para abrir o menu"></div>
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h2 class="sidebar-title" id="sidebarTitle">
                    <span id="sidebarIcon">🏠</span>
                    <span id="sidebarText">Menu</span>
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
        `;
    }

    // Carregar CSS do menu
    carregarMenuCSS() {
        if (this.menuCSS) return this.menuCSS;
        
        this.menuCSS = `
        /* CSS Global do Menu */
        .sidebar { 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 60px; 
            height: 100vh; 
            background: #ffffff; 
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1); 
            transition: all 0.3s ease; 
            z-index: 1000; 
            overflow-y: auto; 
            border-right: 1px solid #e5e7eb;
        }
        .sidebar.open { 
            left: 0; 
            width: 400px; 
        }
        .hover-zone {
            position: fixed;
            top: 0;
            left: 0;
            width: 20px;
            height: 100vh;
            z-index: 999;
            background: transparent;
        }
        .hover-zone:hover + .sidebar {
            width: 400px !important;
        }
        .hover-zone:hover + .sidebar .sidebar-header {
            opacity: 1 !important;
        }
        .hover-zone:hover + .sidebar .nav-link .nav-text {
            opacity: 1 !important;
        }
        .sidebar-header { 
            padding: 1rem; 
            border-bottom: 1px solid #e5e7eb; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 50%, #7c3aed 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
            position: relative;
            overflow: hidden;
            min-height: 60px;
        }
        .sidebar-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: -20%;
            right: -20%;
            height: 100%;
            background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 50%, #7c3aed 100%);
            z-index: -1;
        }
        .sidebar.open .sidebar-header {
            opacity: 1;
        }
        .sidebar-title { 
            font-size: 1.25rem; 
            font-weight: 600; 
            color: #ffffff; 
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .sidebar-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #ffffff; }
        .sidebar-close:hover { color: #f1f5f9; }
        .sidebar-content { 
            padding: 0.5rem 1rem; 
            background: #ffffff;
            margin-top: -0.5rem;
        }
        .nav-menu { 
            list-style: none; 
            padding: 0;
            margin: 0;
        }
        .nav-item { 
            margin-bottom: 0.5rem; 
        }
        .nav-link { 
            display: flex; 
            align-items: center;
            padding: 0.75rem; 
            color: #64748b; 
            text-decoration: none; 
            border-radius: 8px; 
            transition: all 0.3s ease; 
            border: 1px solid transparent;
            white-space: nowrap;
            margin-bottom: 0.25rem;
        }
        .nav-link .nav-text {
            margin-left: 0.75rem;
            opacity: 0;
            transition: opacity 0.3s ease;
            font-size: 0.9rem;
            font-weight: 500;
        }
        .sidebar.open .nav-link .nav-text {
            opacity: 1;
        }
        .nav-link:hover { 
            background: #f1f5f9; 
            color: #1e293b; 
            border: 1px solid #e2e8f0;
        }
        .nav-link.active { 
            background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 100%); 
            color: white; 
            border: 1px solid #00d4aa;
        }
        .sidebar:not(.open) .nav-link {
            justify-content: center;
            padding: 0.75rem 0.5rem;
            margin-bottom: 1.2rem;
            display: flex;
            align-items: center;
            width: 100%;
        }
        .sidebar:not(.open) .nav-link span:first-child {
            font-size: 1.1rem;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            background: #f1f5f9;
            color: #64748b;
            transition: all 0.3s ease;
            margin: 0 auto;
            position: relative;
            overflow: hidden;
        }
        .sidebar:not(.open) .nav-link.active span:first-child {
            background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 50%, #7c3aed 100%);
            color: white;
            position: relative;
        }
        .sidebar:not(.open) .nav-link.active span:first-child::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -18px;
            right: -18px;
            height: calc(100% + 4px);
            background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 50%, #7c3aed 100%);
            border-radius: 4px;
            z-index: -1;
        }
        .sidebar:not(.open) .nav-link:hover span:first-child {
            background: #e2e8f0;
            color: #1e293b;
        }
        @media (max-width: 768px) { 
            .sidebar { width: 100%; right: -100%; }
        }
        `;
        
        return this.menuCSS;
    }

    // Inserir CSS do menu
    inserirCSS() {
        if (document.getElementById('menu-global-css')) return;
        
        const style = document.createElement('style');
        style.id = 'menu-global-css';
        style.textContent = this.carregarMenuCSS();
        document.head.appendChild(style);
    }

    // Inserir HTML do menu
    async inserirHTML() {
        if (this.temMenu()) {
            console.log('[Menu Global] Página já possui menu, não inserindo');
            return;
        }

        const menuHTML = await this.carregarMenuHTML();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = menuHTML;
        
        // Inserir antes do </body>
        document.body.appendChild(tempDiv.firstElementChild);
        document.body.appendChild(tempDiv.lastElementChild);
        
        console.log('[Menu Global] Menu inserido automaticamente');
    }

    // Inicializar funcionalidades do menu
    inicializarFuncionalidades() {
        const sidebar = document.getElementById('sidebar');
        const hoverZone = document.querySelector('.hover-zone');
        const sidebarClose = document.getElementById('sidebarClose');
        
        if (!sidebar) return;

        // Event listeners
        if (sidebarClose) {
            sidebarClose.onclick = () => {
                sidebar.classList.remove('open');
                console.log('[Menu Global] Menu fechado');
            };
        }

        // Hover para expandir
        if (hoverZone && sidebar) {
            hoverZone.addEventListener('mouseenter', () => {
                sidebar.classList.add('open');
                console.log('[Menu Global] Menu expandido por hover');
            });
            
            sidebar.addEventListener('mouseleave', () => {
                sidebar.classList.remove('open');
                console.log('[Menu Global] Menu colapsado');
            });
            
            sidebar.addEventListener('mouseenter', () => {
                sidebar.classList.add('open');
            });
        }

        // Links do menu
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                const icon = link.querySelector('span:first-child').textContent.trim();
                const text = link.querySelector('.nav-text').textContent.trim();
                this.atualizarHeader(icon, text);
                
                console.log(`[Menu Global] Link clicado: ${icon} ${text}`);
            });
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (sidebar && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && !hoverZone.contains(e.target)) {
                    sidebar.classList.remove('open');
                    console.log('[Menu Global] Menu fechado (clique fora)');
                }
            }
        });

        // Marcar página ativa
        this.marcarPaginaAtiva();
    }

    // Atualizar header do menu
    atualizarHeader(icon, text) {
        const sidebarIcon = document.getElementById('sidebarIcon');
        const sidebarText = document.getElementById('sidebarText');
        
        if (sidebarIcon) sidebarIcon.textContent = icon;
        if (sidebarText) sidebarText.textContent = text;
    }

    // Marcar página ativa baseada na URL
    marcarPaginaAtiva() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
                
                const icon = link.querySelector('span:first-child').textContent.trim();
                const text = link.querySelector('.nav-text').textContent.trim();
                this.atualizarHeader(icon, text);
            }
        });
    }

    // Inicializar sistema global
    async inicializar() {
        if (this.isInitialized) return;
        
        console.log('[Menu Global] Inicializando sistema global de menu...');
        
        // Inserir CSS
        this.inserirCSS();
        
        // Inserir HTML
        await this.inserirHTML();
        
        // Aguardar um pouco para o DOM estar pronto
        setTimeout(() => {
            this.inicializarFuncionalidades();
            this.isInitialized = true;
            console.log('[Menu Global] Sistema inicializado com sucesso!');
        }, 100);
    }
}

// Criar instância global
window.menuGlobal = new MenuGlobal();

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.menuGlobal.inicializar();
});

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MenuGlobal;
}
