/**
 * Sistema de Busca de Clientes
 * Integração com ClientManager e Kentro API
 */

class BuscarCliente {
    constructor() {
        this.clientManager = null;
        this.kentroIntegration = null;
        this.currentSearchParams = null;
        
        this.init();
    }

    /**
     * Inicializar sistema de busca
     */
    async init() {
        console.log('🚀 Inicializando sistema de busca de clientes...');
        
        try {
            // Carregar ClientManager
            await this.loadClientManager();
            
            // Carregar KentroIntegration
            await this.loadKentroIntegration();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Configurar máscaras
            this.setupMasks();
            
            console.log('✅ Sistema de busca inicializado');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema de busca:', error);
            this.showError('Erro ao inicializar sistema. Recarregue a página.');
        }
    }

    /**
     * Carregar ClientManager
     */
    async loadClientManager() {
        if (typeof window.clientManager === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = '/operacional/client-manager.js';
                script.onload = () => {
                    window.clientManager = new ClientManager();
                    resolve();
                };
                script.onerror = () => reject(new Error('Falha ao carregar ClientManager'));
                document.head.appendChild(script);
            });
        }
        this.clientManager = window.clientManager;
        console.log('✅ ClientManager carregado');
    }

    /**
     * Carregar KentroIntegration
     */
    async loadKentroIntegration() {
        if (typeof window.KentroIntegration === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = '/operacional/kentro-integration.js';
                script.onload = () => {
                    window.kentroIntegration = new KentroIntegration();
                    resolve();
                };
                script.onerror = () => reject(new Error('Falha ao carregar KentroIntegration'));
                document.head.appendChild(script);
            });
        }
        this.kentroIntegration = window.kentroIntegration;
        console.log('✅ KentroIntegration carregado');
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        const form = document.getElementById('search-form');
        form.addEventListener('submit', (e) => this.handleSearch(e));
        
        // Busca automática ao digitar (com debounce)
        const cpfInput = document.getElementById('cpf');
        const nbInput = document.getElementById('nb');
        
        let searchTimeout;
        const debouncedSearch = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (cpfInput.value.length >= 11 || nbInput.value.length >= 10) {
                    this.buscarCliente();
                }
            }, 500);
        };
        
        cpfInput.addEventListener('input', debouncedSearch);
        nbInput.addEventListener('input', debouncedSearch);
    }

    /**
     * Configurar máscaras
     */
    setupMasks() {
        const cpfInput = document.getElementById('cpf');
        const nbInput = document.getElementById('nb');
        
        // Máscara CPF
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
        
        // Máscara NB (apenas números)
        nbInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }

    /**
     * Tratar busca
     */
    async handleSearch(e) {
        e.preventDefault();
        await this.buscarCliente();
    }

    /**
     * Buscar cliente
     */
    async buscarCliente() {
        const cpf = document.getElementById('cpf').value.replace(/\D/g, '');
        const nb = document.getElementById('nb').value.replace(/\D/g, '');
        
        if (!cpf && !nb) {
            this.showError('Digite um CPF ou Número do Benefício para buscar.');
            return;
        }
        
        this.currentSearchParams = { cpf, nb };
        
        console.log('🔍 Buscando cliente:', this.currentSearchParams);
        
        this.showLoading(true);
        this.hideMessages();
        
        try {
            // Buscar cliente local
            const clientesLocais = this.buscarClienteLocal(cpf, nb);
            
            if (clientesLocais.length > 0) {
                console.log('✅ Cliente(s) encontrado(s) localmente:', clientesLocais);
                this.exibirResultados(clientesLocais, 'local');
            } else {
                console.log('⚠️ Cliente não encontrado localmente, tentando Kentro...');
                
                // Buscar na Kentro
                const clienteKentro = await this.buscarClienteKentro(cpf, nb);
                
                if (clienteKentro) {
                    console.log('✅ Cliente encontrado na Kentro:', clienteKentro);
                    this.exibirResultados([clienteKentro], 'kentro');
                } else {
                    console.log('⚠️ Cliente não encontrado na Kentro');
                    this.exibirNenhumResultado();
                }
            }
            
        } catch (error) {
            console.error('❌ Erro na busca:', error);
            this.showError('Erro ao buscar cliente. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Buscar cliente local
     */
    buscarClienteLocal(cpf, nb) {
        const clientes = [];
        
        this.clientManager.clients.forEach((cliente, id) => {
            const clienteCpf = cliente.cpf?.replace(/\D/g, '') || '';
            const clienteNb = cliente.nb?.replace(/\D/g, '') || '';
            
            if ((cpf && clienteCpf === cpf) || (nb && clienteNb === nb)) {
                clientes.push({
                    ...cliente,
                    id,
                    origem: 'local'
                });
            }
        });
        
        return clientes;
    }

    /**
     * Buscar cliente na Kentro
     */
    async buscarClienteKentro(cpf, nb) {
        try {
            let resultado = null;
            
            // Buscar por CPF primeiro
            if (cpf) {
                console.log('🔍 Buscando na Kentro por CPF:', cpf);
                resultado = await this.kentroIntegration.buscarPorCpf(cpf);
            }
            
            // Se não encontrou por CPF, tentar por NB
            if (!resultado && nb) {
                console.log('🔍 Buscando na Kentro por NB:', nb);
                resultado = await this.kentroIntegration.buscarPorNb(nb);
            }
            
            if (resultado) {
                return {
                    ...resultado,
                    origem: 'kentro',
                    id: null // Cliente da Kentro ainda não tem ID local
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Erro ao buscar na Kentro:', error);
            return null;
        }
    }

    /**
     * Exibir resultados
     */
    exibirResultados(clientes, origem) {
        const resultsSection = document.getElementById('results-section');
        const resultsContainer = document.getElementById('results-container');
        const kentroSync = document.getElementById('kentro-sync');
        
        resultsContainer.innerHTML = '';
        kentroSync.style.display = 'none';
        
        clientes.forEach(cliente => {
            const clienteCard = this.criarCardCliente(cliente, origem);
            resultsContainer.appendChild(clienteCard);
        });
        
        resultsSection.style.display = 'block';
        
        if (origem === 'kentro') {
            this.showSuccess('Cliente encontrado na Kentro API. Você pode sincronizar os dados localmente.');
        } else {
            this.showSuccess(`${clientes.length} cliente(s) encontrado(s) localmente.`);
        }
    }

    /**
     * Exibir nenhum resultado
     */
    exibirNenhumResultado() {
        const resultsSection = document.getElementById('results-section');
        const resultsContainer = document.getElementById('results-container');
        const kentroSync = document.getElementById('kentro-sync');
        
        resultsContainer.innerHTML = `
            <div class="no-results">
                <i data-feather="user-x" style="width: 48px; height: 48px;"></i>
                <h3>Nenhum cliente encontrado</h3>
                <p>Não foi possível encontrar um cliente com os dados informados.</p>
            </div>
        `;
        
        kentroSync.style.display = 'block';
        resultsSection.style.display = 'block';
        
        feather.replace();
        
        this.showError('Cliente não encontrado nem localmente nem na Kentro.');
    }

    /**
     * Criar card do cliente
     */
    criarCardCliente(cliente, origem) {
        const div = document.createElement('div');
        div.className = 'client-card';
        div.dataset.clientId = cliente.id || '';
        div.dataset.origem = origem;
        
        const status = cliente.ativo !== false ? 'active' : 'inactive';
        const statusText = cliente.ativo !== false ? 'Ativo' : 'Inativo';
        const statusClass = cliente.ativo !== false ? 'status-active' : 'status-inactive';
        
        div.innerHTML = `
            <div class="client-header">
                <div class="client-name">${cliente.nome || 'Nome não informado'}</div>
                <div class="client-status ${statusClass}">${statusText}</div>
            </div>
            
            <div class="client-info">
                <div class="info-item">
                    <div class="info-label">CPF</div>
                    <div class="info-value">${this.formatCpf(cliente.cpf) || 'Não informado'}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Número do Benefício</div>
                    <div class="info-value">${cliente.nb || 'Não informado'}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Telefone</div>
                    <div class="info-value">${this.formatPhone(cliente.telefone) || 'Não informado'}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Email</div>
                    <div class="info-value">${cliente.email || 'Não informado'}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Origem</div>
                    <div class="info-value">${origem === 'local' ? '💾 Local' : '🌐 Kentro API'}</div>
                </div>
                
                ${cliente.kentroId ? `
                <div class="info-item">
                    <div class="info-label">ID Kentro</div>
                    <div class="info-value">${cliente.kentroId}</div>
                </div>
                ` : ''}
            </div>
            
            <div class="client-actions">
                ${origem === 'kentro' ? `
                    <button class="btn btn-success" onclick="buscarCliente.sincronizarCliente('${cliente.kentroId || ''}')">
                        <i data-feather="download" style="width: 16px; height: 16px;"></i>
                        Sincronizar
                    </button>
                ` : `
                    <button class="btn btn-primary" onclick="buscarCliente.editarCliente('${cliente.id}')">
                        <i data-feather="edit" style="width: 16px; height: 16px;"></i>
                        Editar
                    </button>
                    <button class="btn btn-success" onclick="buscarCliente.usarCliente('${cliente.id}')">
                        <i data-feather="check" style="width: 16px; height: 16px;"></i>
                        Usar Cliente
                    </button>
                `}
            </div>
        `;
        
        return div;
    }

    /**
     * Sincronizar cliente da Kentro
     */
    async sincronizarCliente(kentroId) {
        if (!kentroId) {
            this.showError('ID da Kentro não encontrado.');
            return;
        }
        
        this.showLoading(true);
        
        try {
            console.log('🔄 Sincronizando cliente da Kentro:', kentroId);
            
            // Buscar dados completos na Kentro
            const dadosKentro = await this.kentroIntegration.buscarPorId(kentroId);
            
            if (!dadosKentro) {
                this.showError('Não foi possível obter dados da Kentro.');
                return;
            }
            
            // Criar cliente local com dados da Kentro
            const clienteId = this.clientManager.createOrUpdateClient({
                ...dadosKentro,
                kentroId: kentroId,
                sincronizado: true,
                dataUltimaSync: new Date().toISOString()
            });
            
            console.log('✅ Cliente sincronizado:', clienteId);
            this.showSuccess('Cliente sincronizado com sucesso!');
            
            // Reexibir resultados
            setTimeout(() => {
                this.buscarCliente();
            }, 1000);
            
        } catch (error) {
            console.error('❌ Erro ao sincronizar cliente:', error);
            this.showError('Erro ao sincronizar cliente. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Editar cliente
     */
    editarCliente(clientId) {
        const url = `/operacional/formulario-cliente.html?clientId=${clientId}&modo=edicao`;
        window.open(url, '_blank');
    }

    /**
     * Usar cliente (retornar para fluxo principal)
     */
    usarCliente(clientId) {
        // Salvar cliente selecionado no localStorage para uso posterior
        localStorage.setItem('clienteSelecionado', clientId);
        
        this.showSuccess('Cliente selecionado! Você pode agora criar uma proposta para este cliente.');
        
        // Destacar cliente selecionado
        document.querySelectorAll('.client-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-client-id="${clientId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }

    /**
     * Sincronizar com Kentro (busca geral)
     */
    async sincronizarComKentro() {
        if (!this.currentSearchParams) {
            this.showError('Nenhum parâmetro de busca disponível.');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const { cpf, nb } = this.currentSearchParams;
            
            console.log('🔄 Tentando sincronização manual com Kentro...');
            
            // Tentar buscar novamente na Kentro com mais detalhes
            let dadosKentro = null;
            
            if (cpf) {
                dadosKentro = await this.kentroIntegration.buscarDetalhado(cpf, 'cpf');
            }
            
            if (!dadosKentro && nb) {
                dadosKentro = await this.kentroIntegration.buscarDetalhado(nb, 'nb');
            }
            
            if (dadosKentro) {
                // Criar cliente local
                const clienteId = this.clientManager.createOrUpdateClient({
                    ...dadosKentro,
                    sincronizado: true,
                    dataUltimaSync: new Date().toISOString()
                });
                
                console.log('✅ Cliente criado da Kentro:', clienteId);
                this.showSuccess('Cliente criado com dados da Kentro!');
                
                // Reexibir resultados
                setTimeout(() => {
                    this.buscarCliente();
                }, 1000);
            } else {
                this.showError('Cliente não encontrado na Kentro API.');
            }
            
        } catch (error) {
            console.error('❌ Erro na sincronização:', error);
            this.showError('Erro ao sincronizar com Kentro. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Criar cliente manual
     */
    criarClienteManual() {
        const { cpf, nb } = this.currentSearchParams || {};
        
        let url = '/operacional/formulario-cliente.html?modo=novo';
        
        if (cpf) url += `&cpf=${cpf}`;
        if (nb) url += `&nb=${nb}`;
        
        window.open(url, '_blank');
    }

    /**
     * Formatação de CPF
     */
    formatCpf(cpf) {
        if (!cpf) return '';
        const cleaned = cpf.replace(/\D/g, '');
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    /**
     * Formatação de telefone
     */
    formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    }

    /**
     * Mostrar loading
     */
    showLoading(show) {
        const loading = document.getElementById('loading');
        const resultsSection = document.getElementById('results-section');
        
        if (show) {
            loading.style.display = 'block';
            resultsSection.style.display = 'none';
        } else {
            loading.style.display = 'none';
        }
    }

    /**
     * Mostrar erro
     */
    showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    /**
     * Mostrar sucesso
     */
    showSuccess(message) {
        const successDiv = document.getElementById('success-message');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }

    /**
     * Ocultar mensagens
     */
    hideMessages() {
        document.getElementById('error-message').style.display = 'none';
        document.getElementById('success-message').style.display = 'none';
    }
}

// Instanciar quando a página carrega
let buscarCliente;
document.addEventListener('DOMContentLoaded', () => {
    buscarCliente = new BuscarCliente();
});

// Funções globais para os botões
window.sincronizarComKentro = () => buscarCliente.sincronizarComKentro();
window.criarClienteManual = () => buscarCliente.criarClienteManual();
