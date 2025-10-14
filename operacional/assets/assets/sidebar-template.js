/**
 * Template da Sidebar para reuso em todas as páginas
 */

function createSidebarHTML() {
    return `
        <!-- Sidebar -->
        <aside class="sidebar">
            <!-- Sidebar Header -->
            <div class="sidebar-header">
                <a href="/operacional/" class="logo">
                    <div class="logo-icon">
                        <i data-feather="hexagon"></i>
                    </div>
                    <span class="logo-text">Lunas Digital</span>
                </a>
                <button class="sidebar-toggle">
                    <i data-feather="chevron-left"></i>
                </button>
            </div>

            <!-- Sidebar Navigation -->
            <nav class="sidebar-nav">
                <!-- Dashboard -->
                <div class="nav-section">
                    <h4 class="nav-section-title">Principal</h4>
                    <a href="/operacional/" class="nav-item" data-nav="dashboard">
                        <div class="nav-item-content">
                            <i data-feather="home" class="nav-item-icon"></i>
                            <span class="nav-item-text">Dashboard</span>
                        </div>
                    </a>
                    <a href="/INSS/simulador.html" class="nav-item" data-nav="simulator">
                        <div class="nav-item-content">
                            <i data-feather="calculator" class="nav-item-icon"></i>
                            <span class="nav-item-text">Simulador</span>
                        </div>
                    </a>
                </div>

                <!-- Clientes -->
                <div class="nav-section">
                    <h4 class="nav-section-title">Clientes</h4>
                    <a href="/operacional/buscar-cliente.html" class="nav-item" data-nav="buscar-cliente">
                        <div class="nav-item-content">
                            <i data-feather="search" class="nav-item-icon"></i>
                            <span class="nav-item-text">Buscar Cliente</span>
                        </div>
                    </a>
                    <a href="/operacional/formulario-cliente.html" class="nav-item" data-nav="formulario-cliente">
                        <div class="nav-item-content">
                            <i data-feather="user-plus" class="nav-item-icon"></i>
                            <span class="nav-item-text">Novo Cliente</span>
                        </div>
                    </a>
                </div>

                <!-- Operacional -->
                <div class="nav-section">
                    <h4 class="nav-section-title">Operacional</h4>
                    <a href="/operacional/digitation-interface.html" class="nav-item" data-nav="digitation-interface">
                        <div class="nav-item-content">
                            <i data-feather="edit-3" class="nav-item-icon"></i>
                            <span class="nav-item-text">Fila de Digitação</span>
                            <span class="nav-badge" id="digitation-badge">0</span>
                        </div>
                    </a>
                    <a href="/operacional/buscar-propostas.html" class="nav-item" data-nav="buscar-propostas">
                        <div class="nav-item-content">
                            <i data-feather="file-text" class="nav-item-icon"></i>
                            <span class="nav-item-text">Propostas</span>
                        </div>
                    </a>
                </div>

                <!-- Integração -->
                <div class="nav-section">
                    <h4 class="nav-section-title">Integração</h4>
                    <a href="/operacional/kentro-test.html" class="nav-item" data-nav="kentro-test">
                        <div class="nav-item-content">
                            <i data-feather="link" class="nav-item-icon"></i>
                            <span class="nav-item-text">Kentro API</span>
                        </div>
                    </a>
                </div>
            </nav>

            <!-- Sidebar Footer -->
            <div class="sidebar-footer">
                <div class="user-info">
                    <div class="user-avatar">
                        <i data-feather="user"></i>
                    </div>
                    <div class="user-details">
                        <div class="user-name">Operador</div>
                        <div class="user-role">Sistema Lunas</div>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Overlay para mobile -->
        <div class="sidebar-overlay"></div>
    `;
}

function createTopbarHTML(title, subtitle = '', actions = []) {
    const actionsHTML = actions.map(action => {
        const className = action.type === 'secondary' ? 'topbar-btn secondary' : 'topbar-btn';
        const href = action.href ? `href="${action.href}"` : '';
        const onclick = action.onclick ? `onclick="${action.onclick}"` : '';
        const tag = action.href ? 'a' : 'button';
        
        return `
            <${tag} ${href} ${onclick} class="${className}">
                <i data-feather="${action.icon}"></i>
                ${action.text}
            </${tag}>
        `;
    }).join('');
    
    return `
        <!-- Topbar -->
        <header class="topbar">
            <div class="topbar-content">
                <div>
                    <h1 class="page-title">
                        <i data-feather="${getPageIcon()}"></i>
                        ${title}
                    </h1>
                    ${subtitle ? `<span class="page-subtitle">${subtitle}</span>` : ''}
                </div>
                <div class="topbar-actions">
                    <button class="mobile-menu-btn topbar-btn secondary" style="display: none;">
                        <i data-feather="menu"></i>
                    </button>
                    ${actionsHTML}
                    <button class="topbar-btn secondary" onclick="location.reload()">
                        <i data-feather="refresh-cw"></i>
                        Atualizar
                    </button>
                </div>
            </div>
        </header>
    `;
}

function getPageIcon() {
    const page = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    
    const icons = {
        'index': 'home',
        'buscar-cliente': 'search',
        'formulario-cliente': 'user-plus',
        'digitation-interface': 'edit-3',
        'buscar-propostas': 'file-text',
        'kentro-test': 'link'
    };
    
    return icons[page] || 'file';
}

function initializeCRMLayout() {
    // Inserir sidebar se não existir
    if (!document.querySelector('.sidebar')) {
        const container = document.querySelector('.crm-container') || document.body;
        const sidebarHTML = createSidebarHTML();
        container.insertAdjacentHTML('afterbegin', sidebarHTML);
    }
    
    // Configurar botão mobile
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('active');
        });
        
        // Mostrar botão em mobile
        const showMobileButton = () => {
            const isMobile = window.innerWidth <= 1024;
            mobileBtn.style.display = isMobile ? 'flex' : 'none';
        };
        
        window.addEventListener('resize', showMobileButton);
        showMobileButton();
    }
    
    // Configurar overlay
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
        });
    }
}

// Auto-inicializar quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    // Só inicializar se estivermos em uma página do operacional
    if (window.location.pathname.includes('/operacional/')) {
        initializeCRMLayout();
    }
});

// Exportar funções
window.createSidebarHTML = createSidebarHTML;
window.createTopbarHTML = createTopbarHTML;
window.initializeCRMLayout = initializeCRMLayout;
