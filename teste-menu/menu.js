// ===== SISTEMA DE MENU LATERAL =====
// Arquivo separado para ser incluído em todas as páginas

class MenuLateral {
    constructor() {
        this.sidebar = null;
        this.hoverZone = null;
        this.isInitialized = false;
    }

    // Função para atualizar header
    atualizarHeader(icon, text) {
        const sidebarIcon = document.getElementById('sidebarIcon');
        const sidebarText = document.getElementById('sidebarText');
        
        if (sidebarIcon) sidebarIcon.textContent = icon;
        if (sidebarText) sidebarText.textContent = text;
    }

    // Função para adicionar log
    adicionarLog(mensagem) {
        console.log(`[Menu] ${mensagem}`);
    }

    // Função para fechar menu
    fecharMenu() {
        if (this.sidebar) {
            this.sidebar.classList.remove('open');
            this.adicionarLog('Menu fechado');
        }
    }

    // Função para abrir menu
    abrirMenu() {
        if (this.sidebar) {
            this.sidebar.classList.add('open');
            this.adicionarLog('Menu aberto');
        }
    }

    // Inicializar o menu
    inicializar() {
        if (this.isInitialized) return;

        // Elementos do menu
        this.sidebar = document.getElementById('sidebar');
        this.hoverZone = document.querySelector('.hover-zone');
        
        if (!this.sidebar) {
            console.error('Elemento sidebar não encontrado!');
            return;
        }

        // Event listeners do menu
        const sidebarClose = document.getElementById('sidebarClose');
        
        if (sidebarClose) {
            sidebarClose.onclick = () => this.fecharMenu();
        }

        // Hover para expandir menu
        if (this.hoverZone && this.sidebar) {
            this.hoverZone.addEventListener('mouseenter', () => {
                this.sidebar.classList.add('open');
                this.adicionarLog('Menu expandido por hover');
            });
            
            this.sidebar.addEventListener('mouseleave', () => {
                this.sidebar.classList.remove('open');
                this.adicionarLog('Menu colapsado (saiu da área)');
            });
            
            // Também manter aberto quando hover no sidebar
            this.sidebar.addEventListener('mouseenter', () => {
                this.sidebar.classList.add('open');
            });
        }

        // Event listeners para os links do menu
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Remover active de todos os links
                navLinks.forEach(l => l.classList.remove('active'));
                // Adicionar active ao link clicado
                link.classList.add('active');
                
                // Atualizar header
                const icon = link.querySelector('span:first-child').textContent.trim();
                const text = link.querySelector('.nav-text').textContent.trim();
                this.atualizarHeader(icon, text);
                
                this.adicionarLog(`Link clicado: ${icon} ${text}`);
            });
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (this.sidebar && this.sidebar.classList.contains('open')) {
                if (!this.sidebar.contains(e.target) && !this.hoverZone.contains(e.target)) {
                    this.sidebar.classList.remove('open');
                    this.adicionarLog('Menu fechado (clique fora)');
                }
            }
        });

        this.isInitialized = true;
        this.adicionarLog('Menu inicializado com sucesso');
    }
}

// Criar instância global do menu
window.menuLateral = new MenuLateral();

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    window.menuLateral.inicializar();
});

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MenuLateral;
}

