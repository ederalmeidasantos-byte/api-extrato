/**
 * Sistema de Gerenciamento de Clientes e Propostas - v20250103240000
 * IDs sequenciais únicos (1, 2, 3, 4...)
 * SEMPRE busca dados do servidor - sem localStorage
 * 
 * Estrutura:
 * - Cliente: ID sequencial único (1, 2, 3...)
 * - Proposta: ID único dentro do cliente
 * - Busca: Por CPF ou NB
 * - Relacionamento: 1 Cliente → N Propostas
 * - Fonte: Sempre servidor (sem cache local)
 */

class ClientManager {
    constructor() {
        this.clients = new Map(); // ID do cliente → dados do cliente
        this.cpfIndex = new Map(); // CPF → ID do cliente
        this.nbIndex = new Map();  // NB → ID do cliente
        this.lastClientId = 0;     // Último ID sequencial usado para clientes
        this.lastProposalId = 0;   // Último ID sequencial usado para propostas
        // Não carrega dados locais - sempre busca do servidor
    }

    /**
     * Inicializar sempre com dados do servidor
     */
    async initialize() {
        await this.loadFromServer();
    }

    /**
     * Sistema de Status para Remarketing e Controle de Funil
     */
    static STATUS_TYPES = {
        // Funil de Conversão
        LINK_ENVIADO: {
            code: 'LINK_ENVIADO',
            label: '👀 Link Enviado',
            description: 'Vendedor enviou link para cliente',
            priority: 1,
            remarketing: false
        },
        VISUALIZOU_OFERTAS: {
            code: 'VISUALIZOU_OFERTAS', 
            label: '🔍 Visualizou Ofertas',
            description: 'Cliente acessou simulador',
            priority: 2,
            remarketing: false
        },
        CLIENTE_ACEITOU: {
            code: 'CLIENTE_ACEITOU',
            label: ' Cliente Aceitou', 
            description: 'Cliente clicou "Digitar/Contratar"',
            priority: 3,
            remarketing: false
        },
        PREENCHENDO_DADOS: {
            code: 'PREENCHENDO_DADOS',
            label: '📝 Preenchendo Dados',
            description: 'Cliente iniciou formulário multi-etapas',
            priority: 4,
            remarketing: true,
            timeoutMinutes: 30
        },
        DADOS_PESSOAIS_OK: {
            code: 'DADOS_PESSOAIS_OK',
            label: '👤 Dados Pessoais OK',
            description: 'Etapa 1 concluída - Nome, CPF, Nascimento',
            priority: 5,
            remarketing: true,
            timeoutMinutes: 20
        },
        BENEFICIO_CONFIRMADO: {
            code: 'BENEFICIO_CONFIRMADO', 
            label: '🏛️ Benefício Confirmado',
            description: 'Etapa 2 concluída - Dados do INSS confirmados',
            priority: 6,
            remarketing: true,
            timeoutMinutes: 15
        },
        ENDERECO_PREENCHIDO: {
            code: 'ENDERECO_PREENCHIDO',
            label: '🏠 Endereço Preenchido',
            description: 'Etapa 3 concluída - Endereço completo',
            priority: 7,
            remarketing: true,
            timeoutMinutes: 10
        },
        DADOS_BANCARIOS_OK: {
            code: 'DADOS_BANCARIOS_OK',
            label: '🏦 Dados Bancários OK', 
            description: 'Etapa 4 concluída - Conta para recebimento',
            priority: 8,
            remarketing: false
        },
        FORMULARIO_COMPLETO: {
            code: 'FORMULARIO_COMPLETO',
            label: ' Formulário Completo',
            description: 'Todos os dados preenchidos - Pronto para digitação',
            priority: 9,
            remarketing: false
        },
        EM_DIGITACAO: {
            code: 'EM_DIGITACAO',
            label: '🚀 Em Digitação',
            description: 'Operador digitando contrato',
            priority: 10,
            remarketing: false
        },
        FINALIZADO: {
            code: 'FINALIZADO',
            label: '🎉 Finalizado',
            description: 'Contrato concluído com sucesso',
            priority: 11,
            remarketing: false,
            final: true
        },

        // Status de Abandono para Remarketing
        ABANDONOU_ETAPA_1: {
            code: 'ABANDONOU_ETAPA_1',
            label: '🔴 Abandonou Etapa 1',
            description: 'Saiu durante preenchimento dos dados pessoais',
            priority: -1,
            remarketing: true,
            remarketingMessage: 'Ei! Seus dados estão quase prontos. Continue em 2 minutos! 💪',
            timeoutMinutes: 60
        },
        ABANDONOU_ETAPA_2: {
            code: 'ABANDONOU_ETAPA_2',
            label: '🔴 Abandonou Etapa 2', 
            description: 'Saiu durante confirmação do benefício',
            priority: -2,
            remarketing: true,
            remarketingMessage: 'Confirmação pendente do seu benefício. Finalize agora! 🏛️',
            timeoutMinutes: 45
        },
        ABANDONOU_ETAPA_3: {
            code: 'ABANDONOU_ETAPA_3',
            label: '🔴 Abandonou Etapa 3',
            description: 'Saiu durante preenchimento do endereço', 
            priority: -3,
            remarketing: true,
            remarketingMessage: 'Falta só o endereço para aprovar seu empréstimo! 🏠',
            timeoutMinutes: 30
        },
        ABANDONOU_ETAPA_4: {
            code: 'ABANDONOU_ETAPA_4',
            label: '🔴 Abandonou Etapa 4',
            description: 'Saiu durante preenchimento dos dados bancários',
            priority: -4, 
            remarketing: true,
            remarketingMessage: 'Última etapa! Dados bancários para receber seu dinheiro! 💰',
            timeoutMinutes: 15
        },
        TIMEOUT_FORMULARIO: {
            code: 'TIMEOUT_FORMULARIO',
            label: '⏱️ Timeout Formulário',
            description: 'Tempo limite do formulário excedido',
            priority: -5,
            remarketing: true,
            remarketingMessage: 'Sua simulação expira em 24h. Finalize agora! ⏰',
            timeoutMinutes: 1440 // 24 horas
        },
        PROPOSTA_EXPIRADA: {
            code: 'PROPOSTA_EXPIRADA',
            label: ' Proposta Expirada',
            description: 'Proposta expirou após 48h sem conclusão',
            priority: -6,
            remarketing: false,
            final: true
        }
    };

