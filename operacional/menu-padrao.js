// ================== MENU PADRÃO LUNAS DIGITAL ==================
// Este arquivo define o menu padrão para todas as páginas do sistema operacional
// Para alterar o menu, edite apenas este arquivo

const MENU_CONFIG = {
  // Configurações gerais
  logo: {
    src: '/assets/logo-lunas.png',
    alt: 'Lunas Digital',
    link: '/operacional'
  },
  
  // Menu principal
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
      id: 'propostas',
      label: 'Propostas',
      icon: 'file-text',
      link: '/operacional/digitation-interface.html',
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
        },
        {
          id: 'usuarios',
          label: 'Usuários',
          link: '/operacional/configuracoes-usuarios.html'
        },
        {
          id: 'sistema',
          label: 'Sistema',
          link: '/operacional/configuracoes-sistema.html'
        }
      ]
    }
  ],
  
  // Menu secundário (breadcrumb)
  breadcrumb: {
    enabled: true,
    separator: '>',
    homeLabel: 'Dashboard'
  },
  
  // Configurações de estilo
  style: {
    theme: 'lunas-blue', // lunas-blue, lunas-green, lunas-purple
    compact: false,
    showIcons: true
  }
};

// ================== FUNÇÃO PARA RENDERIZAR MENU ==================
function renderMenu(containerId = 'menu-container', currentPage = null) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn('⚠️ Container do menu não encontrado:', containerId);
    return;
  }

  // Marcar página atual como ativa
  if (currentPage) {
    MENU_CONFIG.items.forEach(item => {
      item.active = (item.id === currentPage);
      if (item.submenu) {
        item.submenu.forEach(subItem => {
          subItem.active = (subItem.id === currentPage);
        });
      }
    });
  }

  // Gerar HTML do menu
  const menuHTML = generateMenuHTML();
  container.innerHTML = menuHTML;
  
  // Adicionar event listeners
  addMenuEventListeners();
  
  console.log('✅ Menu padrão carregado com sucesso');
}

// ================== GERAR HTML DO MENU ==================
function generateMenuHTML() {
  let html = `
    <nav class="menu-padrao lunas-menu">
      <div class="menu-header">
        <a href="${MENU_CONFIG.logo.link}" class="menu-logo">
          <img src="${MENU_CONFIG.logo.src}" alt="${MENU_CONFIG.logo.alt}" />
          <span class="logo-text">Lunas Digital</span>
        </a>
      </div>
      
      <div class="menu-items">
        <ul class="menu-list">
  `;

  // Renderizar itens do menu
  MENU_CONFIG.items.forEach(item => {
    html += generateMenuItemHTML(item);
  });

  html += `
        </ul>
      </div>
      
      <div class="menu-footer">
        <div class="user-info">
          <span class="user-name">Usuário Logado</span>
          <span class="user-role">Administrador</span>
        </div>
        <button class="logout-btn" onclick="logout()">
          <i data-feather="log-out"></i>
          Sair
        </button>
      </div>
    </nav>
  `;

  return html;
}

// ================== GERAR HTML DE ITEM DO MENU ==================
function generateMenuItemHTML(item) {
  let html = `
    <li class="menu-item ${item.active ? 'active' : ''}">
      <a href="${item.link || '#'}" class="menu-link" data-item-id="${item.id}">
  `;

  if (MENU_CONFIG.style.showIcons && item.icon) {
    html += `<i data-feather="${item.icon}"></i>`;
  }

  html += `
        <span class="menu-label">${item.label}</span>
      </a>
  `;

  // Submenu
  if (item.submenu && item.submenu.length > 0) {
    html += `
      <ul class="submenu">
    `;
    
    item.submenu.forEach(subItem => {
      html += `
        <li class="submenu-item ${subItem.active ? 'active' : ''}">
          <a href="${subItem.link}" class="submenu-link" data-item-id="${subItem.id}">
            <span class="submenu-label">${subItem.label}</span>
          </a>
        </li>
      `;
    });
    
    html += `
      </ul>
    `;
  }

  html += `
    </li>
  `;

  return html;
}

