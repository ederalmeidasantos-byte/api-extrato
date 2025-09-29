// ===== MENU OTIMIZADO PARA PAINEL FGTS =====
class MenuOtimizado {
    constructor() {
        this.isInitialized = false;
        this.isOpen = false;
    }

    init() {
        if (this.isInitialized) return;
        
        this.criarMenu();
        this.adicionarEventos();
        this.isInitialized = true;
    }

    criarMenu() {
        // Verificar se já existe
        if (document.getElementById('menu-lateral')) return;

        const menuHTML = `
            <!-- Zona de Hover -->
            <div class="hover-zone" id="hoverZone" title="Passe o mouse aqui para abrir o menu"></div>
            
            <!-- Menu Lateral -->
            <div class="menu-lateral" id="menu-lateral">
                <div class="menu-header">
                    <h3>🏠 Menu</h3>
                    <button class="menu-close" id="menuClose">×</button>
                </div>
                <div class="menu-content">
                    <a href="/" class="menu-item">
                        <span class="menu-icon">📊</span>
                        <span class="menu-text">Painel FGTS</span>
                    </a>
                    <a href="/fgts/status-page" class="menu-item">
                        <span class="menu-icon">📋</span>
                        <span class="menu-text">Status CPFs</span>
                    </a>
                    <a href="/fgts/logs" class="menu-item">
                        <span class="menu-icon">📝</span>
                        <span class="menu-text">Logs</span>
                    </a>
                    <a href="/fgts/cache" class="menu-item">
                        <span class="menu-icon">💾</span>
                        <span class="menu-text">Cache</span>
                    </a>
                </div>
            </div>
        `;

        // Inserir no body
        document.body.insertAdjacentHTML('afterbegin', menuHTML);

        // Adicionar CSS otimizado
        this.adicionarCSS();
    }

    adicionarCSS() {
        const css = `
            <style id="menu-css">
                .hover-zone {
                    position: fixed;
                    left: 0;
                    top: 0;
                    width: 20px;
                    height: 100vh;
                    background: transparent;
                    z-index: 1000;
                    cursor: pointer;
                }
                
                .menu-lateral {
                    position: fixed;
                    left: -300px;
                    top: 0;
                    width: 280px;
                    height: 100vh;
                    background: white;
                    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
                    z-index: 1001;
                    transition: left 0.3s ease;
                    overflow-y: auto;
                }
                
                .menu-lateral.open {
                    left: 0;
                }
                
                .menu-header {
                    padding: 1rem;
                    background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 100%);
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .menu-header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                }
                
                .menu-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .menu-content {
                    padding: 1rem 0;
                }
                
                .menu-item {
                    display: flex;
                    align-items: center;
                    padding: 0.8rem 1rem;
                    color: #334155;
                    text-decoration: none;
                    transition: background 0.2s ease;
                    border-left: 3px solid transparent;
                }
                
                .menu-item:hover {
                    background: #f1f5f9;
                    border-left-color: #00d4aa;
                }
                
                .menu-icon {
                    margin-right: 0.8rem;
                    font-size: 1.1rem;
                }
                
                .menu-text {
                    font-weight: 500;
                }
                
                @media (max-width: 768px) {
                    .menu-lateral {
                        width: 100vw;
                        left: -100vw;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', css);
    }

    adicionarEventos() {
        const hoverZone = document.getElementById('hoverZone');
        const menuLateral = document.getElementById('menu-lateral');
        const menuClose = document.getElementById('menuClose');

        if (hoverZone) {
            hoverZone.addEventListener('mouseenter', () => this.abrirMenu());
        }

        if (menuLateral) {
            menuLateral.addEventListener('mouseleave', () => this.fecharMenu());
        }

        if (menuClose) {
            menuClose.addEventListener('click', () => this.fecharMenu());
        }

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.fecharMenu();
            }
        });
    }

    abrirMenu() {
        const menuLateral = document.getElementById('menu-lateral');
        if (menuLateral) {
            menuLateral.classList.add('open');
            this.isOpen = true;
        }
    }

    fecharMenu() {
        const menuLateral = document.getElementById('menu-lateral');
        if (menuLateral) {
            menuLateral.classList.remove('open');
            this.isOpen = false;
        }
    }
}

// Inicializar menu quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const menu = new MenuOtimizado();
    menu.init();
});