    /**
     * Obter informações de um status
     */
    getStatusInfo(statusCode) {
        return ClientManager.STATUS_TYPES[statusCode] || null;
    }

    /**
     * Atualizar status de uma proposta com tracking temporal
     */
    updateProposalStatus(clientId, proposalId, newStatusCode, metadata = {}) {
        const client = this.clients.get(clientId);
        if (!client) {
            throw new Error('Cliente não encontrado');
        }

        const proposal = client.propostas.find(p => p.id === proposalId);
        if (!proposal) {
            throw new Error('Proposta não encontrada');
        }

        const statusInfo = this.getStatusInfo(newStatusCode);
        if (!statusInfo) {
            throw new Error('Status inválido: ' + newStatusCode);
        }

        // Histórico de status
        if (!proposal.statusHistory) {
            proposal.statusHistory = [];
        }

        // Adicionar status atual ao histórico
        if (proposal.status) {
            proposal.statusHistory.push({
                status: proposal.status,
                timestamp: proposal.statusTimestamp || new Date().toISOString(),
                duration: proposal.statusTimestamp ? 
                    Date.now() - new Date(proposal.statusTimestamp).getTime() : 0
            });
        }

        // Atualizar status atual
        proposal.status = newStatusCode;
        proposal.statusTimestamp = new Date().toISOString();
        proposal.statusInfo = statusInfo;
        proposal.metadata = { ...proposal.metadata, ...metadata };

        // Configurar timeout para remarketing se aplicável
        if (statusInfo.remarketing && statusInfo.timeoutMinutes) {
            proposal.remarketingTimeout = new Date(
                Date.now() + (statusInfo.timeoutMinutes * 60 * 1000)
            ).toISOString();
        }

        // Log da mudança de status
        console.log(` Status atualizado: Cliente ${clientId} | Proposta ${proposalId} | ${statusInfo.label}`);

        this.saveToStorage();
        return proposal;
    }

