/**
 * CRM Layout Controller
 * Controla sidebar, navegação e funcionalidades globais
 */

class CRMLayout {
    constructor() {
        this.sidebar = null;
        this.sidebarOverlay = null;
        this.currentPage = '';
        
        this.init();
    }

    init() {
        // Aguardar DOM carregar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        console.log('🎨 Inicializando CRM Layout...');
        
        // Identificar página atual
        this.currentPage = this.getCurrentPage();
        
        // Configurar sidebar
        this.setupSidebar();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Configurar navegação ativa
        this.setActiveNavigation();
        
        // Configurar responsivo
        this.setupResponsive();
        
        console.log('✅ CRM Layout inicializado');
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '') || 'index';
        return page;
    }

    setupSidebar() {
        this.sidebar = document.querySelector('.sidebar');
        this.sidebarOverlay = document.querySelector('.sidebar-overlay');
        
        if (!this.sidebar) {
            console.warn('⚠️ Sidebar não encontrada');
            return;
        }

        // Verificar estado salvo da sidebar
        const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        if (isCollapsed) {
            this.sidebar.classList.add('collapsed');
        }
    }

    setupEventListeners() {
        // Toggle sidebar
        const toggleBtn = document.querySelector('.sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Overlay para mobile
        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => this.closeMobileSidebar());
        }

        // Menu mobile
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.openMobileSidebar());
        }

        // Tecla de atalho (Ctrl + B)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                this.toggleSidebar();
            }
        });

        // Redimensionamento da janela
        window.addEventListener('resize', () => this.handleResize());
    }

    toggleSidebar() {
        if (!this.sidebar) return;

        const isCollapsed = this.sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar-collapsed', isCollapsed);
        
        // Animar o ícone do toggle
        const toggleIcon = document.querySelector('.sidebar-toggle i');
        if (toggleIcon) {
            toggleIcon.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        }

        // Disparar evento customizado
        window.dispatchEvent(new CustomEvent('sidebarToggle', { 
            detail: { collapsed: isCollapsed } 
        }));
    }

    openMobileSidebar() {
        if (!this.sidebar || !this.sidebarOverlay) return;

        this.sidebar.classList.add('mobile-open');
        this.sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeMobileSidebar() {
        if (!this.sidebar || !this.sidebarOverlay) return;

        this.sidebar.classList.remove('mobile-open');
        this.sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    setActiveNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.classList.remove('active');
            
            const href = item.getAttribute('href');
            if (href) {
                // Extrair nome da página do href
                const pageName = href.split('/').pop().replace('.html', '') || 'index';
                
                // Marcar como ativo se corresponder à página atual
                if (pageName === this.currentPage || 
                    (this.currentPage === 'index' && pageName === '')) {
                    item.classList.add('active');
                }
            }
        });
    }

    handleResize() {
        const isMobile = window.innerWidth <= 1024;
        
        if (isMobile) {
            // Fechar sidebar em modo mobile
            this.closeMobileSidebar();
        }
    }

    // Utilitários para badges de notificação
    updateBadge(navItemId, count) {
        const navItem = document.querySelector(`[data-nav="${navItemId}"]`);
        if (!navItem) return;

        let badge = navItem.querySelector('.nav-badge');
        
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                navItem.querySelector('.nav-item-content').appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
        } else if (badge) {
            badge.remove();
        }
    }

    // Mostrar/ocultar loading na topbar
    showTopbarLoading(show = true) {
        const topbarActions = document.querySelector('.topbar-actions');
        if (!topbarActions) return;

        const loadingId = 'topbar-loading';
        let loading = document.getElementById(loadingId);

        if (show && !loading) {
            loading = document.createElement('div');
            loading.id = loadingId;
            loading.innerHTML = `
                <div style="
                    width: 20px;
                    height: 20px;
                    border: 2px solid #e2e8f0;
                    border-top: 2px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            topbarActions.prepend(loading);
        } else if (!show && loading) {
            loading.remove();
        }
    }

    // Atualizar título da página
    updatePageTitle(title, subtitle = '') {
        const pageTitle = document.querySelector('.page-title');
        const pageSubtitle = document.querySelector('.page-subtitle');
        
        if (pageTitle) {
            // Manter ícone se existir
            const icon = pageTitle.querySelector('i');
            pageTitle.innerHTML = '';
            if (icon) {
                pageTitle.appendChild(icon);
            }
            pageTitle.appendChild(document.createTextNode(title));
        }
        
        if (pageSubtitle) {
            pageSubtitle.textContent = subtitle;
        }
        
        // Atualizar title da página
        document.title = `${title} - Sistema Operacional Lunas`;
    }

    // Mostrar notificação toast
    showToast(message, type = 'info', duration = 5000) {
        const toastId = 'crm-toast-' + Date.now();
        const toast = document.createElement('div');
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        toast.id = toastId;
        toast.className = `fixed top-4 right-4 ${colors[type] || colors.info} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300`;
        toast.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 400px;
            font-weight: 500;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i data-feather="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : type === 'warning' ? 'alert-triangle' : 'info'}" style="width: 20px; height: 20px;"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 1rem; cursor: pointer; opacity: 0.8;">
                    <i data-feather="x" style="width: 16px; height: 16px;"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Ativar feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Animar entrada
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remover
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.getElementById(toastId)) {
                    document.getElementById(toastId).remove();
                }
            }, 300);
        }, duration);
    }

    setupResponsive() {
        // Configurar responsividade básica
        const handleResize = () => {
            const isMobile = window.innerWidth < 768;
            const sidebar = document.querySelector('.sidebar');
            
            if (sidebar) {
                if (isMobile) {
                    sidebar.classList.add('sidebar-mobile');
                } else {
                    sidebar.classList.remove('sidebar-mobile');
                }
            }
        };

        // Executar na inicialização
        handleResize();
        
        // Escutar mudanças de tamanho
        window.addEventListener('resize', handleResize);
    }
}

// Instanciar automaticamente
let crmLayout;
if (typeof window !== 'undefined') {
    crmLayout = new CRMLayout();
    window.crmLayout = crmLayout;
}

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CRMLayout;
}
