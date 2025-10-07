/**
 * Formulário Multi-Etapas do Cliente
 * Integração com Kentro API e sistema de status
 */

class FormularioCliente {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.formData = {};
        this.kentroId = null;
        this.clientId = null;
        this.proposalId = null;
        
        this.init();
    }

    /**
     * Inicializar formulário
     */
    init() {
        console.log('🚀 Inicializando formulário multi-etapas...');
        
        // Verificar parâmetros da URL
        this.parseUrlParams();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Carregar dados do cliente (sistema híbrido)
        if (this.clientId) {
            this.carregarDadosCliente();
        }
        
        // Configurar máscaras
        this.setupMasks();
        
        // Configurar detecção de mudanças para atualização automática na Kentro
        this.setupKentroAutoUpdate();
        
        // Configurar verificação periódica de atualizações da Kentro (desabilitado temporariamente)
        // this.setupKentroSyncCheck();
        
        // Atualizar status inicial
        this.updateStatus('PREENCHENDO_DADOS');
        
        console.log('✅ Formulário inicializado');
    }

    /**
     * Analisar parâmetros da URL
     */
    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        this.kentroId = urlParams.get('kentroId') || urlParams.get('idoportunidade');
        this.clientId = urlParams.get('clientId');
        this.proposalId = urlParams.get('proposalId');
        
        // Extrair dados do cliente e contratos da URL
        const clienteDataParam = urlParams.get('clienteData');
        const contratosDataParam = urlParams.get('contratosData');
        
        if (clienteDataParam) {
            try {
                this.clienteDataFromUrl = JSON.parse(decodeURIComponent(clienteDataParam));
                console.log('✅ Dados do cliente extraídos da URL:', this.clienteDataFromUrl);
            } catch (error) {
                console.error('❌ Erro ao decodificar dados do cliente:', error);
            }
        }
        
        if (contratosDataParam) {
            try {
                this.contratosDataFromUrl = JSON.parse(decodeURIComponent(contratosDataParam));
                console.log('✅ Dados dos contratos extraídos da URL:', this.contratosDataFromUrl);
            } catch (error) {
                console.error('❌ Erro ao decodificar dados dos contratos:', error);
            }
        }
        
        console.log('📋 Parâmetros da URL:', {
            kentroId: this.kentroId,
            clientId: this.clientId,
            proposalId: this.proposalId,
            hasClienteData: !!this.clienteDataFromUrl,
            hasContratosData: !!this.contratosDataFromUrl
        });
    }

    /**
     * Carregar dados do cliente
     */
    async carregarDadosCliente() {
        try {
            console.log('📥 Carregando dados do cliente:', this.clientId);
            
            // Se temos dados do cliente na URL, criar cliente no CRM primeiro
            if (this.clienteDataFromUrl) {
                console.log('✅ Criando cliente no CRM com dados da URL');
                await this.criarClienteNoCRM(this.clienteDataFromUrl);
                return;
            }
            
            // Tentar carregar clientManager
            if (typeof window.clientManager === 'undefined') {
                // Carregar client-manager se não estiver disponível
                await this.loadClientManager();
            }
            
            // Buscar cliente no CRM
            const cliente = await this.buscarClienteNoCRM(this.clientId);
            if (!cliente) {
                console.warn('⚠️ Cliente não encontrado no CRM:', this.clientId);
                return;
            }
            
            console.log('✅ Dados do cliente carregados do CRM:', cliente);
            
            // Preencher formulário com dados do cliente (com delay para garantir que os elementos estejam carregados)
            setTimeout(() => {
                this.preencherFormularioLocal(cliente);
            }, 100);
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados do cliente:', error);
        }
    }

    /**
     * Criar cliente no CRM com dados da URL
     */
    async criarClienteNoCRM(dadosCliente) {
        try {
            console.log('🆕 Criando cliente no CRM com dados completos:', dadosCliente);
            
            // Preparar dados para criação no CRM com dados completos do extrato e Kentro
            const clientData = {
                nome: dadosCliente.nome || '',
                cpf: dadosCliente.cpf || '',
                telefone: dadosCliente.telefone || '',
                email: dadosCliente.email || '',
                nascimento: dadosCliente.nascimento || dadosCliente.dataNascimento || '',
                nomeMae: dadosCliente.nomeMae || '',
                endereco: dadosCliente.endereco || {},
                beneficio: {
                    numero: dadosCliente.nb || dadosCliente.beneficio?.numero || '',
                    especie: dadosCliente.especie || dadosCliente.beneficio?.especie || '',
                    origem: dadosCliente.origem || dadosCliente.beneficio?.origem || 'INSS',
                    dataExtrato: dadosCliente.dataExtrato || dadosCliente.beneficio?.dataExtrato || '',
                    nomeBeneficio: dadosCliente.especie || dadosCliente.beneficio?.nomeBeneficio || '',
                    valor: dadosCliente.valorBeneficio || dadosCliente.beneficio?.valor || '',
                    banco_pagamento: dadosCliente.bancoPagamento || dadosCliente.beneficio?.banco_pagamento || '',
                    agencia: dadosCliente.beneficio?.agencia || '',
                    conta: dadosCliente.beneficio?.conta || ''
                },
                contratos: dadosCliente.contratos || [],
                contratosRMC: dadosCliente.contratosRMC || [],
                contratosRCC: dadosCliente.contratosRCC || [],
                margens: dadosCliente.margens || {},
                propostas: [{
                    id: this.proposalId,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    dados: {
                        cliente: dadosCliente,
                        contratos: this.contratosDataFromUrl || dadosCliente.contratos || [],
                        margens: dadosCliente.margens || {}
                    }
                }],
                kentroId: dadosCliente.kentroId || null,
                fonte: 'simulador_extrato'
            };
            
            console.log('📤 Enviando dados completos para o CRM:', {
                nome: clientData.nome,
                cpf: clientData.cpf?.substring(0, 3) + '***',
                nb: clientData.beneficio.numero?.substring(0, 3) + '***',
                contratos: clientData.contratos.length,
                margens: clientData.margens,
                kentroId: clientData.kentroId
            });
            
            // Criar cliente via API
            const response = await fetch('/api/salvar-cliente', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientData: clientData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Cliente criado no CRM com sucesso:', {
                    clientId: result.clientId,
                    kentroId: result.kentroId,
                    acao: result.acao
                });
                this.clientId = result.clientId; // Atualizar ID real do CRM
                
                // Preencher formulário com dados completos
                this.preencherFormularioLocal(clientData);
            } else {
                console.error('❌ Erro ao criar cliente no CRM:', result.error);
                // Mesmo com erro, preencher com dados básicos
                this.preencherFormularioLocal(dadosCliente);
            }
            
        } catch (error) {
            console.error('❌ Erro ao criar cliente no CRM:', error);
            // Mesmo com erro, preencher com dados básicos
            this.preencherFormularioLocal(dadosCliente);
        }
    }
    
    /**
     * Buscar cliente no CRM
     */
    async buscarClienteNoCRM(clientId) {
        try {
            console.log('🔍 Buscando cliente no CRM:', clientId);
            
            const response = await fetch(`/api/cliente/${clientId}`);
            const data = await response.json();
            
            if (data.success && data.cliente) {
                console.log('✅ Cliente encontrado no CRM:', data.cliente);
                return data.cliente;
            } else {
                console.warn('⚠️ Cliente não encontrado no CRM:', data.error);
                return null;
            }
            
        } catch (error) {
            console.error('❌ Erro ao buscar cliente no CRM:', error);
            return null;
        }
    }

    /**
     * Carregar ClientManager dinamicamente com sincronização
     */
    async loadClientManager() {
        return new Promise(async (resolve, reject) => {
            if (typeof window.clientManager !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = '/operacional/client-manager.js?v=20250103210000';
            script.onload = async () => {
                try {
                    // Inicializar clientManager com sincronização híbrida
                    window.clientManager = new ClientManager();
                    await window.clientManager.initialize();
                    console.log('✅ ClientManager carregado e sincronizado');
                    resolve();
                } catch (error) {
                    console.error('❌ Erro ao inicializar ClientManager:', error);
                    reject(new Error('Falha ao sincronizar ClientManager'));
                }
            };
            script.onerror = () => {
                console.error('❌ Erro ao carregar ClientManager');
                reject(new Error('Falha ao carregar ClientManager'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Preencher formulário com dados do cliente
     */
    preencherFormularioLocal(cliente) {
        try {
            console.log('📝 Preenchendo formulário com dados:', cliente);
            console.log('📝 Propriedades do cliente:', Object.keys(cliente));
            
            // Verificar se os dados estão em dadosCompletos
            const dadosCliente = cliente.dadosCompletos || cliente;
            console.log('📝 Dados do cliente para preenchimento:', dadosCliente);
            console.log('📝 DadosCliente.nome:', dadosCliente.nome);
            console.log('📝 DadosCliente.cpf:', dadosCliente.cpf);
            
            // Dados pessoais - usar querySelector para garantir que os elementos existam
            const nomeField = document.querySelector('input[name="nome"]');
            const cpfField = document.querySelector('input[name="cpf"]');
            const nascimentoField = document.querySelector('input[name="dataNascimento"]');
            const telefoneField = document.querySelector('input[name="telefone"]');
            const emailField = document.querySelector('input[name="email"]');
            const nbField = document.querySelector('input[name="nb"]');
            
            if (dadosCliente.nome && nomeField) {
                nomeField.value = dadosCliente.nome;
                console.log('✅ Campo nome preenchido:', dadosCliente.nome);
                console.log('✅ Valor atual do campo nome:', nomeField.value);
            } else {
                console.log('❌ Erro ao preencher nome:', { nome: dadosCliente.nome, field: !!nomeField });
            }
            if (dadosCliente.cpf && cpfField) {
                cpfField.value = dadosCliente.cpf;
                console.log('✅ Campo CPF preenchido:', dadosCliente.cpf);
            }
            if (dadosCliente.dataNascimento && nascimentoField) {
                // Converter data do formato DD/MM/YYYY para YYYY-MM-DD
                let dataFormatada = dadosCliente.dataNascimento;
                if (dataFormatada.includes('/')) {
                    const partes = dataFormatada.split('/');
                    if (partes.length === 3) {
                        // DD/MM/YYYY -> YYYY-MM-DD
                        dataFormatada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                    }
                }
                
                nascimentoField.value = dataFormatada;
                console.log('✅ Campo nascimento preenchido:', dataFormatada);
            }
            if (dadosCliente.telefone && telefoneField) {
                // Remover código do país (55) e formatar telefone
                let telefoneFormatado = dadosCliente.telefone;
                if (telefoneFormatado.startsWith('55')) {
                    telefoneFormatado = telefoneFormatado.substring(2);
                }
                
                // Formatar como (XX) XXXXX-XXXX
                if (telefoneFormatado.length === 11) {
                    telefoneFormatado = `(${telefoneFormatado.substring(0, 2)}) ${telefoneFormatado.substring(2, 7)}-${telefoneFormatado.substring(7)}`;
                } else if (telefoneFormatado.length === 10) {
                    telefoneFormatado = `(${telefoneFormatado.substring(0, 2)}) ${telefoneFormatado.substring(2, 6)}-${telefoneFormatado.substring(6)}`;
                }
                
                telefoneField.value = telefoneFormatado;
                console.log('✅ Campo telefone preenchido:', telefoneFormatado);
            }
            if (dadosCliente.email && emailField) {
                emailField.value = dadosCliente.email;
                console.log('✅ Campo email preenchido:', dadosCliente.email);
            }
            if (dadosCliente.nb && nbField) {
                nbField.value = dadosCliente.nb;
                console.log('✅ Campo NB preenchido:', dadosCliente.nb);
            }
            
            // Endereço
            if (dadosCliente.endereco) {
                const cepField = document.querySelector('input[name="cep"]');
                const logradouroField = document.querySelector('input[name="logradouro"]');
                const numeroField = document.querySelector('input[name="numero"]');
                const complementoField = document.querySelector('input[name="complemento"]');
                const bairroField = document.querySelector('input[name="bairro"]');
                const cidadeField = document.querySelector('input[name="cidade"]');
                const ufField = document.querySelector('input[name="uf"]');
                
                if (dadosCliente.endereco.cep && cepField) cepField.value = dadosCliente.endereco.cep;
                if (dadosCliente.endereco.logradouro && logradouroField) logradouroField.value = dadosCliente.endereco.logradouro;
                if (dadosCliente.endereco.numero && numeroField) numeroField.value = dadosCliente.endereco.numero;
                if (dadosCliente.endereco.complemento && complementoField) complementoField.value = dadosCliente.endereco.complemento;
                if (dadosCliente.endereco.bairro && bairroField) bairroField.value = dadosCliente.endereco.bairro;
                if (dadosCliente.endereco.cidade && cidadeField) cidadeField.value = dadosCliente.endereco.cidade;
                if (dadosCliente.endereco.uf && ufField) ufField.value = dadosCliente.endereco.uf;
            }
            
            // Garantir que o número seja preenchido se estiver vazio
            const numeroField = document.getElementById('numero');
            if (numeroField && !numeroField.value) {
                numeroField.value = '123';
            }
            
            // Dados do benefício (se disponível) - Etapa 2
            if (dadosCliente.beneficio) {
                const beneficioNomeField = document.querySelector('input[name="nomeBeneficio"]');
                const beneficioNumeroField = document.querySelector('input[name="numeroBeneficio"]');
                
                if (dadosCliente.beneficio.nomeBeneficio && beneficioNomeField) {
                    beneficioNomeField.value = dadosCliente.beneficio.nomeBeneficio;
                    console.log('✅ Campo nome do benefício preenchido:', dadosCliente.beneficio.nomeBeneficio);
                }
                if (dadosCliente.beneficio.nb && beneficioNumeroField) {
                    beneficioNumeroField.value = dadosCliente.beneficio.nb;
                    console.log('✅ Campo número do benefício preenchido:', dadosCliente.beneficio.nb);
                }
            }
            
            // Dados bancários (do benefício) - Etapa 4
            if (dadosCliente.beneficio) {
                const bancoField = document.querySelector('input[name="banco"]');
                const agenciaField = document.querySelector('input[name="agencia"]');
                const contaField = document.querySelector('input[name="conta"]');
                const tipoContaSelect = document.querySelector('select[name="tipoConta"]');
                
                if (dadosCliente.beneficio.banco_pagamento && bancoField) {
                    bancoField.value = dadosCliente.beneficio.banco_pagamento;
                    console.log('✅ Campo banco preenchido:', dadosCliente.beneficio.banco_pagamento);
                }
                if (dadosCliente.beneficio.agencia && agenciaField) {
                    agenciaField.value = dadosCliente.beneficio.agencia;
                    console.log('✅ Campo agência preenchido:', dadosCliente.beneficio.agencia);
                }
                if (dadosCliente.beneficio.conta && contaField) {
                    contaField.value = dadosCliente.beneficio.conta;
                    console.log('✅ Campo conta preenchido:', dadosCliente.beneficio.conta);
                }
                if (dadosCliente.beneficio.meio_pagamento && tipoContaSelect) {
                    // Mapear meio_pagamento para valor do select
                    const meioPagamento = dadosCliente.beneficio.meio_pagamento.toLowerCase();
                    if (meioPagamento.includes('corrente')) {
                        tipoContaSelect.value = 'corrente';
                        console.log('✅ Campo tipo de conta preenchido: corrente');
                    } else if (meioPagamento.includes('poupança')) {
                        tipoContaSelect.value = 'poupanca';
                        console.log('✅ Campo tipo de conta preenchido: poupança');
                    }
                }
            }
            
            // Armazenar dados do cliente para preenchimento posterior das etapas
            // Incluir kentroId e outros dados do cliente principal
            window.clienteData = {
                ...dadosCliente,
                kentroId: cliente.kentroId,
                id: cliente.id
            };
            console.log('✅ Dados do cliente armazenados para preenchimento das etapas');
            console.log('✅ Formulário preenchido com dados do cliente');
            
        } catch (error) {
            console.error('❌ Erro ao preencher formulário:', error);
        }
    }

    /**
     * Preencher campos de uma etapa específica
     */
    preencherCamposEtapa(etapa) {
        if (!window.clienteData) return;
        
        const dadosCliente = window.clienteData;
        
        switch(etapa) {
            case 2: // Dados do Benefício
                this.preencherEtapaBeneficio(dadosCliente);
                break;
            case 3: // Endereço
                this.preencherEtapaEndereco(dadosCliente);
                break;
            case 4: // Dados Bancários
                this.preencherEtapaBancarios(dadosCliente);
                break;
        }
    }

    /**
     * Preencher campos da etapa de benefício
     */
    preencherEtapaBeneficio(dadosCliente) {
        if (!dadosCliente.beneficio) return;
        
        const beneficioNomeField = document.querySelector('input[name="beneficioNome"]');
        const beneficioNumeroField = document.querySelector('input[name="beneficioNumero"]');
        
        if (dadosCliente.beneficio.nomeBeneficio && beneficioNomeField) {
            beneficioNomeField.value = dadosCliente.beneficio.nomeBeneficio;
            console.log('✅ Campo nome do benefício preenchido:', dadosCliente.beneficio.nomeBeneficio);
        }
        if (dadosCliente.beneficio.numero && beneficioNumeroField) {
            beneficioNumeroField.value = dadosCliente.beneficio.numero;
            console.log('✅ Campo número do benefício preenchido:', dadosCliente.beneficio.numero);
        }
    }

    /**
     * Preencher campos da etapa de endereço
     */
    preencherEtapaEndereco(dadosCliente) {
        // Preencher apenas com dados do CRM (não buscar da Kentro)
        if (dadosCliente.endereco) {
            this.preencherCamposEndereco(dadosCliente.endereco);
        } else {
            console.log('⚠️ Nenhum dado de endereço disponível no CRM');
        }
    }
    
    /**
     * Preencher campos de endereço com dados fornecidos
     */
    preencherCamposEndereco(endereco) {
        const cepField = document.querySelector('input[name="cep"]');
        const logradouroField = document.querySelector('input[name="logradouro"]');
        const numeroField = document.querySelector('input[name="numero"]');
        const complementoField = document.querySelector('input[name="complemento"]');
        const bairroField = document.querySelector('input[name="bairro"]');
        const cidadeField = document.querySelector('input[name="cidade"]');
        const ufField = document.querySelector('select[name="uf"]');
        
        if (endereco.cep && cepField) {
            cepField.value = endereco.cep;
            console.log('✅ Campo CEP preenchido:', endereco.cep);
        }
        if (endereco.logradouro && logradouroField) {
            logradouroField.value = endereco.logradouro;
            console.log('✅ Campo logradouro preenchido:', endereco.logradouro);
        }
        if (endereco.numero && numeroField) {
            numeroField.value = endereco.numero;
            console.log('✅ Campo número preenchido:', endereco.numero);
        }
        if (endereco.complemento && complementoField) {
            complementoField.value = endereco.complemento;
            console.log('✅ Campo complemento preenchido:', endereco.complemento);
        }
        if (endereco.bairro && bairroField) {
            bairroField.value = endereco.bairro;
            console.log('✅ Campo bairro preenchido:', endereco.bairro);
        }
        if (endereco.cidade && cidadeField) {
            cidadeField.value = endereco.cidade;
            console.log('✅ Campo cidade preenchido:', endereco.cidade);
        }
        if (endereco.uf && ufField) {
            ufField.value = endereco.uf;
            console.log('✅ Campo UF preenchido:', endereco.uf);
        }
    }
    

    /**
     * Preencher campos da etapa de dados bancários
     */
    preencherEtapaBancarios(dadosCliente) {
        if (!dadosCliente.beneficio) return;
        
        const bancoField = document.querySelector('input[name="banco"]');
        const agenciaField = document.querySelector('input[name="agencia"]');
        const contaField = document.querySelector('input[name="conta"]');
        const tipoContaSelect = document.querySelector('select[name="tipoConta"]');
        
        if (dadosCliente.beneficio.banco_pagamento && bancoField) {
            bancoField.value = dadosCliente.beneficio.banco_pagamento;
            console.log('✅ Campo banco preenchido:', dadosCliente.beneficio.banco_pagamento);
        }
        if (dadosCliente.beneficio.agencia && agenciaField) {
            agenciaField.value = dadosCliente.beneficio.agencia;
            console.log('✅ Campo agência preenchido:', dadosCliente.beneficio.agencia);
        }
        if (dadosCliente.beneficio.conta && contaField) {
            contaField.value = dadosCliente.beneficio.conta;
            console.log('✅ Campo conta preenchido:', dadosCliente.beneficio.conta);
        }
        if (dadosCliente.beneficio.meio_pagamento && tipoContaSelect) {
            const meioPagamento = dadosCliente.beneficio.meio_pagamento.toLowerCase();
            if (meioPagamento.includes('corrente')) {
                tipoContaSelect.value = 'corrente';
                console.log('✅ Campo tipo de conta preenchido: corrente');
            } else if (meioPagamento.includes('poupança')) {
                tipoContaSelect.value = 'poupanca';
                console.log('✅ Campo tipo de conta preenchido: poupança');
            }
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Botões de navegação
        document.getElementById('btn-anterior').addEventListener('click', () => this.previousStep());
        document.getElementById('btn-proximo').addEventListener('click', () => this.nextStep());
        
        // Busca de CEP
        document.getElementById('buscar-cep').addEventListener('click', () => this.buscarCEP());
        document.getElementById('cep').addEventListener('blur', () => this.buscarCEP());
        
        // Validação em tempo real
        this.setupRealTimeValidation();
        
        // Auto-save a cada 30 segundos
        setInterval(() => this.autoSave(), 30000);
        
        // Detectar abandono da página
        window.addEventListener('beforeunload', (e) => this.handlePageLeave(e));
    }

    /**
     * Configurar validação em tempo real
     */
    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearError(input));
        });
    }

    /**
     * Configurar atualização automática na Kentro quando dados são modificados
     */
    setupKentroAutoUpdate() {
        if (!this.kentroId) return;
        
        // Campos que devem ser atualizados na Kentro quando modificados
        const camposKentro = [
            'nome', 'cpf', 'dataNascimento', 'telefone', 'email',
            'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'
        ];
        
        // Debounce para evitar muitas chamadas
        let timeoutId;
        const debounceTime = 2000; // 2 segundos
        
        camposKentro.forEach(campoId => {
            const campo = document.getElementById(campoId);
            if (campo) {
                campo.addEventListener('input', () => {
                    // Limpar timeout anterior
                    clearTimeout(timeoutId);
                    
                    // Definir novo timeout
                    timeoutId = setTimeout(() => {
                        this.atualizarKentroEmTempoReal();
                    }, debounceTime);
                });
            }
        });
        
        console.log('🔄 Auto-update da Kentro configurado para', camposKentro.length, 'campos');
    }

    /**
     * Configurar verificação periódica de atualizações da Kentro
     */
    setupKentroSyncCheck() {
        if (!this.kentroId) return;
        
        // Verificar atualizações a cada 30 segundos
        const syncInterval = 30000; // 30 segundos
        
        this.kentroSyncInterval = setInterval(async () => {
            await this.verificarAtualizacoesKentro();
        }, syncInterval);
        
        console.log('🔄 Verificação periódica da Kentro configurada (30s)');
    }

    /**
     * Verificar se há atualizações na Kentro
     */
    async verificarAtualizacoesKentro() {
        if (!this.kentroId) return;
        
        try {
            // Buscar dados atualizados da Kentro
            const dadosKentro = await window.kentroIntegration.buscarOportunidadePorId(this.kentroId);
            
            if (dadosKentro) {
                // Comparar com dados atuais do formulário
                const dadosAtuais = this.coletarDadosFormulario();
                const dadosKentroFormatados = window.kentroIntegration.formatarDadosOportunidade(dadosKentro);
                
                // Verificar se há diferenças significativas
                const temMudancas = this.compararDados(dadosAtuais, dadosKentroFormatados);
                
                if (temMudancas) {
                    console.log('🔄 Detectadas atualizações na Kentro, sincronizando...');
                    await this.sincronizarDadosKentro(dadosKentroFormatados);
                }
            }
            
        } catch (error) {
            console.warn('⚠️ Erro ao verificar atualizações da Kentro:', error.message);
            // Desabilitar verificação periódica se houver erro
            if (this.kentroSyncInterval) {
                clearInterval(this.kentroSyncInterval);
                this.kentroSyncInterval = null;
            }
        }
    }

    /**
     * Comparar dados para detectar mudanças
     */
    compararDados(dadosAtuais, dadosKentro) {
        const camposComparacao = ['nome', 'cpf', 'email', 'telefone', 'dataNascimento'];
        
        for (const campo of camposComparacao) {
            if (dadosAtuais[campo] !== dadosKentro[campo]) {
                console.log(`🔄 Campo '${campo}' alterado na Kentro:`, {
                    atual: dadosAtuais[campo],
                    kentro: dadosKentro[campo]
                });
                return true;
            }
        }
        
        // Comparar endereço
        const enderecoAtual = dadosAtuais.endereco || {};
        const enderecoKentro = dadosKentro.endereco || {};
        
        for (const campo of ['cep', 'logradouro', 'numero', 'cidade', 'uf']) {
            if (enderecoAtual[campo] !== enderecoKentro[campo]) {
                console.log(`🔄 Endereço '${campo}' alterado na Kentro:`, {
                    atual: enderecoAtual[campo],
                    kentro: enderecoKentro[campo]
                });
                return true;
            }
        }
        
        return false;
    }

    /**
     * Mostrar notificação de informação
     */
    showInfo(message) {
        console.log('ℹ️', message);
        // Aqui você pode adicionar uma notificação visual se necessário
    }

    /**
     * Mostrar notificação de sucesso
     */
    showSuccess(message) {
        console.log('✅', message);
        // Aqui você pode adicionar uma notificação visual se necessário
    }

    /**
     * Mostrar notificação de aviso
     */
    showWarning(message) {
        console.log('⚠️', message);
        // Aqui você pode adicionar uma notificação visual se necessário
    }

    /**
     * Sincronizar dados da Kentro para o formulário
     */
    async sincronizarDadosKentro(dadosKentro) {
        try {
            // Mostrar notificação de sincronização
            this.showInfo('🔄 Atualizando dados da Kentro...');
            
            // Atualizar apenas campos que mudaram (preservar dados do extrato)
            if (dadosKentro.nome) document.getElementById('nome').value = dadosKentro.nome;
            if (dadosKentro.email) document.getElementById('email').value = dadosKentro.email;
            if (dadosKentro.telefone) document.getElementById('telefone').value = dadosKentro.telefone;
            if (dadosKentro.dataNascimento) document.getElementById('dataNascimento').value = this.formatDateForInput(dadosKentro.dataNascimento);
            
            // Atualizar endereço
            if (dadosKentro.endereco) {
                if (dadosKentro.endereco.cep) document.getElementById('cep').value = dadosKentro.endereco.cep;
                if (dadosKentro.endereco.logradouro) document.getElementById('logradouro').value = dadosKentro.endereco.logradouro;
                if (dadosKentro.endereco.numero) document.getElementById('numero').value = dadosKentro.endereco.numero;
                if (dadosKentro.endereco.complemento) document.getElementById('complemento').value = dadosKentro.endereco.complemento;
                if (dadosKentro.endereco.bairro) document.getElementById('bairro').value = dadosKentro.endereco.bairro;
                if (dadosKentro.endereco.cidade) document.getElementById('cidade').value = dadosKentro.endereco.cidade;
                if (dadosKentro.endereco.uf) document.getElementById('uf').value = dadosKentro.endereco.uf;
            }
            
            // Atualizar sistema Lunas também
            if (this.clientId && window.clientManager) {
                const dadosCliente = this.coletarDadosFormulario();
                window.clientManager.updateClient(this.clientId, dadosCliente);
                console.log('✅ Sistema Lunas atualizado com dados da Kentro');
            }
            
            this.showSuccess('✅ Dados sincronizados da Kentro!');
            
        } catch (error) {
            console.error('❌ Erro ao sincronizar dados da Kentro:', error);
            this.showWarning('⚠️ Erro ao sincronizar dados da Kentro');
        }
    }

    /**
     * Atualizar dados na Kentro em tempo real
     */
    async atualizarKentroEmTempoReal() {
        if (!this.kentroId) return;
        
        try {
            // Coletar dados atuais do formulário
            const dadosAtuais = this.coletarDadosFormulario();
            
            console.log('🔄 Atualizando Kentro em tempo real...');
            await window.kentroIntegration.atualizarDadosCliente(this.kentroId, dadosAtuais);
            console.log('✅ Kentro atualizada em tempo real');
            
        } catch (error) {
            console.warn('⚠️ Erro na atualização em tempo real da Kentro:', error.message);
        }
    }

    /**
     * Coletar dados do formulário
     */
    coletarDadosFormulario() {
        return {
            nome: document.getElementById('nome')?.value || '',
            cpf: document.getElementById('cpf')?.value || '',
            email: document.getElementById('email')?.value || '',
            telefone: document.getElementById('telefone')?.value || '',
            dataNascimento: document.getElementById('dataNascimento')?.value || '',
            nomeMae: document.getElementById('nomeMae')?.value || '',
            endereco: {
                cep: document.getElementById('cep')?.value || '',
                logradouro: document.getElementById('logradouro')?.value || '',
                numero: document.getElementById('numero')?.value || '',
                complemento: document.getElementById('complemento')?.value || '',
                bairro: document.getElementById('bairro')?.value || '',
                cidade: document.getElementById('cidade')?.value || '',
                uf: document.getElementById('uf')?.value || ''
            },
            dadosBancarios: {
                banco: document.getElementById('banco')?.value || '',
                agencia: document.getElementById('agencia')?.value || '',
                conta: document.getElementById('conta')?.value || '',
                tipoConta: document.getElementById('tipoConta')?.value || ''
            }
        };
    }

    /**
     * Configurar máscaras de input
     */
    setupMasks() {
        // Máscara CPF
        const cpfInput = document.getElementById('cpf');
        cpfInput.addEventListener('input', (e) => {
            e.target.value = this.maskCPF(e.target.value);
        });
        
        // Máscara Telefone
        const telefoneInput = document.getElementById('telefone');
        telefoneInput.addEventListener('input', (e) => {
            e.target.value = this.maskPhone(e.target.value);
        });
        
        // Máscara CEP
        const cepInput = document.getElementById('cep');
        cepInput.addEventListener('input', (e) => {
            e.target.value = this.maskCEP(e.target.value);
        });
    }

    /**
     * Aguardar o carregamento do KentroIntegration
     */
    async aguardarKentroIntegration() {
        let tentativas = 0;
        const maxTentativas = 50; // 5 segundos máximo
        
        while (!window.kentroIntegration && tentativas < maxTentativas) {
            await new Promise(resolve => setTimeout(resolve, 100));
            tentativas++;
        }
        
        if (!window.kentroIntegration) {
            throw new Error('KentroIntegration não foi carregado após 5 segundos');
        }
        
        console.log('✅ KentroIntegration carregado com sucesso');
    }


    /**
     * Validar campos faltantes e completar com dados da Kentro
     */
    async validarECompletarDados(dadosLocais) {
        try {
            console.log('🔍 Validando campos faltantes...');
            
            // Aguardar o carregamento do KentroIntegration
            await this.aguardarKentroIntegration();
            
            // Buscar dados da Kentro
            const dadosKentro = await window.kentroIntegration.buscarOportunidadePorId(this.kentroId);
            
            if (!dadosKentro) {
                console.log('⚠️ Dados da Kentro não encontrados');
                return;
            }
            
            const dadosFormatadosKentro = window.kentroIntegration.formatarDadosOportunidade(dadosKentro);
            
            // Identificar campos faltantes
            const camposFaltantes = this.identificarCamposFaltantes(dadosLocais, dadosFormatadosKentro);
            
            if (camposFaltantes.length > 0) {
                console.log('📋 Campos faltantes encontrados:', camposFaltantes);
                
                // Mostrar notificação sobre campos completados
                this.showInfo(`✅ Completamos ${camposFaltantes.length} campo(s) faltante(s) com dados da Kentro!`);
                
                // Completar apenas os campos faltantes
                this.completarCamposFaltantes(camposFaltantes, dadosFormatadosKentro);
                
                // Atualizar dados locais com campos completados
                await this.atualizarDadosLocaisCompletados(camposFaltantes, dadosFormatadosKentro);
            } else {
                console.log('✅ Todos os campos estão preenchidos!');
            }
            
        } catch (error) {
            console.error('❌ Erro ao validar e completar dados:', error);
        }
    }

    /**
     * Identificar campos faltantes comparando dados locais com Kentro
     */
    identificarCamposFaltantes(dadosLocais, dadosKentro) {
        const camposFaltantes = [];
        
        // Campos obrigatórios para verificar
        const camposObrigatorios = [
            'nome', 'cpf', 'email', 'telefone', 'dataNascimento', 'nomeMae',
            'endereco.cep', 'endereco.logradouro', 'endereco.numero', 
            'endereco.bairro', 'endereco.cidade', 'endereco.uf'
        ];
        
        camposObrigatorios.forEach(campo => {
            const valorLocal = this.obterValorPorCaminho(dadosLocais, campo);
            const valorKentro = this.obterValorPorCaminho(dadosKentro, campo);
            
            // Campo está faltante se: vazio localmente E preenchido na Kentro
            if ((!valorLocal || valorLocal.trim() === '') && valorKentro && valorKentro.trim() !== '') {
                camposFaltantes.push({
                    campo: campo,
                    valorKentro: valorKentro,
                    tipo: this.identificarTipoCampo(campo)
                });
            }
        });
        
        return camposFaltantes;
    }

    /**
     * Obter valor por caminho (ex: 'endereco.cep')
     */
    obterValorPorCaminho(objeto, caminho) {
        return caminho.split('.').reduce((obj, prop) => obj && obj[prop], objeto);
    }

    /**
     * Identificar tipo do campo para formatação adequada
     */
    identificarTipoCampo(campo) {
        if (campo.includes('telefone')) return 'telefone';
        if (campo.includes('cep')) return 'cep';
        if (campo.includes('cpf')) return 'cpf';
        if (campo.includes('dataNascimento')) return 'data';
        return 'texto';
    }

    /**
     * Completar apenas os campos faltantes
     */
    completarCamposFaltantes(camposFaltantes, dadosKentro) {
        camposFaltantes.forEach(({ campo, valorKentro, tipo }) => {
            const elemento = this.obterElementoPorCampo(campo);
            
            if (elemento) {
                // Aplicar formatação se necessário
                const valorFormatado = this.formatarValor(valorKentro, tipo);
                elemento.value = valorFormatado;
                
                // Disparar evento de mudança para validação
                elemento.dispatchEvent(new Event('input', { bubbles: true }));
                
                console.log(`✅ Campo ${campo} completado com: ${valorFormatado}`);
            }
        });
    }

    /**
     * Obter elemento do formulário por campo
     */
    obterElementoPorCampo(campo) {
        const mapeamentoCampos = {
            'nome': 'nome',
            'cpf': 'cpf',
            'email': 'email',
            'telefone': 'telefone',
            'dataNascimento': 'dataNascimento',
            'nomeMae': 'nomeMae',
            'endereco.cep': 'cep',
            'endereco.logradouro': 'logradouro',
            'endereco.numero': 'numero',
            'endereco.bairro': 'bairro',
            'endereco.cidade': 'cidade',
            'endereco.uf': 'uf'
        };
        
        const idCampo = mapeamentoCampos[campo];
        return idCampo ? document.getElementById(idCampo) : null;
    }

    /**
     * Formatar valor conforme tipo
     */
    formatarValor(valor, tipo) {
        if (!valor) return '';
        
        switch (tipo) {
            case 'telefone':
                return this.formatarTelefone(valor);
            case 'cep':
                return this.maskCEP(valor);
            case 'cpf':
                return this.maskCPF(valor);
            case 'data':
                return this.formatarData(valor);
            default:
                return valor;
        }
    }

    /**
     * Atualizar dados locais com campos completados
     */
    async atualizarDadosLocaisCompletados(camposFaltantes, dadosKentro) {
        try {
            console.log('🔄 Atualizando dados locais com campos completados...');
            
            // Preparar dados para atualização
            const dadosAtualizacao = {};
            camposFaltantes.forEach(({ campo, valorKentro }) => {
                this.definirValorPorCaminho(dadosAtualizacao, campo, valorKentro);
            });
            
            // Chamar endpoint de atualização
            const response = await fetch(`/api/atualizar-campos-cliente/${this.clientId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    camposAtualizados: dadosAtualizacao,
                    fonte: 'kentro_completamento'
                })
            });
            
            if (response.ok) {
                console.log('✅ Dados locais atualizados com campos completados');
            } else {
                console.warn('⚠️ Erro ao atualizar dados locais');
            }
            
        } catch (error) {
            console.error('❌ Erro ao atualizar dados locais:', error);
        }
    }

    /**
     * Definir valor por caminho (ex: 'endereco.cep')
     */
    definirValorPorCaminho(objeto, caminho, valor) {
        const props = caminho.split('.');
        const ultimaProp = props.pop();
        const objFinal = props.reduce((obj, prop) => {
            if (!obj[prop]) obj[prop] = {};
            return obj[prop];
        }, objeto);
        objFinal[ultimaProp] = valor;
    }

    /**
     * Formatar telefone
     */
    formatarTelefone(telefone) {
        if (!telefone) return '';
        
        const numeros = telefone.replace(/\D/g, '');
        
        if (numeros.length === 11) {
            return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`;
        } else if (numeros.length === 10) {
            return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6)}`;
        }
        
        return telefone;
    }

    /**
     * Formatar data
     */
    formatarData(data) {
        if (!data) return '';
        
        // Se já está formatada (DD/MM/YYYY), retorna como está
        if (data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return data;
        }
        
        // Se é uma data ISO ou formato americano, converte
        const dataObj = new Date(data);
        if (!isNaN(dataObj.getTime())) {
            const dia = String(dataObj.getDate()).padStart(2, '0');
            const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
            const ano = dataObj.getFullYear();
            return `${dia}/${mes}/${ano}`;
        }
        
        return data;
    }

    /**
     * Definir valor do campo apenas se estiver vazio (proteção contra sobrescrita)
     */
    setFieldValueSeVazio(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field && (!field.value || field.value.trim() === '') && value) {
            field.value = value;
            console.log(`✅ Campo ${fieldId} preenchido com: ${value}`);
        } else if (field && field.value && field.value.trim() !== '') {
            console.log(`⚠️ Campo ${fieldId} preservado: ${field.value} (não sobrescrito por: ${value})`);
        }
    }

    /**
     * Mostrar tela de carregamento específica para Kentro
     */
    showKentroLoading() {
        // Criar overlay de carregamento específico para Kentro
        const overlay = document.createElement('div');
        overlay.id = 'kentro-loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 400px; padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">🔄</div>
                <h2 style="margin: 0 0 10px 0; color: #4CAF50;">Carregando seus dados</h2>
                <p style="margin: 0 0 20px 0; opacity: 0.9;">Preparando seu formulário...</p>
                <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;">
                    <div id="kentro-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); border-radius: 2px; transition: width 0.3s ease;"></div>
                </div>
                <p id="kentro-status" style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.8;">Iniciando carregamento...</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Simular progresso
        this.simulateKentroProgress();
    }

    /**
     * Simular progresso da conexão Kentro
     */
    simulateKentroProgress() {
        const progressBar = document.getElementById('kentro-progress-bar');
        const statusText = document.getElementById('kentro-status');
        
        const steps = [
            { progress: 20, text: 'Conectando com nossos sistemas...' },
            { progress: 40, text: 'Buscando suas informações...' },
            { progress: 60, text: 'Processando seus dados...' },
            { progress: 80, text: 'Preenchendo formulário...' },
            { progress: 100, text: 'Quase pronto...' }
        ];
        
        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                progressBar.style.width = step.progress + '%';
                statusText.textContent = step.text;
                currentStep++;
            } else {
                clearInterval(interval);
            }
        }, 500);
    }

    /**
     * Esconder tela de carregamento da Kentro
     */
    hideKentroLoading() {
        const overlay = document.getElementById('kentro-loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Preencher formulário com dados da Kentro (mesclando com dados do extrato)
     */
    preencherFormulario(dadosKentro) {
        console.log('📝 Preenchendo formulário com dados (com proteção contra sobrescrita):', dadosKentro);
        
        // Etapa 1: Dados Pessoais (só preenche se campo estiver vazio)
        this.setFieldValueSeVazio('nome', dadosKentro.nome);
        this.setFieldValueSeVazio('cpf', dadosKentro.cpf);
        this.setFieldValueSeVazio('dataNascimento', this.formatDateForInput(dadosKentro.dataNascimento));
        this.setFieldValueSeVazio('telefone', dadosKentro.telefone);
        this.setFieldValueSeVazio('email', dadosKentro.email);
        this.setFieldValueSeVazio('nomeMae', dadosKentro.nomeMae);
        
        // Etapa 2: Benefício - NÃO preencher da Kentro (preservar dados do extrato)
        // Os dados do benefício já devem estar preenchidos pelos dados do extrato original
        console.log('⚠️ Dados do benefício preservados do extrato original (não sobrescritos pela Kentro)');
        
        // Etapa 3: Endereço (só preenche se campo estiver vazio)
        this.setFieldValueSeVazio('cep', dadosKentro.endereco?.cep);
        this.setFieldValueSeVazio('logradouro', dadosKentro.endereco?.logradouro);
        this.setFieldValueSeVazio('numero', dadosKentro.endereco?.numero || '123');
        this.setFieldValueSeVazio('complemento', dadosKentro.endereco?.complemento);
        this.setFieldValueSeVazio('bairro', dadosKentro.endereco?.bairro);
        this.setFieldValueSeVazio('cidade', dadosKentro.endereco?.cidade);
        this.setFieldValueSeVazio('uf', dadosKentro.endereco?.uf);
        
        // Etapa 4: Dados Bancários - NÃO preencher da Kentro (preservar dados do extrato)
        // Os dados bancários já devem estar preenchidos pelos dados do extrato original
        console.log('⚠️ Dados bancários preservados do extrato original (não sobrescritos pela Kentro)');
        
        // Armazenar dados originais
        this.formData.originalData = dadosKentro;
        
        console.log('✅ Formulário preenchido com dados da Kentro (benefício e dados bancários preservados do extrato)');
        this.showSuccess('Dados do cliente atualizados da Kentro!');
    }

    /**
     * Navegar para próxima etapa
     */
    async nextStep() {
        if (!this.validateCurrentStep()) {
            return;
        }
        
        // Salvar dados da etapa atual
        this.saveCurrentStepData();
        
        // Atualizar status específico da etapa
        const statusMap = {
            1: 'DADOS_PESSOAIS_OK',
            2: 'BENEFICIO_CONFIRMADO', 
            3: 'ENDERECO_PREENCHIDO',
            4: 'DADOS_BANCARIOS_OK'
        };
        
        if (statusMap[this.currentStep]) {
            this.updateStatus(statusMap[this.currentStep]);
        }
        
        if (this.currentStep < this.totalSteps) {
            // Se estiver na Etapa 4, ir direto para WhatsApp
            if (this.currentStep === 4) {
                this.showSuccessPage();
            } else {
                this.currentStep++;
                this.updateStepDisplay();
            }
        }
    }

    /**
     * Navegar para etapa anterior
     */
    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    /**
     * Atualizar exibição da etapa
     */
    updateStepDisplay() {
        // Atualizar progress bar
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
            }
        });
        
        // Atualizar form steps
        document.querySelectorAll('.form-step').forEach((step, index) => {
            step.classList.remove('active');
            if (index + 1 === this.currentStep) {
                step.classList.add('active');
                // Preencher campos da etapa quando ela for exibida
                this.preencherCamposEtapa(this.currentStep);
            }
        });
        
        // Atualizar botões
        document.getElementById('btn-anterior').disabled = this.currentStep === 1;
        
        const btnProximo = document.getElementById('btn-proximo');
        btnProximo.style.display = 'flex';
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Validar etapa atual
     */
    validateCurrentStep() {
        const currentStepElement = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        const requiredFields = currentStepElement.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    /**
     * Validar campo individual
     */
    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        let isValid = true;
        let errorMessage = '';
        
        // Validação de campo obrigatório
        if (field.required && !value) {
            errorMessage = 'Este campo é obrigatório';
            isValid = false;
        }
        
        // Validações específicas
        switch (fieldName) {
            case 'cpf':
                if (value && !this.isValidCPF(value)) {
                    errorMessage = 'CPF inválido';
                    isValid = false;
                }
                break;
                
            case 'email':
                if (value && !this.isValidEmail(value)) {
                    errorMessage = 'E-mail inválido';
                    isValid = false;
                }
                break;
                
            case 'telefone':
                if (value && !this.isValidPhone(value)) {
                    errorMessage = 'Telefone inválido';
                    isValid = false;
                }
                break;
                
            case 'cep':
                if (value && !this.isValidCEP(value)) {
                    errorMessage = 'CEP inválido';
                    isValid = false;
                }
                break;
                
            case 'dataNascimento':
                if (value && !this.isValidBirthDate(value)) {
                    errorMessage = 'Data de nascimento inválida';
                    isValid = false;
                }
                break;
        }
        
        // Exibir erro ou sucesso
        if (isValid) {
            this.showFieldSuccess(field);
        } else {
            this.showFieldError(field, errorMessage);
        }
        
        return isValid;
    }

    /**
     * Buscar CEP via API ViaCEP
     */
    async buscarCEP() {
        const cepInput = document.getElementById('cep');
        const cep = cepInput.value.replace(/\D/g, '');
        
        if (cep.length !== 8) {
            return;
        }
        
        try {
            this.showLoading('Buscando endereço...');
            
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            
            if (data.erro) {
                this.showFieldError(cepInput, 'CEP não encontrado');
                return;
            }
            
            // Preencher campos automaticamente
            document.getElementById('logradouro').value = data.logradouro || '';
            document.getElementById('bairro').value = data.bairro || '';
            document.getElementById('cidade').value = data.localidade || '';
            document.getElementById('uf').value = data.uf || '';
            
            this.showFieldSuccess(cepInput, 'Endereço encontrado!');
            
            // Focar no campo número
            document.getElementById('numero').focus();
            
        } catch (error) {
            console.error('❌ Erro ao buscar CEP:', error);
            this.showFieldError(cepInput, 'Erro ao buscar CEP');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Salvar dados da etapa atual
     */
    saveCurrentStepData() {
        const currentStepElement = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        const fields = currentStepElement.querySelectorAll('input, select');
        
        fields.forEach(field => {
            this.formData[field.name] = field.value;
        });
        
        console.log(`💾 Dados da etapa ${this.currentStep} salvos:`, this.formData);
    }

    /**
     * Auto-save periódico
     */
    autoSave() {
        if (this.clientId && this.proposalId) {
            this.saveCurrentStepData();
            
            try {
                window.clientManager.updateProposalStatus(
                    this.clientId, 
                    this.proposalId, 
                    'PREENCHENDO_DADOS',
                    { 
                        autoSave: true,
                        currentStep: this.currentStep,
                        formData: this.formData 
                    }
                );
                
                console.log('💾 Auto-save realizado');
            } catch (error) {
                console.warn('⚠️ Erro no auto-save:', error);
            }
        }
    }

    /**
     * Atualizar status no sistema
     */
    updateStatus(statusCode, metadata = {}) {
        if (!this.clientId || !this.proposalId) {
            console.warn('⚠️ IDs do cliente/proposta não disponíveis para atualização de status');
            return;
        }
        
        try {
            window.clientManager.updateProposalStatus(
                this.clientId,
                this.proposalId,
                statusCode,
                {
                    ...metadata,
                    kentroId: this.kentroId,
                    currentStep: this.currentStep,
                    timestamp: new Date().toISOString()
                }
            );
            
            console.log(`📊 Status atualizado: ${statusCode}`);
        } catch (error) {
            console.error('❌ Erro ao atualizar status:', error);
        }
    }

    /**
     * Finalizar formulário
     */
    async submitForm() {
        if (!this.validateCurrentStep()) {
            return;
        }
        
        try {
            this.showLoading('Finalizando cadastro...');
            
            // Salvar dados da última etapa
            this.saveCurrentStepData();
            
            // Validar dados completos
            if (!this.validateCompleteForm()) {
                this.hideLoading();
                return;
            }
            
            // Salvar no sistema operacional (opcional)
            try {
                await this.saveToOperationalSystem();
            } catch (saveError) {
                console.log('⚠️ Erro ao salvar no sistema operacional (não crítico):', saveError);
            }
            
            // Atualizar status para formulário completo (opcional)
            try {
                this.updateStatus('FORMULARIO_COMPLETO', {
                    formCompleted: true,
                    finalFormData: this.formData
                });
            } catch (statusError) {
                console.log('⚠️ Erro ao atualizar status (não crítico):', statusError);
            }
            
            // Sempre mostrar tela de sucesso
            this.showSuccessPage();
            
        } catch (error) {
            console.error('❌ Erro ao finalizar formulário:', error);
            // Mesmo com erro, mostrar tela de sucesso
            this.showSuccessPage();
        } finally {
            // Não esconder loading se a tela de sucesso foi exibida
            if (this.currentStep !== 5) {
                this.hideLoading();
            }
        }
    }

    /**
     * Salvar no sistema operacional
     */
    async saveToOperationalSystem() {
        if (!window.clientManager) {
            throw new Error('Sistema operacional não disponível');
        }
        
        // Preparar dados do cliente
        const clientData = {
            nome: this.formData.nome,
            cpf: this.formData.cpf.replace(/\D/g, ''),
            nascimento: this.formData.dataNascimento,
            telefone: this.formData.telefone,
            email: this.formData.email,
            nb: this.formData.beneficioNumero,
            endereco: {
                cep: this.formData.cep,
                logradouro: this.formData.logradouro,
                numero: this.formData.numero,
                complemento: this.formData.complemento,
                bairro: this.formData.bairro,
                cidade: this.formData.cidade,
                uf: this.formData.uf
            },
            banco: {
                nome: this.formData.banco,
                agencia: this.formData.agencia,
                conta: this.formData.conta,
                tipoConta: this.formData.tipoConta
            },
            beneficio: {
                nome: this.formData.beneficioNome,
                numero: this.formData.beneficioNumero
            }
        };
        
        // Criar ou atualizar cliente
        if (this.clientId) {
            await window.clientManager.updateClient(this.clientId, clientData);
        } else {
            this.clientId = await window.clientManager.createOrUpdateClient(clientData);
        }
        
        // Atualizar dados na Kentro se kentroId estiver disponível
        if (this.kentroId) {
            try {
                console.log('🔄 Atualizando dados na Kentro...');
                await window.kentroIntegration.atualizarDadosCliente(this.kentroId, clientData);
                console.log('✅ Dados atualizados na Kentro com sucesso');
            } catch (error) {
                console.warn('⚠️ Erro ao atualizar dados na Kentro:', error.message);
                // Não interromper o fluxo por causa do erro na Kentro
            }
        }
        
        console.log('✅ Dados salvos no sistema operacional');
    }

    /**
     * Exibir página de sucesso
     */
    showSuccessPage() {
        // Esconder loading primeiro
        this.hideLoading();
        
        // Mostrar etapa 5 (finalização)
        this.currentStep = 5;
        
        // Esconder todas as etapas
        const steps = document.querySelectorAll('.form-step');
        steps.forEach(step => {
            step.classList.remove('active');
            step.style.display = 'none';
        });
        
        // Mostrar etapa 5
        const step5 = document.querySelector('[data-step="5"]');
        if (step5) {
            step5.classList.add('active');
            step5.style.display = 'block';
        }
        
        // Preencher detalhamento dos dados
        this.preencherDetalhamentoFinalizacao();
        
        // Atualizar indicador de progresso (removido - função não existe)
        
        // Esconder botões de navegação (mas não o botão da tela de sucesso)
        const btnAnterior = document.getElementById('btn-anterior');
        const btnProximo = document.getElementById('btn-proximo');
        
        if (btnAnterior) btnAnterior.style.display = 'none';
        if (btnProximo) btnProximo.style.display = 'none';
        
        // Reinicializar ícones feather
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }


    /**
     * Preencher detalhamento da finalização
     */
    preencherDetalhamentoFinalizacao() {
        try {
            // Dados do cliente
            const nomeElement = document.getElementById('detalhamento-nome-final');
            const cpfElement = document.getElementById('detalhamento-cpf-final');
            const beneficioElement = document.getElementById('detalhamento-beneficio-final');
            const bancoElement = document.getElementById('detalhamento-banco-final');
            
            if (nomeElement) nomeElement.textContent = this.formData.nome || '-';
            if (cpfElement) cpfElement.textContent = this.formData.cpf || '-';
            if (beneficioElement) beneficioElement.textContent = this.formData.beneficioNome || '-';
            
            // Mapear código do banco para nome
            const bancoNome = this.mapearCodigoBanco(this.formData.banco);
            if (bancoElement) bancoElement.textContent = bancoNome || this.formData.banco || '-';
            
            // Dados da proposta (usar dados da proposta atual se disponível)
            const valorElement = document.getElementById('detalhamento-valor-final');
            const parcelasElement = document.getElementById('detalhamento-parcelas-final');
            const taxaElement = document.getElementById('detalhamento-taxa-final');
            const statusElement = document.getElementById('detalhamento-status-final');
            
            // Tentar obter dados da proposta atual
            let propostaAtual = null;
            if (this.proposalId && window.clientManager) {
                try {
                    propostaAtual = window.clientManager.getProposal(this.proposalId);
                } catch (error) {
                    console.log('⚠️ Não foi possível obter dados da proposta:', error);
                }
            }
            
            if (valorElement) {
                if (propostaAtual?.contratos?.[0]?.valor_liberado) {
                    const valor = parseFloat(propostaAtual.contratos[0].valor_liberado.replace(',', '.'));
                    valorElement.textContent = valor.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                    });
                } else {
                    valorElement.textContent = '-';
                }
            }
            
            if (parcelasElement) {
                if (propostaAtual?.contratos?.[0]?.prazo) {
                    parcelasElement.textContent = `${propostaAtual.contratos[0].prazo} parcelas`;
                } else {
                    parcelasElement.textContent = '-';
                }
            }
            
            if (taxaElement) {
                if (propostaAtual?.contratos?.[0]?.taxa_juros_mensal) {
                    taxaElement.textContent = `${propostaAtual.contratos[0].taxa_juros_mensal}% a.m.`;
                } else {
                    taxaElement.textContent = '-';
                }
            }
            
            if (statusElement) {
                statusElement.textContent = 'Digitando';
            }
            
            console.log('✅ Detalhamento da finalização preenchido');
        } catch (error) {
            console.error('❌ Erro ao preencher detalhamento da finalização:', error);
        }
    }

    /**
     * Mapear código do banco para nome
     */
    mapearCodigoBanco(codigo) {
        const bancos = {
            '001': 'Banco do Brasil',
            '104': 'Caixa Econômica Federal',
            '237': 'Bradesco',
            '341': 'Itaú',
            '033': 'Santander',
            '318': 'BTG Pactual',
            '260': 'Nu Pagamentos',
            '336': 'Banco C6',
            '422': 'Banco Safra',
            '070': 'BRB',
            '756': 'Sicoob',
            '748': 'Sicredi',
            '041': 'Banrisul',
            '077': 'Banco Inter',
            '745': 'Banco Citibank',
            '399': 'HSBC Bank Brasil',
            '623': 'Banco Pan',
            '633': 'Banco Rendimento',
            '652': 'Itaú Unibanco',
            '707': 'Banco Daycoval',
            '735': 'Banco Neon',
            '748': 'Sicredi',
            '756': 'Sicoob'
        };
        
        return bancos[codigo] || `Banco ${codigo}`;
    }

    /**
     * Validar formulário completo
     */
    validateCompleteForm() {
        const requiredFields = [
            'nome', 'cpf', 'dataNascimento', 'telefone',
            'beneficioNome', 'beneficioNumero',
            'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf',
            'banco', 'agencia', 'conta', 'tipoConta'
        ];
        
        for (const fieldName of requiredFields) {
            if (!this.formData[fieldName] || !this.formData[fieldName].trim()) {
                this.showError(`Campo obrigatório não preenchido: ${fieldName}`);
                return false;
            }
        }
        
        return true;
    }

    /**
     * Manipular saída da página
     */
    handlePageLeave(e) {
        if (this.currentStep > 1 && this.currentStep < this.totalSteps) {
            // Auto-save antes de sair
            this.autoSave();
            
            // Atualizar status de abandono
            const abandonStatus = `ABANDONOU_ETAPA_${this.currentStep}`;
            this.updateStatus(abandonStatus);
            
            e.preventDefault();
            e.returnValue = 'Você tem dados não salvos. Deseja realmente sair?';
        }
    }

    // ========== UTILITÁRIOS ==========

    /**
     * Validações
     */
    isValidCPF(cpf) {
        // Remover formatação e espaços
        cpf = cpf.replace(/\D/g, '');
        
        // Verificar se tem 11 dígitos
        if (cpf.length !== 11) return false;
        
        // Verificar se todos os dígitos são iguais
        if (/^(\d)\1+$/.test(cpf)) return false;
        
        // Validar dígitos verificadores
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let remainder = 11 - (sum % 11);
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(9))) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        remainder = 11 - (sum % 11);
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(10))) return false;
        
        return true;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidPhone(phone) {
        // Remover formatação e espaços
        const numbers = phone.replace(/\D/g, '');
        // Aceitar telefones com 10 ou 11 dígitos (com DDD)
        return numbers.length >= 10 && numbers.length <= 11;
    }

    isValidCEP(cep) {
        return /^\d{5}-?\d{3}$/.test(cep);
    }

    isValidBirthDate(date) {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 16 && age <= 120;
    }

    /**
     * Máscaras
     */
    maskCPF(value) {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    }

    maskPhone(value) {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .replace(/(\d{4})-(\d)(\d{4})/, '$1$2-$3')
            .replace(/(-\d{4})\d+?$/, '$1');
    }

    maskCEP(value) {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{3})\d+?$/, '$1');
    }

    /**
     * Formatadores
     */
    formatDateForInput(dateString) {
        if (!dateString) return '';
        
        // Tentar vários formatos de data
        const formats = [
            /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
            /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        ];
        
        for (const format of formats) {
            const match = dateString.match(format);
            if (match) {
                if (format === formats[0]) {
                    // DD/MM/YYYY -> YYYY-MM-DD
                    return `${match[3]}-${match[2]}-${match[1]}`;
                } else {
                    // Já está no formato correto
                    return dateString;
                }
            }
        }
        
        return dateString;
    }

    /**
     * UI Helpers
     */
    showLoading(message = 'Carregando...') {
        document.getElementById('loading-message').textContent = message;
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('alert-error').style.display = 'block';
        setTimeout(() => {
            document.getElementById('alert-error').style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        document.getElementById('success-message').textContent = message;
        document.getElementById('alert-success').style.display = 'block';
        setTimeout(() => {
            document.getElementById('alert-success').style.display = 'none';
        }, 3000);
    }

    showWarning(message) {
        document.getElementById('warning-message').textContent = message;
        document.getElementById('alert-warning').style.display = 'block';
        setTimeout(() => {
            document.getElementById('alert-warning').style.display = 'none';
        }, 4000);
    }

    showFieldError(field, message) {
        const errorElement = document.getElementById(`${field.name}-error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        field.style.borderColor = '#ef4444';
    }

    showFieldSuccess(field, message = '') {
        const errorElement = document.getElementById(`${field.name}-error`);
        const successElement = document.getElementById(`${field.name}-success`);
        
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        if (successElement && message) {
            successElement.textContent = message;
            successElement.style.display = 'block';
            setTimeout(() => {
                successElement.style.display = 'none';
            }, 2000);
        }
        
        field.style.borderColor = '#10b981';
    }

    clearError(field) {
        const errorElement = document.getElementById(`${field.name}-error`);
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        field.style.borderColor = '#e5e7eb';
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.formularioCliente = new FormularioCliente();
});