    /**
     * Verificar propostas que precisam de remarketing
     */
    getProposalsForRemarketing() {
        const now = new Date();
        const proposalsForRemarketing = [];

        for (const [clientId, client] of this.clients) {
            for (const proposal of client.proposals) {
                const statusInfo = this.getStatusInfo(proposal.status);
                
                if (statusInfo?.remarketing && proposal.remarketingTimeout) {
                    const timeoutDate = new Date(proposal.remarketingTimeout);
                    
                    if (now >= timeoutDate) {
                        proposalsForRemarketing.push({
                            clientId,
                            client,
                            proposal,
                            statusInfo,
                            overdueDays: Math.floor((now - timeoutDate) / (1000 * 60 * 60 * 24))
                        });
                    }
                }
            }
        }

        return proposalsForRemarketing;
    }

    /**
     * Obter dashboard de funil de conversão
     */
    getConversionFunnelStats() {
        const stats = {};
        const statusCounts = {};

        // Inicializar contadores
        Object.keys(ClientManager.STATUS_TYPES).forEach(status => {
            statusCounts[status] = 0;
        });

        // Contar propostas por status
        for (const [clientId, client] of this.clients) {
            for (const proposal of client.proposals) {
                if (proposal.status && statusCounts.hasOwnProperty(proposal.status)) {
                    statusCounts[proposal.status]++;
                }
            }
        }

        // Calcular conversões
        const totalPropostas = Object.values(statusCounts).reduce((a, b) => a + b, 0);
        
        return {
            totalPropostas,
            statusCounts,
            conversoes: {
                linkParaVisualizacao: this.calculateConversion(statusCounts.LINK_ENVIADO, statusCounts.VISUALIZOU_OFERTAS),
                visualizacaoParaAceite: this.calculateConversion(statusCounts.VISUALIZOU_OFERTAS, statusCounts.CLIENTE_ACEITOU),
                aceiteParaFormulario: this.calculateConversion(statusCounts.CLIENTE_ACEITOU, statusCounts.PREENCHENDO_DADOS),
                formularioParaCompleto: this.calculateConversion(statusCounts.PREENCHENDO_DADOS, statusCounts.FORMULARIO_COMPLETO),
                completoParaFinalizado: this.calculateConversion(statusCounts.FORMULARIO_COMPLETO, statusCounts.FINALIZADO)
            },
            abandono: {
                etapa1: statusCounts.ABANDONOU_ETAPA_1,
                etapa2: statusCounts.ABANDONOU_ETAPA_2, 
                etapa3: statusCounts.ABANDONOU_ETAPA_3,
                etapa4: statusCounts.ABANDONOU_ETAPA_4,
                timeout: statusCounts.TIMEOUT_FORMULARIO
            }
        };
    }

    /**
     * Calcular taxa de conversão entre dois status
     */
    calculateConversion(from, to) {
        if (from === 0) return 0;
        return Math.round((to / from) * 100 * 100) / 100; // 2 casas decimais
    }

    /**
     * Gerar ID sequencial único para cliente (1, 2, 3, 4...)
     */
    generateClientId() {
        // Encontrar o próximo ID sequencial disponível
        let nextId = 1;
        
        // Verificar quais IDs já existem
        const existingIds = new Set();
        for (const client of this.clients.values()) {
            const id = parseInt(client.id);
            if (!isNaN(id)) {
                existingIds.add(id);
            }
        }
        
        // Encontrar o próximo ID sequencial disponível
        while (existingIds.has(nextId)) {
            nextId++;
        }
        
        const clientId = nextId.toString();
        
        // Atualizar contador sequencial
        this.lastClientId = Math.max(this.lastClientId, nextId);
        
        console.log(`🆔 Novo ClientID sequencial gerado: ${clientId} (total: ${this.clients.size + 1})`);
        return clientId;
    }

    /**
     * Gerar ID sequencial único para proposta (1, 2, 3, 4...)
     */
    generateProposalId() {
        // Encontrar o próximo ID sequencial disponível
        let nextId = 1;
        
        // Verificar quais IDs já existem em todas as propostas de todos os clientes
        const existingIds = new Set();
        for (const client of this.clients.values()) {
            if (client.propostas) {
                for (const proposta of client.propostas) {
                    const id = parseInt(proposta.id);
                    if (!isNaN(id)) {
                        existingIds.add(id);
                    }
                }
            }
        }
        
        // Encontrar o próximo ID sequencial disponível
        while (existingIds.has(nextId)) {
            nextId++;
        }
        
        const proposalId = nextId.toString();
        
        // Atualizar contador sequencial
        this.lastProposalId = Math.max(this.lastProposalId, nextId);
        
        console.log(`🆔 Novo ProposalID sequencial gerado: ${proposalId} (total: ${this.getTotalProposals() + 1})`);
        return proposalId;
    }

