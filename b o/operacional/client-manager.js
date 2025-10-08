/**
 * Sistema de Gerenciamento de Clientes e Propostas
 * 
 * Estrutura:
 * - Cliente: ID único baseado em CPF ou NB
 * - Proposta: ID único dentro do cliente
 * - Busca: Por CPF ou NB
 * - Relacionamento: 1 Cliente → N Propostas
 */

class ClientManager {
    constructor() {
        this.clients = new Map(); // ID do cliente → dados do cliente
        this.cpfIndex = new Map(); // CPF → ID do cliente
        this.nbIndex = new Map();  // NB → ID do cliente
        this.lastClientId = 0;     // Último ID sequencial usado para clientes
        this.lastProposalId = 0;   // Último ID sequencial usado para propostas
        this.loadFromStorage();
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
            label: '✅ Cliente Aceitou', 
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
            label: '✅ Formulário Completo',
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
            label: '❌ Proposta Expirada',
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
        console.log(`📊 Status atualizado: Cliente ${clientId} | Proposta ${proposalId} | ${statusInfo.label}`);

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
     * Gerar ID sequencial para cliente (1, 2, 3...)
     */
    generateClientId() {
        this.lastClientId++;
        return this.lastClientId.toString();
    }

    /**
     * Gerar ID sequencial para proposta (1, 2, 3...)
     */
    generateProposalId() {
        this.lastProposalId++;
        return this.lastProposalId.toString();
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
     * Criar ou atualizar cliente
     */
    createOrUpdateClient(clientData) {
        const { cpf, nb, nome, telefone, email, nascimento, endereco } = clientData;
        
        // Verificar se já existe cliente com este CPF ou NB
        let clientId = this.cpfIndex.get(cpf) || this.nbIndex.get(nb);
        
        if (clientId) {
            // Atualizar cliente existente
            const client = this.clients.get(clientId);
            client.nome = nome || client.nome;
            client.telefone = telefone || client.telefone;
            client.email = email || client.email;
            client.nascimento = nascimento || client.nascimento;
            client.endereco = endereco || client.endereco;
            client.updatedAt = new Date().toISOString();
            
            console.log(`✅ Cliente ${clientId} atualizado com sucesso`);
            return clientId;
        }
        
        // Validar identificadores únicos apenas para novos clientes
        const errors = this.validateUniqueIdentifiers(cpf, nb);
        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
        
        // Criar novo cliente
        clientId = this.generateClientId();
        const client = {
            id: clientId,
            cpf,
            nb,
            nome,
            telefone,
            email,
            nascimento,
            endereco: endereco || {},
            propostas: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Adicionar aos índices
        this.clients.set(clientId, client);
        this.cpfIndex.set(cpf, clientId);
        this.nbIndex.set(nb, clientId);
        
        console.log(`✅ Novo cliente ${clientId} criado com sucesso`);
        return clientId;
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
            
            // Se não temos contadores salvos, calcular baseado nos IDs existentes
            if (this.lastClientId === 0 && this.clients.size > 0) {
                this.lastClientId = Math.max(...Array.from(this.clients.keys()).map(id => parseInt(id) || 0));
            }
            if (this.lastProposalId === 0) {
                let maxProposalId = 0;
                for (const client of this.clients.values()) {
                    for (const proposal of client.propostas || []) {
                        const proposalId = parseInt(proposal.id) || 0;
                        if (proposalId > maxProposalId) {
                            maxProposalId = proposalId;
                        }
                    }
                }
                this.lastProposalId = maxProposalId;
            }
            
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
            
            console.log(`✅ Cliente ${clientId} excluído com sucesso`);
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao excluir cliente:', error);
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
window.createClient = (clientData) => window.clientManager.createOrUpdateClient(clientData);
window.addProposal = (clientId, proposalData) => window.clientManager.addProposalToClient(clientId, proposalData);
window.getClientStats = () => window.clientManager.getStats();



