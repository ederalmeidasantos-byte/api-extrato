// ===== SISTEMA DE MENU/SIDEBAR =====
// Arquivo separado para gerenciar toda funcionalidade do menu
// Evita conflitos e facilita manutenção

class MenuManager {
    constructor() {
        this.sidebar = null;
        this.sidebarToggle = null;
        this.sidebarClose = null;
        this.isInitialized = false;
        
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('🚀 Inicializando MenuManager...');
        
        // Aguardar um pouco para garantir que todos os elementos estejam renderizados
        setTimeout(() => {
            this.setupElements();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('✅ MenuManager inicializado com sucesso');
        }, 100);
    }

    setupElements() {
        // Buscar elementos do menu
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.sidebarClose = document.getElementById('sidebarClose');

        console.log('🔍 Elementos encontrados:', {
            sidebar: !!this.sidebar,
            sidebarToggle: !!this.sidebarToggle,
            sidebarClose: !!this.sidebarClose
        });

        if (!this.sidebar || !this.sidebarToggle) {
            console.error('❌ Elementos do menu não encontrados!');
            return false;
        }

        return true;
    }

    setupEventListeners() {
        if (!this.sidebar || !this.sidebarToggle) return;

        // Toggle do menu
        this.sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Botão menu clicado');
            this.toggleSidebar();
        });

        // Fechar menu
        if (this.sidebarClose) {
            this.sidebarClose.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Botão fechar clicado');
                this.closeSidebar();
            });
        }

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (this.sidebar && this.sidebar.classList.contains('open')) {
                if (!this.sidebar.contains(e.target) && !this.sidebarToggle.contains(e.target)) {
                    console.log('🖱️ Clique fora do menu - fechando');
                    this.closeSidebar();
                }
            }
        });

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebar && this.sidebar.classList.contains('open')) {
                console.log('⌨️ Tecla ESC - fechando menu');
                this.closeSidebar();
            }
        });

        console.log('✅ Event listeners configurados');
    }

    toggleSidebar() {
        if (!this.sidebar) return;

        const isOpen = this.sidebar.classList.contains('open');
        
        if (isOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        if (!this.sidebar) return;

        console.log('📂 Abrindo sidebar...');
        this.sidebar.classList.add('open');
        
        // Carregar configurações quando abrir
        this.loadConfig();
        
        // Adicionar classe ao body para evitar scroll
        document.body.style.overflow = 'hidden';
    }

    closeSidebar() {
        if (!this.sidebar) return;

        console.log('📁 Fechando sidebar...');
        this.sidebar.classList.remove('open');
        
        // Restaurar scroll do body
        document.body.style.overflow = '';
    }

    // ===== FUNÇÕES DE CONFIGURAÇÃO =====
    loadConfig() {
        console.log('⚙️ Carregando configurações...');
        
        fetch('/fgts/config')
            .then(response => response.json())
            .then(config => {
                console.log('📋 Configurações carregadas:', config);
                this.populateConfigFields(config);
            })
            .catch(error => {
                console.error('❌ Erro ao carregar configurações:', error);
            });
    }

    populateConfigFields(config) {
        // Mapear campos de configuração
        const fieldMap = {
            'horarioInicio': config.horarioInicio || '08:00',
            'horarioFim': config.horarioFim || '22:00',
            'fusoHorario': config.fusoHorario || 'America/Sao_Paulo',
            'delayBase': config.delayBase || 1000,
            'delayMin': config.delayMin || 500,
            'delayMax': config.delayMax || 5000,
            'taxaErro': config.taxaErro || 10
        };

        // Preencher campos
        Object.entries(fieldMap).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = value;
            }
        });

        // Credenciais (apenas mostrar se existem)
        const credFields = {
            'fgtsUser1': config.fgtsUser1 ? '••••••••••••' : '',
            'fgtsUser2': config.fgtsUser2 ? '••••••••••••' : '',
            'v8ClientId': config.v8ClientId ? '••••••••••••' : '',
            'v8Username': config.v8Username ? '••••••••••••' : '',
            'lunasApiKey': config.lunasApiKey ? '••••••••••••••••' : ''
        };

        Object.entries(credFields).forEach(([fieldId, placeholder]) => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.placeholder = placeholder || field.placeholder;
            }
        });

        console.log('✅ Campos de configuração preenchidos');
    }

    saveConfig() {
        console.log('💾 Salvando configurações...');
        
        const config = {
            horarioInicio: document.getElementById('horarioInicio')?.value || '08:00',
            horarioFim: document.getElementById('horarioFim')?.value || '22:00',
            fusoHorario: document.getElementById('fusoHorario')?.value || 'America/Sao_Paulo',
            delayBase: parseInt(document.getElementById('delayBase')?.value) || 1000,
            delayMin: parseInt(document.getElementById('delayMin')?.value) || 500,
            delayMax: parseInt(document.getElementById('delayMax')?.value) || 5000,
            taxaErro: parseInt(document.getElementById('taxaErro')?.value) || 10,
            fgtsUser1: document.getElementById('fgtsUser1')?.value || '',
            fgtsPass1: document.getElementById('fgtsPass1')?.value || '',
            fgtsUser2: document.getElementById('fgtsUser2')?.value || '',
            fgtsPass2: document.getElementById('fgtsPass2')?.value || '',
            v8ClientId: document.getElementById('v8ClientId')?.value || '',
            v8Audience: document.getElementById('v8Audience')?.value || '',
            v8Username: document.getElementById('v8Username')?.value || '',
            v8Password: document.getElementById('v8Password')?.value || '',
            lunasApiKey: document.getElementById('lunasApiKey')?.value || '',
            lunasQueueId: parseInt(document.getElementById('lunasQueueId')?.value) || 25,
            lunasStageId: parseInt(document.getElementById('lunasStageId')?.value) || 4
        };

        fetch('/fgts/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                console.log('✅ Configurações salvas com sucesso');
                this.showNotification('✅ Configurações salvas com sucesso', 'success');
                this.closeSidebar();
            } else {
                console.error('❌ Erro ao salvar:', result.message);
                this.showNotification(`❌ Erro: ${result.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('❌ Erro ao salvar configurações:', error);
            this.showNotification('❌ Erro ao salvar configurações', 'error');
        });
    }

    // ===== FUNÇÕES DE TESTE =====
    testConnection(api) {
        console.log(`🧪 Testando conexão ${api}...`);
        
        const button = document.getElementById(`test${api}`);
        if (!button) return;

        const originalText = button.textContent;
        button.textContent = '🔄 Testando...';
        button.disabled = true;

        fetch(`/fgts/test/${api}`, { method: 'POST' })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    button.textContent = '✅ Conectado';
                    button.style.background = '#10b981';
                    this.showNotification(`✅ ${api} conectado com sucesso`, 'success');
                } else {
                    button.textContent = '❌ Erro';
                    button.style.background = '#ef4444';
                    this.showNotification(`❌ Erro na conexão ${api}: ${result.message}`, 'error');
                }
            })
            .catch(error => {
                button.textContent = '❌ Erro';
                button.style.background = '#ef4444';
                this.showNotification(`❌ Erro na conexão ${api}`, 'error');
            })
            .finally(() => {
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '#3b82f6';
                    button.disabled = false;
                }, 3000);
            });
    }

    // ===== FUNÇÕES DE BACKUP =====
    createBackup() {
        console.log('📦 Criando backup...');
        
        const statusDiv = document.getElementById('backupStatus');
        if (statusDiv) statusDiv.textContent = '🔄 Criando backup...';
        
        fetch('/fgts/config/backup', { method: 'POST' })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    const message = `✅ Backup criado: ${new Date().toLocaleString('pt-BR')}`;
                    if (statusDiv) {
                        statusDiv.textContent = message;
                        statusDiv.style.color = '#10b981';
                    }
                    this.showNotification('📦 Backup das configurações criado', 'success');
                } else {
                    const message = `❌ Erro: ${result.message}`;
                    if (statusDiv) {
                        statusDiv.textContent = message;
                        statusDiv.style.color = '#ef4444';
                    }
                    this.showNotification(`❌ Erro ao criar backup: ${result.message}`, 'error');
                }
            })
            .catch(error => {
                const message = '❌ Erro ao criar backup';
                if (statusDiv) {
                    statusDiv.textContent = message;
                    statusDiv.style.color = '#ef4444';
                }
                this.showNotification('❌ Erro ao criar backup', 'error');
            });
    }

    exportConfig() {
        console.log('📤 Exportando configurações...');
        
        const statusDiv = document.getElementById('backupStatus');
        if (statusDiv) statusDiv.textContent = '🔄 Exportando configurações...';
        
        fetch('/fgts/config/export')
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    const message = `✅ Exportado: ${result.file}`;
                    if (statusDiv) {
                        statusDiv.innerHTML = `
                            ${message}<br>
                            <small style="color: #64748b;">
                                📋 Copie as variáveis do arquivo e cole no painel do Render
                            </small>
                        `;
                        statusDiv.style.color = '#10b981';
                    }
                    this.showNotification(`📤 Configurações exportadas para ${result.file}`, 'success');
                } else {
                    const message = `❌ Erro: ${result.message}`;
                    if (statusDiv) {
                        statusDiv.textContent = message;
                        statusDiv.style.color = '#ef4444';
                    }
                    this.showNotification(`❌ Erro ao exportar: ${result.message}`, 'error');
                }
            })
            .catch(error => {
                const message = '❌ Erro ao exportar';
                if (statusDiv) {
                    statusDiv.textContent = message;
                    statusDiv.style.color = '#ef4444';
                }
                this.showNotification('❌ Erro ao exportar configurações', 'error');
            });
    }

    restoreConfig() {
        console.log('🔄 Restaurando configurações...');
        
        const backupData = localStorage.getItem('fgts_config_backup');
        if (!backupData) {
            this.showNotification('❌ Nenhum backup encontrado no localStorage', 'error');
            return;
        }
        
        const statusDiv = document.getElementById('backupStatus');
        if (statusDiv) statusDiv.textContent = '🔄 Restaurando configurações...';
        
        const config = JSON.parse(backupData);
        
        fetch('/fgts/config/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                const message = `✅ Restaurado: ${config.backupDate}`;
                if (statusDiv) {
                    statusDiv.textContent = message;
                    statusDiv.style.color = '#10b981';
                }
                this.showNotification('🔄 Configurações restauradas do backup', 'success');
                this.loadConfig(); // Recarregar configurações
            } else {
                const message = `❌ Erro: ${result.message}`;
                if (statusDiv) {
                    statusDiv.textContent = message;
                    statusDiv.style.color = '#ef4444';
                }
                this.showNotification(`❌ Erro ao restaurar: ${result.message}`, 'error');
            }
        })
        .catch(error => {
            const message = '❌ Erro ao restaurar';
            if (statusDiv) {
                statusDiv.textContent = message;
                statusDiv.style.color = '#ef4444';
            }
            this.showNotification('❌ Erro ao restaurar configurações', 'error');
        });
    }

    // ===== FUNÇÕES DE TESTE =====
    abrirPaginaTeste() {
        console.log('🧪 Abrindo página de teste...');
        window.open('/teste', '_blank');
        this.showNotification('🧪 Página de teste aberta em nova aba', 'info');
    }

    async testarAPIs() {
        console.log('🔌 Testando APIs...');
        const statusDiv = document.getElementById('testeStatus');
        if (statusDiv) statusDiv.textContent = '🔄 Testando APIs...';

        const apis = [
            { nome: 'Status', url: '/fgts/status' },
            { nome: 'Config', url: '/fgts/config' },
            { nome: 'Cache', url: '/fgts/cache/estatisticas' }
        ];

        let resultados = [];
        
        for (const api of apis) {
            try {
                const response = await fetch(api.url);
                const data = await response.json();
                
                if (response.ok) {
                    resultados.push(`✅ ${api.nome}: OK`);
                } else {
                    resultados.push(`❌ ${api.nome}: ${response.status}`);
                }
            } catch (error) {
                resultados.push(`❌ ${api.nome}: ${error.message}`);
            }
        }

        const resultado = resultados.join(' | ');
        if (statusDiv) {
            statusDiv.textContent = resultado;
            statusDiv.style.color = resultados.some(r => r.includes('❌')) ? '#ef4444' : '#10b981';
        }

        this.showNotification(`🔌 Teste de APIs: ${resultados.filter(r => r.includes('✅')).length}/${apis.length} sucessos`, 
            resultados.some(r => r.includes('❌')) ? 'warning' : 'success');
    }

    testarSocket() {
        console.log('📡 Testando Socket.IO...');
        const statusDiv = document.getElementById('testeStatus');
        if (statusDiv) statusDiv.textContent = '🔄 Testando Socket.IO...';

        // Verificar se socket está disponível
        if (typeof io === 'undefined') {
            if (statusDiv) {
                statusDiv.textContent = '❌ Socket.IO não carregado';
                statusDiv.style.color = '#ef4444';
            }
            this.showNotification('❌ Socket.IO não está disponível', 'error');
            return;
        }

        // Testar conexão
        const testSocket = io();
        
        testSocket.on('connect', () => {
            if (statusDiv) {
                statusDiv.textContent = '✅ Socket.IO conectado com sucesso';
                statusDiv.style.color = '#10b981';
            }
            this.showNotification('📡 Socket.IO conectado com sucesso', 'success');
            testSocket.disconnect();
        });

        testSocket.on('connect_error', (error) => {
            if (statusDiv) {
                statusDiv.textContent = `❌ Erro de conexão: ${error.message}`;
                statusDiv.style.color = '#ef4444';
            }
            this.showNotification('❌ Erro ao conectar Socket.IO', 'error');
        });

        // Timeout para teste
        setTimeout(() => {
            if (testSocket.connected) {
                testSocket.disconnect();
            }
        }, 5000);
    }

    // ===== NOTIFICAÇÕES =====
    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        // Cores baseadas no tipo
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remover após 5 segundos
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    // ===== INICIALIZAR EVENT LISTENERS ESPECÍFICOS =====
    setupSpecificEventListeners() {
        // Salvar configurações
        const saveBtn = document.getElementById('saveConfig');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveConfig());
        }

        // Cancelar configurações
        const cancelBtn = document.getElementById('cancelConfig');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeSidebar();
                this.loadConfig(); // Recarregar valores originais
            });
        }

        // Testes de conexão
        ['Fgts', 'V8', 'Lunas'].forEach(api => {
            const testBtn = document.getElementById(`test${api}`);
            if (testBtn) {
                testBtn.addEventListener('click', () => this.testConnection(api));
            }
        });

        // Backup e Restore
        const backupBtn = document.getElementById('backupConfig');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.createBackup());
        }

        const exportBtn = document.getElementById('exportConfig');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportConfig());
        }

        const restoreBtn = document.getElementById('restoreConfig');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => this.restoreConfig());
        }

        // Página de Teste
        const testePaginaBtn = document.getElementById('btnTestePagina');
        if (testePaginaBtn) {
            testePaginaBtn.addEventListener('click', () => this.abrirPaginaTeste());
        }

        const testeApiBtn = document.getElementById('btnTesteAPI');
        if (testeApiBtn) {
            testeApiBtn.addEventListener('click', () => this.testarAPIs());
        }

        const testeSocketBtn = document.getElementById('btnTesteSocket');
        if (testeSocketBtn) {
            testeSocketBtn.addEventListener('click', () => this.testarSocket());
        }

        console.log('✅ Event listeners específicos configurados');
    }
}

// ===== INICIALIZAR MENU =====
// Criar instância global do MenuManager
window.menuManager = new MenuManager();

// Aguardar um pouco e configurar event listeners específicos
setTimeout(() => {
    if (window.menuManager) {
        window.menuManager.setupSpecificEventListeners();
    }
}, 500);

console.log('📋 MenuManager carregado e pronto!');