// ================== ADICIONAR EVENT LISTENERS ==================
function addMenuEventListeners() {
  // Toggle submenu
  document.querySelectorAll('.menu-item').forEach(item => {
    const link = item.querySelector('.menu-link');
    const submenu = item.querySelector('.submenu');
    
    if (submenu) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        item.classList.toggle('expanded');
      });
    }
  });

  // Inicializar ícones Feather
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
}

// ================== FUNÇÃO PARA RENDERIZAR BREADCRUMB ==================
function renderBreadcrumb(containerId = 'breadcrumb-container', path = []) {
  if (!MENU_CONFIG.breadcrumb.enabled) return;
  
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = `
    <nav class="breadcrumb">
      <a href="/operacional" class="breadcrumb-home">
        <i data-feather="home"></i>
        ${MENU_CONFIG.breadcrumb.homeLabel}
      </a>
  `;

  path.forEach((item, index) => {
    html += `
      <span class="breadcrumb-separator">${MENU_CONFIG.breadcrumb.separator}</span>
      <span class="breadcrumb-item ${index === path.length - 1 ? 'current' : ''}">
        ${item.label}
      </span>
    `;
  });

  html += `</nav>`;

  container.innerHTML = html;
  
  // Inicializar ícones Feather
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
}

// ================== FUNÇÕES UTILITÁRIAS ==================
function logout() {
  if (confirm('Tem certeza que deseja sair?')) {
    // Implementar logout
    window.location.href = '/login';
  }
}

function updateMenuActive(currentPageId) {
  // Atualizar menu ativo sem recarregar
  document.querySelectorAll('.menu-item, .submenu-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const activeItem = document.querySelector(`[data-item-id="${currentPageId}"]`);
  if (activeItem) {
    activeItem.closest('.menu-item, .submenu-item').classList.add('active');
  }
}

// ================== AUTO-INICIALIZAÇÃO ==================
// Carregar menu automaticamente quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  // Detectar página atual baseada na URL
  const currentPath = window.location.pathname;
  let currentPageId = null;
  
  // Mapear URLs para IDs de página
  const pageMapping = {
    '/operacional': 'dashboard',
    '/operacional/buscar-cliente.html': 'clientes',
    '/operacional/digitation-interface.html': 'propostas',
    '/operacional/configuracoes-status.html': 'status-produtos',
    '/operacional/configuracoes-usuarios.html': 'usuarios',
    '/operacional/configuracoes-sistema.html': 'sistema'
  };
  
  currentPageId = pageMapping[currentPath] || null;
  
  // Renderizar menu
  renderMenu('menu-container', currentPageId);
  
  // Renderizar breadcrumb se necessário
  if (currentPageId) {
    const breadcrumbPath = generateBreadcrumbPath(currentPageId);
    renderBreadcrumb('breadcrumb-container', breadcrumbPath);
  }
});

// ================== GERAR CAMINHO DO BREADCRUMB ==================
function generateBreadcrumbPath(currentPageId) {
  const path = [];
  
  // Encontrar item do menu
  for (const item of MENU_CONFIG.items) {
    if (item.id === currentPageId) {
      path.push({ label: item.label });
      break;
    }
    
    if (item.submenu) {
      for (const subItem of item.submenu) {
        if (subItem.id === currentPageId) {
          path.push({ label: item.label });
          path.push({ label: subItem.label });
          break;
        }
      }
    }
  }
  
  return path;
}

// ================== EXPORTAR PARA USO GLOBAL ==================
window.LunasMenu = {
  render: renderMenu,
  renderBreadcrumb: renderBreadcrumb,
  updateActive: updateMenuActive,
  config: MENU_CONFIG
};



