// ===== SISTEMA DE MENU/SIDEBAR - VERSÃO TESTE =====
// Arquivo separado para gerenciar toda funcionalidade do menu
// Versão independente para testes sem modificar arquivos principais

class MenuManager {
    constructor() {
        this.sidebar = null;
        this.sidebarToggle = null;
        this.sidebarClose = null;
        this.config = {};
        this.init();
    }

    init() {
        // Aguardar DOM carregar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupElements());
        } else {
            this.setupElements();
        }
    }

    setupElements() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.sidebarClose = document.getElementById('sidebarClose');

        if (!this.sidebar || !this.sidebarToggle || !this.sidebarClose) {
            console.warn('⚠️ Elementos do menu não encontrados');
            return;
        }

        this.setupEventListeners();
        this.loadConfig();
        console.log('✅ MenuManager inicializado');
    }

    setupEventListeners() {
        // Toggle da sidebar
        this.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        
        // Fechar sidebar
        this.sidebarClose?.addEventListener('click', () => this.closeSidebar());
        
        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (this.sidebar?.classList.contains('open')) {
                if (!this.sidebar.contains(e.target) && !this.sidebarToggle.contains(e.target)) {
                    this.closeSidebar();
                }
            }
        });

        // Botões de teste
        document.getElementById('btnTestePagina')?.addEventListener('click', () => this.abrirPaginaTeste());
        document.getElementById('btnTesteAPI')?.addEventListener('click', () => this.testarAPIs());
        document.getElementById('btnTesteSocket')?.addEventListener('click', () => this.testarSocket());
        
        // Botões de configuração
        document.getElementById('saveConfig')?.addEventListener('click', () => this.saveConfig());
        document.getElementById('cancelConfig')?.addEventListener('click', () => this.cancelConfig());
    }

    toggleSidebar() {
        if (this.sidebar) {
            this.sidebar.classList.toggle('open');
            console.log('🖱️ Menu toggled');
        }
    }

    closeSidebar() {
        if (this.sidebar) {
            this.sidebar.classList.remove('open');
            console.log('🖱️ Menu fechado');
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                this.config = await response.json();
                this.populateConfigForm();
                console.log('✅ Configurações carregadas:', this.config);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar configurações:', error);
            this.setDefaultConfig();
        }
    }

    setDefaultConfig() {
        this.config = {
            horarioInicio: '08:00',
            horarioFim: '22:00',
            delay: 1000,
            fusoHorario: 'America/Sao_Paulo'
        };
        this.populateConfigForm();
    }

    populateConfigForm() {
        // Preencher campos do formulário
        const fields = {
            'horarioInicio': this.config.horarioInicio || '08:00',
            'horarioFim': this.config.horarioFim || '22:00',
            'fusoHorario': this.config.fusoHorario || 'America/Sao_Paulo',
            'delayBase': this.config.delay || 1000,
            'delayMin': this.config.delayMin || 500,
            'delayMax': this.config.delayMax || 5000
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
    }

    async saveConfig() {
        try {
            // Coletar dados do formulário
            const formData = {
                horarioInicio: document.getElementById('horarioInicio')?.value || '08:00',
                horarioFim: document.getElementById('horarioFim')?.value || '22:00',
                fusoHorario: document.getElementById('fusoHorario')?.value || 'America/Sao_Paulo',
                delay: parseInt(document.getElementById('delayBase')?.value) || 1000,
                delayMin: parseInt(document.getElementById('delayMin')?.value) || 500,
                delayMax: parseInt(document.getElementById('delayMax')?.value) || 5000
            };

            // Simular salvamento (em produção, enviaria para o servidor)
            this.config = { ...this.config, ...formData };
            
            this.showNotification('✅ Configurações salvas com sucesso!', 'success');
            console.log('💾 Configurações salvas:', this.config);
            
        } catch (error) {
            this.showNotification('❌ Erro ao salvar configurações', 'error');
            console.error('❌ Erro ao salvar:', error);
        }
    }

    cancelConfig() {
        this.populateConfigForm();
        this.showNotification('🔄 Configurações restauradas', 'info');
        console.log('🔄 Configurações canceladas');
    }

    abrirPaginaTeste() {
        window.open('/teste-completo', '_blank');
        this.showNotification('📄 Página de teste aberta em nova aba', 'info');
        console.log('📄 Abrindo página de teste');
    }

    async testarAPIs() {
        this.showNotification('🔄 Testando APIs...', 'warning');
        
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification(`✅ API Status: ${data.status}`, 'success');
                console.log('✅ API testada:', data);
            } else {
                this.showNotification(`❌ Erro: ${response.status}`, 'error');
                console.error('❌ Erro na API:', response.status);
            }
        } catch (error) {
            this.showNotification(`❌ Erro: ${error.message}`, 'error');
            console.error('❌ Erro:', error);
        }
    }

    async testarSocket() {
        this.showNotification('🔄 Testando Socket.IO...', 'warning');
        
        try {
            const response = await fetch('/api/teste-socket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    teste: 'Socket.IO', 
                    timestamp: new Date().toISOString() 
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification('✅ Socket.IO testado com sucesso!', 'success');
                console.log('✅ Socket.IO testado:', data);
            } else {
                this.showNotification(`❌ Erro Socket: ${response.status}`, 'error');
                console.error('❌ Erro Socket:', response.status);
            }
        } catch (error) {
            this.showNotification(`❌ Erro Socket: ${error.message}`, 'error');
            console.error('❌ Erro Socket:', error);
        }
    }

    showNotification(message, type = 'info') {
        const statusElement = document.getElementById('testeStatusSidebar');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status ${type}`;
            
            // Auto-hide após 3 segundos
            setTimeout(() => {
                statusElement.textContent = 'Pronto para testes';
                statusElement.className = 'status info';
            }, 3000);
        }
    }
}

// Inicializar quando o DOM estiver pronto
let menuManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        menuManager = new MenuManager();
    });
} else {
    menuManager = new MenuManager();
}

// Exportar para uso global
window.MenuManager = MenuManager;
window.menuManager = menuManager;

