/**
 * CRM Layout Controller - Sistema Lunas Digital
 * Controla sidebar, navegação e funcionalidades globais
 */

class CRMLayout {
    constructor() {
        this.sidebar = null;
        this.sidebarOverlay = null;
        this.currentPage = '';
        this.isLoading = false;
        
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

    async setup() {
        console.log('🎨 Inicializando CRM Layout...');
        
        // Identificar página atual
        this.currentPage = this.getCurrentPage();
        
        // Carregar template do menu/side bar centralizado
        await this.loadSidebarTemplate();
        
        // Configurar sidebar
        this.setupSidebar();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Configurar navegação ativa
        this.setActiveNavigation();
        
        // Configurar responsivo
        this.setupResponsive();
        
        // Configurar notificações
        this.setupNotifications();
        
        console.log('✅ CRM Layout inicializado');
    }

    async loadSidebarTemplate() {
        try {
            const container = document.querySelector('.sidebar');
            if (!container) {
                console.warn('⚠️ Sidebar não encontrada para injeção do menu');
                return;
            }
            // Evitar recarregar se já existir conteúdo básico
            if (container.dataset.loaded === 'true') {
                return;
            }
            const version = (window.CRM_MENU_VERSION || 'v1');
            const resp = await fetch(`/operacional/assets/menu.html?v=${version}`, { cache: 'no-store' });
            if (!resp.ok) {
                console.warn('⚠️ Falha ao carregar menu.html:', resp.status);
                return;
            }
            const html = await resp.text();
            container.innerHTML = html;
            container.dataset.loaded = 'true';
            // Ativar feather icons após injeção
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        } catch (e) {
            console.warn('⚠️ Erro ao injetar menu centralizado:', e.message);
        }
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

        // Criar overlay para mobile se não existir
        if (!this.sidebarOverlay) {
            this.sidebarOverlay = document.createElement('div');
            this.sidebarOverlay.className = 'sidebar-overlay';
            this.sidebarOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                display: none;
            `;
            document.body.appendChild(this.sidebarOverlay);
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

        // Fechar modais com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
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
        this.sidebarOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeMobileSidebar() {
        if (!this.sidebar || !this.sidebarOverlay) return;

        this.sidebar.classList.remove('mobile-open');
        this.sidebarOverlay.style.display = 'none';
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

    setupNotifications() {
        // Configurar sistema de notificações
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notification-container';
        this.notificationContainer.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        `;
        document.body.appendChild(this.notificationContainer);
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
                <div class="loading"></div>
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
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        
        toast.id = toastId;
        toast.style.cssText = `
            position: relative;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 400px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        `;
        
        toast.innerHTML = `
            <i data-feather="${icons[type] || icons.info}" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; opacity: 0.8; padding: 0.25rem;">
                <i data-feather="x" style="width: 16px; height: 16px;"></i>
            </button>
        `;
        
        this.notificationContainer.appendChild(toast);
        
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

    // Fechar todos os modais
    closeAllModals() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // Mostrar modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // Fechar modal
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Fazer requisição com loading
    async request(url, options = {}) {
        this.isLoading = true;
        this.showTopbarLoading(true);

        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro na requisição:', error);
            this.showToast('Erro na requisição: ' + error.message, 'error');
            throw error;
        } finally {
            this.isLoading = false;
            this.showTopbarLoading(false);
        }
    }

    // Confirmar ação
    confirm(message, title = 'Confirmar') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">
                            <i data-feather="x"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove(); window.crmLayout.confirmResolve(false)">
                            Cancelar
                        </button>
                        <button class="btn btn-danger" onclick="this.closest('.modal').remove(); window.crmLayout.confirmResolve(true)">
                            Confirmar
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';
            
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            
            window.crmLayout.confirmResolve = resolve;
        });
    }

    // Formatar data
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return new Date(date).toLocaleDateString('pt-BR', { ...defaultOptions, ...options });
    }

    // Formatar moeda
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // Formatar CPF
    formatCPF(cpf) {
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    // Formatar telefone
    formatPhone(phone) {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    // Validar CPF
    validateCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');
        
        if (cpf.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cpf)) return false;
        
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(9))) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(10))) return false;
        
        return true;
    }

    // Validar email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
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