    /**
     * Obter total de propostas de todos os clientes
     */
    getTotalProposals() {
        let total = 0;
        for (const client of this.clients.values()) {
            if (client.propostas) {
                total += client.propostas.length;
            }
        }
        return total;
    }

    /**
     * Validar se CPF ou NB já existe
     */
    validateUniqueIdentifiers(cpf, nb) {
        const errors = [];
        
        if (cpf && this.cpfIndex.has(cpf)) {
            errors.push(`CPF ${cpf} já está cadastrado para o cliente ${this.cpfIndex.get(cpf)}`);
        }
        
        if (nb && this.nbIndex.has(nb)) {
            errors.push(`NB ${nb} já está cadastrado para o cliente ${this.nbIndex.get(nb)}`);
        }
        
        return errors;
    }

    /**
     * Criar ou atualizar cliente - NOVA LÓGICA INTEGRADA
     * 1. Busca por CPF/NB no servidor
     * 2. Cria oportunidade Kentro se necessário
     * 3. Gera ID único sequencial (SEMPRE NO SERVIDOR)
     * 4. Salva dados completos (extrato + Kentro)
     */
    async createOrUpdateClient(clientData) {
        console.log(`🔍 [CLIENT-MANAGER] Iniciando criação/atualização de cliente:`, {
            nome: clientData.nome,
            cpf: clientData.cpf?.substring(0, 3) + '***',
            nb: clientData.nb?.substring(0, 3) + '***'
        });
        
        try {
            // Preparar dados para envio ao servidor (SEM ID - servidor gera)
            const dadosParaServidor = {
                nome: clientData.nome || '',
                cpf: clientData.cpf || '',
                nb: clientData.nb || '',
                telefone: clientData.telefone || '',
                email: clientData.email || '',
                nascimento: clientData.nascimento || clientData.dataNascimento || '',
                nomeMae: clientData.nomeMae || '',
                endereco: clientData.endereco || {},
                beneficio: clientData.beneficio || {},
                contratos: clientData.contratos || [],
                contratosRMC: clientData.contratosRMC || [],
                contratosRCC: clientData.contratosRCC || [],
                margens: clientData.margens || {},
                kentroId: clientData.kentroId || null
                // NÃO incluir ID - servidor gera automaticamente
            };
            
            console.log(`📤 [CLIENT-MANAGER] Enviando dados para servidor (sem ID):`, {
                nome: dadosParaServidor.nome,
                cpf: dadosParaServidor.cpf?.substring(0, 3) + '***',
                nb: dadosParaServidor.nb?.substring(0, 3) + '***'
            });
            
            // Enviar para servidor com nova lógica
            const response = await fetch('/api/salvar-cliente', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientData: dadosParaServidor
                })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Erro desconhecido ao salvar cliente');
            }
            
            const clientId = result.clientId;
            const kentroId = result.kentroId;
            const acao = result.acao; // 'criado' ou 'atualizado'
            
            console.log(` [CLIENT-MANAGER] Cliente ${acao} com sucesso:`, {
                clientId: clientId,
                kentroId: kentroId,
                acao: acao
            });
            
            // Recarregar dados do servidor para manter sincronização
            await this.loadFromServer();
            
            return clientId;
            
        } catch (error) {
            console.error(' [CLIENT-MANAGER] Erro ao criar/atualizar cliente:', error);
            throw new Error(`Erro ao salvar cliente: ${error.message}`);
        }
    }

    /**
     * Buscar cliente por CPF ou NB
     */
    findClientByIdentifier(identifier) {
        const clientId = this.cpfIndex.get(identifier) || this.nbIndex.get(identifier);
        return clientId ? this.clients.get(clientId) : null;
    }

    /**
     * Buscar cliente por ID
     */
    getClientById(clientId) {
        return this.clients.get(clientId);
    }

    /**
     * Adicionar proposta ao cliente
     */
    addProposalToClient(clientId, proposalData) {
        const client = this.clients.get(clientId);
        if (!client) {
            throw new Error('Cliente não encontrado');
        }

        const proposalId = this.generateProposalId();
        const proposal = {
            id: proposalId,
            clientId,
            ...proposalData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        client.propostas.push(proposal);
        client.updatedAt = new Date().toISOString();
        
        this.saveToStorage();
        return proposalId;
    }

    /**
     * Atualizar proposta
     */
    updateProposal(clientId, proposalId, proposalData) {
        const client = this.clients.get(clientId);
        if (!client) {
            throw new Error('Cliente não encontrado');
        }

        const proposalIndex = client.propostas.findIndex(p => p.id === proposalId);
        if (proposalIndex === -1) {
            throw new Error('Proposta não encontrada');
        }

        client.propostas[proposalIndex] = {
            ...client.propostas[proposalIndex],
            ...proposalData,
            updatedAt: new Date().toISOString()
        };
        
        client.updatedAt = new Date().toISOString();
        this.saveToStorage();
        return client.propostas[proposalIndex];
    }

    /**
     * Remover proposta
     */
    removeProposal(clientId, proposalId) {
        const client = this.clients.get(clientId);
        if (!client) {
            throw new Error('Cliente não encontrado');
        }

        const proposalIndex = client.propostas.findIndex(p => p.id === proposalId);
        if (proposalIndex === -1) {
            throw new Error('Proposta não encontrada');
        }

        client.propostas.splice(proposalIndex, 1);
        client.updatedAt = new Date().toISOString();
        this.saveToStorage();
        return true;
    }

    /**
     * Listar todos os clientes
     */
    getAllClients() {
        return Array.from(this.clients.values());
    }

    /**
     * Listar propostas por status
     */
    getProposalsByStatus(status) {
        const allProposals = [];
        for (const client of this.clients.values()) {
            for (const proposal of client.propostas) {
                if (proposal.status === status) {
                    allProposals.push({
                        ...proposal,
                        cliente: {
                            id: client.id,
                            nome: client.nome,
                            cpf: client.cpf,
                            nb: client.nb
                        }
                    });
                }
            }
        }
        return allProposals;
    }

    /**
     * Buscar propostas por cliente
     */
    getProposalsByClient(clientId) {
        const client = this.clients.get(clientId);
        return client ? client.propostas : [];
    }

    /**
     * Estatísticas gerais
     */
    getStats() {
        const stats = {
            totalClientes: this.clients.size,
            totalPropostas: 0,
            propostasPendentes: 0,
            propostasProcessando: 0,
            propostasConcluidas: 0,
            propostasCanceladas: 0
        };

        for (const client of this.clients.values()) {
            stats.totalPropostas += client.propostas.length;
            
            for (const proposal of client.propostas) {
                switch (proposal.status) {
                    case 'pending':
                        stats.propostasPendentes++;
                        break;
                    case 'processing':
                        stats.propostasProcessando++;
                        break;
                    case 'completed':
                        stats.propostasConcluidas++;
                        break;
                    case 'cancelled':
                        stats.propostasCanceladas++;
                        break;
                }
            }
        }

        return stats;
    }

    /**
     * Salvar no localStorage
     */
    saveToStorage() {
        const data = {
            clients: Array.from(this.clients.entries()),
            cpfIndex: Array.from(this.cpfIndex.entries()),
            nbIndex: Array.from(this.nbIndex.entries()),
            lastClientId: this.lastClientId,
            lastProposalId: this.lastProposalId,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('clientManager', JSON.stringify(data));
    }

    /**
     * Carregar do localStorage
     */
    loadFromStorage() {
        try {
            const data = JSON.parse(localStorage.getItem('clientManager') || '{}');
            
            if (data.clients) {
                this.clients = new Map(data.clients);
            }
            if (data.cpfIndex) {
                this.cpfIndex = new Map(data.cpfIndex);
            }
            if (data.nbIndex) {
                this.nbIndex = new Map(data.nbIndex);
            }
            
            // Restaurar contadores sequenciais
            this.lastClientId = data.lastClientId || 0;
            this.lastProposalId = data.lastProposalId || 0;
            
            // Calcular contadores sequenciais baseado nos IDs existentes
            if (this.clients.size > 0) {
                // Encontrar o maior ID sequencial de cliente
                let maxClientId = 0;
                for (const client of this.clients.values()) {
                    const id = parseInt(client.id);
                    if (!isNaN(id)) {
                        maxClientId = Math.max(maxClientId, id);
                    }
                }
                this.lastClientId = maxClientId;
                console.log(` Contador de clientes restaurado: ${this.lastClientId}`);
            }
            
            // Encontrar o maior ID sequencial de proposta
            let maxProposalId = 0;
            for (const client of this.clients.values()) {
                if (client.propostas) {
                    for (const proposta of client.propostas) {
                        const id = parseInt(proposta.id);
                        if (!isNaN(id)) {
                            maxProposalId = Math.max(maxProposalId, id);
                        }
                    }
                }
            }
            this.lastProposalId = maxProposalId;
            console.log(` Contador de propostas restaurado: ${this.lastProposalId}`);
            
        } catch (error) {
            console.error('Erro ao carregar dados do localStorage:', error);
            this.clients = new Map();
            this.cpfIndex = new Map();
            this.nbIndex = new Map();
            this.lastClientId = 0;
            this.lastProposalId = 0;
        }
    }

    /**
     * Sincronizar dados do servidor para o localStorage
     */
    async sincronizarComServidor() {
        try {
            console.log(' Iniciando sincronização com servidor...');
            
            // Buscar clientes do servidor
            const responseClientes = await fetch('/api/sincronizar-clientes');
            const dataClientes = await responseClientes.json();
            
            if (!dataClientes.success) {
                throw new Error(dataClientes.error || 'Erro ao sincronizar clientes');
            }
            
            console.log(` Recebidos ${dataClientes.clientes.length} clientes do servidor`);
            
            // Limpar dados locais
            this.clearAll();
            
            // Processar clientes do servidor
            for (const clienteServidor of dataClientes.clientes) {
                try {
                    // Garantir estrutura correta
                    const cliente = {
                        id: clienteServidor.id,
                        nome: clienteServidor.nome || clienteServidor.dadosCompletos?.nome || 'Cliente sem nome',
                        cpf: clienteServidor.cpf || clienteServidor.dadosCompletos?.cpf,
                        nb: clienteServidor.nb || clienteServidor.dadosCompletos?.nb,
                        telefone: clienteServidor.telefone || clienteServidor.dadosCompletos?.telefone,
                        email: clienteServidor.email || clienteServidor.dadosCompletos?.email,
                        propostas: clienteServidor.propostas || [],
                        contratos: clienteServidor.contratos || [],
                        createdAt: clienteServidor.createdAt,
                        updatedAt: clienteServidor.updatedAt,
                        dadosCompletos: clienteServidor.dadosCompletos || clienteServidor
                    };
                    
                    // Adicionar ao Map
                    this.clients.set(cliente.id, cliente);
                    
                    // Atualizar índices
                    if (cliente.cpf) {
                        this.cpfIndex.set(cliente.cpf, cliente.id);
                    }
                    if (cliente.nb) {
                        this.nbIndex.set(cliente.nb, cliente.id);
                    }
                    
                    // Atualizar contadores sequenciais
                    const clientId = parseInt(cliente.id);
                    if (!isNaN(clientId)) {
                        this.lastClientId = Math.max(this.lastClientId, clientId);
                    }
                    
                    // Atualizar contador de propostas
                    if (cliente.propostas) {
                        for (const proposta of cliente.propostas) {
                            const propostaId = parseInt(proposta.id);
                            if (!isNaN(propostaId)) {
                                this.lastProposalId = Math.max(this.lastProposalId, propostaId);
                            }
                        }
                    }
                    
                    console.log(` Cliente ${cliente.id}: ${cliente.nome}`);
                    
                } catch (error) {
                    console.error(` Erro ao processar cliente ${clienteServidor.id}:`, error);
                }
            }
            
            // Não salvar no localStorage - sempre buscar do servidor
            
            console.log(` Sincronização concluída: ${this.clients.size} clientes carregados`);
            console.log(` Contadores atualizados: Clientes=${this.lastClientId}, Propostas=${this.lastProposalId}`);
            
            return {
                success: true,
                total: this.clients.size,
                message: `${this.clients.size} clientes sincronizados com sucesso`
            };
            
        } catch (error) {
            console.error(' Erro na sincronização:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Carregar dados sempre do servidor
     */
    async loadFromServer() {
        try {
            console.log(' Carregando dados do servidor...');
            
            const syncResult = await this.sincronizarComServidor();
            
            if (!syncResult.success) {
                console.warn(' Falha ao carregar do servidor, criando dados de teste...');
                this.createTestData();
            } else {
                console.log(` Dados do servidor carregados: ${this.clients.size} clientes`);
            }
            
        } catch (error) {
            console.error(' Erro ao carregar dados do servidor:', error);
            this.createTestData();
        }
    }

    /**
     * Criar dados de teste quando não há dados
     */
    createTestData() {
        console.log(' Criando dados de teste...');
        
        const clientId = this.generateClientId();
        const propostaId = this.generateProposalId();
        
        const clienteTeste = {
            id: clientId,
            nome: 'João Silva Santos',
            cpf: '123.456.789-01',
            nb: '123456789',
            telefone: '(11) 99999-9999',
            email: 'joao.silva@email.com',
            propostas: [{
                id: propostaId,
                status: 'pending',
                valor: 50000,
                parcelas: 84,
                taxa: 2.14,
                banco: 'Banco do Brasil',
                createdAt: new Date().toISOString()
            }],
            contratos: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.clients.set(clientId, clienteTeste);
        this.cpfIndex.set(clienteTeste.cpf, clientId);
        this.nbIndex.set(clienteTeste.nb, clientId);
        
        this.saveToStorage();
        
        console.log(` Cliente teste criado: ${clientId}`);
        console.log(` Proposta teste criada: ${propostaId}`);
    }

    /**
     * Limpar todos os dados
     */
    clearAll() {
        this.clients.clear();
        this.cpfIndex.clear();
        this.nbIndex.clear();
        this.lastClientId = 0;
        this.lastProposalId = 0;
        localStorage.removeItem('clientManager');
    }

    /**
     * Exportar dados
     */
    exportData() {
        return {
            clients: Array.from(this.clients.entries()),
            cpfIndex: Array.from(this.cpfIndex.entries()),
            nbIndex: Array.from(this.nbIndex.entries()),
            lastClientId: this.lastClientId,
            lastProposalId: this.lastProposalId,
            stats: this.getStats(),
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Excluir cliente completamente
     */
    deleteClient(clientId) {
        try {
            const client = this.clients.get(clientId);
            if (!client) {
                console.warn('Cliente não encontrado para exclusão:', clientId);
                return false;
            }
            
            // Remover do Map principal
            this.clients.delete(clientId);
            
            // Remover dos índices
            if (client.cpf) {
                this.cpfIndex.delete(client.cpf);
            }
            if (client.nb) {
                this.nbIndex.delete(client.nb);
            }
            
            // Salvar no storage
            this.saveToStorage();
            
            console.log(` Cliente ${clientId} excluído com sucesso`);
            return true;
            
        } catch (error) {
            console.error(' Erro ao excluir cliente:', error);
            return false;
        }
    }

    /**
     * Importar dados
     */
    importData(data) {
        try {
            if (data.clients) {
                this.clients = new Map(data.clients);
            }
            if (data.cpfIndex) {
                this.cpfIndex = new Map(data.cpfIndex);
            }
            if (data.nbIndex) {
                this.nbIndex = new Map(data.nbIndex);
            }
            if (data.lastClientId !== undefined) {
                this.lastClientId = data.lastClientId;
            }
            if (data.lastProposalId !== undefined) {
                this.lastProposalId = data.lastProposalId;
            }
            this.saveToStorage();
            return true;
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            return false;
        }
    }
}

// Instância global
window.clientManager = new ClientManager();

// Funções de conveniência para uso global
window.findClient = (identifier) => window.clientManager.findClientByIdentifier(identifier);
window.createClient = async (clientData) => await window.clientManager.createOrUpdateClient(clientData);
window.addProposal = (clientId, proposalData) => window.clientManager.addProposalToClient(clientId, proposalData);
window.getClientStats = () => window.clientManager.getStats();
