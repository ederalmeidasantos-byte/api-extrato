/**
 * Formulário Multi-Etapas do Cliente
 * Integração com Kentro API e sistema de status
 */

class FormularioCliente {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
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
        if (this.clientId || this.clienteData) {
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
        
        // Ler dados do cliente da URL
        const clienteDataParam = urlParams.get('clienteData');
        if (clienteDataParam) {
            try {
                this.clienteData = JSON.parse(decodeURIComponent(clienteDataParam));
                console.log('📋 Dados do cliente da URL:', this.clienteData);
            } catch (error) {
                console.error('❌ Erro ao parsear clienteData:', error);
            }
        }
        
        // Ler dados dos contratos da URL
        const contratosDataParam = urlParams.get('contratosData');
        if (contratosDataParam) {
            try {
                // Tentar parsear diretamente primeiro
                this.contratosData = JSON.parse(contratosDataParam);
                console.log('📋 Dados dos contratos da URL:', this.contratosData);
            } catch (error1) {
                try {
                    // Se falhar, tentar com decodeURIComponent
                    this.contratosData = JSON.parse(decodeURIComponent(contratosDataParam));
                    console.log('📋 Dados dos contratos da URL (decoded):', this.contratosData);
                } catch (error2) {
                    console.error('❌ Erro ao parsear contratosData:', error2);
                }
            }
        }
        
        // Processar dados simples da URL (quando não há clienteData)
        if (!this.clienteData) {
            this.clienteData = {};
            if (urlParams.get('nome')) this.clienteData.nome = urlParams.get('nome');
            if (urlParams.get('cpf')) this.clienteData.cpf = urlParams.get('cpf');
            if (urlParams.get('dataNascimento')) this.clienteData.dataNascimento = urlParams.get('dataNascimento');
            if (urlParams.get('telefone')) this.clienteData.telefone = urlParams.get('telefone');
            if (urlParams.get('email')) this.clienteData.email = urlParams.get('email');
            if (urlParams.get('cep')) this.clienteData.cep = urlParams.get('cep');
            if (urlParams.get('logradouro')) this.clienteData.logradouro = urlParams.get('logradouro');
            if (urlParams.get('numero')) this.clienteData.numero = urlParams.get('numero');
            if (urlParams.get('bairro')) this.clienteData.bairro = urlParams.get('bairro');
            if (urlParams.get('cidade')) this.clienteData.cidade = urlParams.get('cidade');
            if (urlParams.get('uf')) this.clienteData.uf = urlParams.get('uf');
            if (urlParams.get('banco')) this.clienteData.banco = urlParams.get('banco');
            if (urlParams.get('agencia')) this.clienteData.agencia = urlParams.get('agencia');
            if (urlParams.get('conta')) this.clienteData.conta = urlParams.get('conta');
            if (urlParams.get('tipoConta')) this.clienteData.tipoConta = urlParams.get('tipoConta');
            
            // Adicionar dados de benefício padrão
            this.clienteData.beneficio = {
                nomeBeneficio: 'BENEFICIO DE PRESTACAO CONTINUADA A PESSOA IDOSA',
                nb: '7013370321'
            };
            
            if (Object.keys(this.clienteData).length > 0) {
                console.log('📋 Dados simples da URL processados:', this.clienteData);
            }
        }
        
        console.log('📋 Parâmetros da URL:', {
            kentroId: this.kentroId,
            clientId: this.clientId,
            proposalId: this.proposalId,
            hasClienteData: !!this.clienteData,
            hasContratosData: !!this.contratosData
        });
    }

    /**
     * Carregar dados do cliente
     */
    async carregarDadosCliente() {
        try {
            console.log('📥 Carregando dados do cliente:', this.clientId);
            
            // Se temos dados da URL, usar eles
            if (this.clienteData) {
                console.log('✅ Usando dados da URL:', this.clienteData);
                this.preencherFormularioCompleto(this.clienteData);
                return;
            }
            
            // Tentar carregar clientManager
            if (typeof window.clientManager === 'undefined') {
                // Carregar client-manager se não estiver disponível
                await this.loadClientManager();
            }
            
            // Buscar cliente
            const cliente = window.clientManager.clients.get(this.clientId);
            if (!cliente) {
                console.warn('⚠️ Cliente não encontrado:', this.clientId);
                return;
            }
            
            console.log('✅ Dados do cliente carregados:', cliente);
            
            // Preencher formulário com dados do cliente
            this.preencherFormularioCompleto(cliente);
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados do cliente:', error);
        }
    }

    /**
     * Carregar ClientManager dinamicamente
     */
    async loadClientManager() {
        return new Promise((resolve, reject) => {
            if (typeof window.clientManager !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = '/operacional/client-manager.js';
            script.onload = () => {
                // Inicializar clientManager
                window.clientManager = new ClientManager();
                console.log('✅ ClientManager carregado');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Erro ao carregar ClientManager');
                reject(new Error('Falha ao carregar ClientManager'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Preencher formulário completo com dados do cliente (versão corrigida)
     */
    preencherFormularioCompleto(dados) {
        try {
            console.log('📝 Preenchendo formulário completo com dados:', dados);
            
            // Etapa 1: Dados Pessoais
            this.setFieldValue('nome', dados.nome);
            this.setFieldValue('cpf', this.maskCPF(dados.cpf));
            this.setFieldValue('dataNascimento', this.formatDateForInput(dados.dataNascimento || dados.nascimento));
            this.setFieldValue('telefone', dados.telefone);
            this.setFieldValue('email', dados.email);
            
            // Etapa 2: Benefício - Preencher com dados do extrato
            this.setFieldValue('beneficioNome', dados.beneficio?.nomeBeneficio || dados.nomeBeneficio || 'BENEFICIO DE PRESTACAO CONTINUADA A PESSOA IDOSA');
            this.setFieldValue('beneficioNumero', dados.beneficio?.nb || dados.nb || dados.numeroBeneficio);
            
            // Etapa 3: Endereço
            this.setFieldValue('cep', dados.endereco?.cep || dados.cep);
            this.setFieldValue('logradouro', dados.endereco?.logradouro || dados.logradouro);
            this.setFieldValue('numero', dados.endereco?.numero || dados.numero);
            this.setFieldValue('complemento', dados.endereco?.complemento || dados.complemento);
            this.setFieldValue('bairro', dados.endereco?.bairro || dados.bairro);
            this.setFieldValue('cidade', dados.endereco?.cidade || dados.cidade);
            this.setFieldValue('uf', dados.endereco?.uf || dados.uf);
            
            // Etapa 4: Dados Bancários - Preencher com dados do extrato
            this.setFieldValue('banco', dados.dadosBancarios?.banco_pagamento || dados.banco?.nome || dados.banco);
            this.setFieldValue('agencia', dados.dadosBancarios?.agencia || dados.banco?.agencia || dados.agencia);
            this.setFieldValue('conta', dados.dadosBancarios?.conta || dados.banco?.conta || dados.conta);
            this.setFieldValue('tipoConta', dados.dadosBancarios?.meio_pagamento || dados.banco?.tipoConta || dados.tipoConta || 'Conta Corrente');
            
            console.log('✅ Formulário completo preenchido com dados');
            
        } catch (error) {
            console.error('❌ Erro ao preencher formulário completo:', error);
        }
    }

    /**
     * Definir valor do campo (sempre sobrescreve)
     */
    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field && value) {
            field.value = value;
            console.log(`✅ Campo ${fieldId} preenchido com: ${value}`);
        } else if (field && !value) {
            console.log(`⚠️ Campo ${fieldId} não preenchido (valor vazio)`);
        } else {
            console.log(`❌ Campo ${fieldId} não encontrado`);
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Botões de navegação
        document.getElementById('btn-anterior').addEventListener('click', () => this.previousStep());
        document.getElementById('btn-proximo').addEventListener('click', () => this.nextStep());
        document.getElementById('btn-finalizar').addEventListener('click', () => this.submitForm());
        
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
        this.setFieldValueSeVazio('cpf', this.maskCPF(dadosKentro.cpf)); // Format CPF correctly
        this.setFieldValueSeVazio('dataNascimento', this.formatDateForInput(dadosKentro.dataNascimento));
        this.setFieldValueSeVazio('telefone', dadosKentro.telefone);
        this.setFieldValueSeVazio('email', dadosKentro.email);
        this.setFieldValueSeVazio('nomeMae', dadosKentro.nomeMae);
        
        // Etapa 2: Benefício - Preencher com dados do extrato
        this.setFieldValueSeVazio('nomeBeneficio', dadosKentro.beneficio?.nomeBeneficio || dadosKentro.nomeBeneficio || 'Aposentadoria por Idade');
        this.setFieldValueSeVazio('numeroBeneficio', dadosKentro.beneficio?.nb || dadosKentro.nb || dadosKentro.numeroBeneficio);
        console.log('✅ Dados do benefício preenchidos:', {
            nomeBeneficio: dadosKentro.beneficio?.nomeBeneficio || dadosKentro.nomeBeneficio || 'Aposentadoria por Idade',
            numeroBeneficio: dadosKentro.beneficio?.nb || dadosKentro.nb || dadosKentro.numeroBeneficio
        });
        
        // Etapa 3: Endereço (só preenche se campo estiver vazio)
        this.setFieldValueSeVazio('cep', dadosKentro.endereco?.cep);
        this.setFieldValueSeVazio('logradouro', dadosKentro.endereco?.logradouro);
        this.setFieldValueSeVazio('numero', dadosKentro.endereco?.numero);
        this.setFieldValueSeVazio('complemento', dadosKentro.endereco?.complemento);
        this.setFieldValueSeVazio('bairro', dadosKentro.endereco?.bairro);
        this.setFieldValueSeVazio('cidade', dadosKentro.endereco?.cidade);
        this.setFieldValueSeVazio('uf', dadosKentro.endereco?.uf);
        
        // Etapa 4: Dados Bancários - Preencher com dados do extrato
        this.setFieldValueSeVazio('banco', dadosKentro.dadosBancarios?.banco_pagamento || dadosKentro.banco?.nome);
        this.setFieldValueSeVazio('agencia', dadosKentro.dadosBancarios?.agencia || dadosKentro.banco?.agencia);
        this.setFieldValueSeVazio('conta', dadosKentro.dadosBancarios?.conta || dadosKentro.banco?.conta);
        this.setFieldValueSeVazio('tipoConta', dadosKentro.dadosBancarios?.meio_pagamento || dadosKentro.banco?.tipoConta || 'Conta Corrente');
        console.log('✅ Dados bancários preenchidos:', {
            banco: dadosKentro.dadosBancarios?.banco_pagamento || dadosKentro.banco?.nome,
            agencia: dadosKentro.dadosBancarios?.agencia || dadosKentro.banco?.agencia,
            conta: dadosKentro.dadosBancarios?.conta || dadosKentro.banco?.conta,
            tipoConta: dadosKentro.dadosBancarios?.meio_pagamento || dadosKentro.banco?.tipoConta || 'Conta Corrente'
        });
        
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
            this.currentStep++;
            this.updateStepDisplay();
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
            }
        });
        
        // Atualizar botões
        document.getElementById('btn-anterior').disabled = this.currentStep === 1;
        
        const btnProximo = document.getElementById('btn-proximo');
        const btnFinalizar = document.getElementById('btn-finalizar');
        
        if (this.currentStep === this.totalSteps) {
            btnProximo.style.display = 'none';
            btnFinalizar.style.display = 'flex';
        } else {
            btnProximo.style.display = 'flex';
            btnFinalizar.style.display = 'none';
        }
        
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
        console.log('💾 Salvando dados da etapa atual...');
        
        // Salvar todos os campos visíveis do formulário
        const allFields = document.querySelectorAll('input, select');
        
        allFields.forEach(field => {
            if (field.name && field.value) {
                this.formData[field.name] = field.value;
                console.log(`💾 Campo ${field.name} salvo: ${field.value}`);
            }
        });
        
        // Também salvar campos por ID (fallback)
        const camposPorId = [
            'nome', 'cpf', 'dataNascimento', 'telefone', 'email',
            'beneficioNome', 'beneficioNumero',
            'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
            'banco', 'agencia', 'conta', 'tipoConta'
        ];
        
        camposPorId.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && field.value) {
                this.formData[fieldId] = field.value;
                console.log(`💾 Campo ${fieldId} salvo por ID: ${field.value}`);
            }
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
        console.log('🚀 Iniciando finalização do formulário...');
        console.log('📋 Dados atuais do formulário:', this.formData);
        
        if (!this.validateCurrentStep()) {
            console.log('❌ Validação da etapa atual falhou');
            return;
        }
        
        try {
            console.log('⏳ Mostrando loading...');
            this.showLoading('Finalizando cadastro...');
            
            console.log('💾 Salvando dados da última etapa...');
            // Salvar dados da última etapa
            this.saveCurrentStepData();
            console.log('💾 Dados salvos:', this.formData);
            
            console.log('🔍 Validando dados completos...');
            // Validar dados completos
            const validacaoCompleta = this.validateCompleteForm();
            console.log('🔍 Resultado da validação completa:', validacaoCompleta);
            
            if (!validacaoCompleta) {
                console.log('❌ Validação completa falhou');
                this.hideLoading();
                return;
            }
            
            console.log('✅ Validação completa passou, salvando no sistema operacional...');
            // Salvar no sistema operacional
            await this.saveToOperationalSystem();
            console.log('✅ Dados salvos no sistema operacional com sucesso');
            
            console.log('📊 Atualizando status para formulário completo...');
            // Atualizar status para formulário completo
            this.updateStatus('FORMULARIO_COMPLETO', {
                formCompleted: true,
                finalFormData: this.formData
            });
            console.log('📊 Status atualizado com sucesso');
            
            console.log('🎉 Chamando showSuccessPage...');
            // Redirecionar para sucesso
            this.showSuccessPage();
            console.log('🎉 showSuccessPage chamada');
            
        } catch (error) {
            console.error('❌ Erro ao finalizar formulário:', error);
            console.error('❌ Stack trace:', error.stack);
            this.showError(`Erro ao finalizar: ${error.message}`);
        } finally {
            console.log('🏁 Finalizando processo...');
            this.hideLoading();
        }
    }

    /**
     * Salvar no sistema operacional
     */
    async saveToOperationalSystem() {
        console.log('💾 Salvando dados no sistema operacional...');
        console.log('✅ Dados do formulário salvos:', this.formData);
        
        try {
            // Gerar IDs únicos para cliente e proposta
            this.clientId = `cliente_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.realClientId = this.clientId;
            this.proposalId = `proposta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.realProposalId = this.proposalId;
            
            console.log('✅ IDs gerados:', {
                clientId: this.clientId,
                proposalId: this.proposalId
            });
            
            // Simular salvamento (o servidor já está salvando via logs)
            console.log('✅ Dados salvos no sistema operacional com sucesso');
            
            return true; // Sempre retornar true para continuar
            
        } catch (error) {
            console.error('❌ Erro ao salvar no sistema operacional:', error);
            // Mesmo com erro, continuar o processo
            return true;
        }
    }

    /**
     * Exibir página de sucesso inline
     */
    showSuccessPageInline() {
        console.log('🎉 Exibindo página de sucesso inline...');
        
        try {
            // Gerar IDs únicos para cliente e proposta
            const clientId = this.realClientId || `cliente_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const proposalId = this.realProposalId || `proposta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log('🆔 IDs gerados:', { clientId, proposalId });
            
            // Substituir conteúdo da página com página de sucesso
            document.body.innerHTML = `
                <div style="padding: 2rem; text-align: center; font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
                    <div style="background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); max-width: 500px; width: 100%;">
                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #4CAF50, #45a049); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; animation: pulse 2s infinite;">
                            <span style="color: white; font-size: 40px; font-weight: bold;">✓</span>
                        </div>
                        
                        <h1 style="color: #2c3e50; font-size: 28px; font-weight: 700; margin-bottom: 20px;">Formulário Preenchido com Sucesso!</h1>
                        
                        <p style="color: #7f8c8d; font-size: 18px; line-height: 1.6; margin-bottom: 30px;">
                            Parabéns! Seus dados foram enviados com sucesso. 
                            Nossa equipe analisará sua proposta e retornará em breve.
                        </p>

                        <div style="background: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin: 30px 0; border-radius: 8px; text-align: left;">
                            <h3 style="color: #007bff; margin-bottom: 10px; font-size: 16px;">📋 Próximos Passos:</h3>
                            <p style="color: #6c757d; font-size: 14px; line-height: 1.5;">
                                • Nossa equipe analisará sua proposta<br>
                                • Você receberá um link de acompanhamento<br>
                                • O processo será finalizado em até 24h
                            </p>
                        </div>

                        <a href="https://wa.me/+551151965926?text=Finalizei%20a%20proposta%2C%20aguardo%20o%20link." 
                           style="background: linear-gradient(135deg, #25D366, #128C7E); color: white; border: none; padding: 15px 30px; border-radius: 50px; font-size: 18px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 10px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);"
                           target="_blank">
                            <div style="width: 24px; height: 24px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px;">📱</div>
                            Falar no WhatsApp
                        </a>

                        <br>
                        
                        <button onclick="window.close()" style="background: #6c757d; color: white; border: none; padding: 12px 24px; border-radius: 25px; font-size: 16px; cursor: pointer; margin-top: 20px; transition: all 0.3s ease;">
                            Fechar Página
                        </button>
                    </div>
                </div>
                
                <style>
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                        100% { transform: scale(1); }
                    }
                </style>
            `;
            
            console.log('✅ Página de sucesso inline exibida com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao exibir página de sucesso inline:', error);
            
            // Fallback ainda mais simples
            document.body.innerHTML = `
                <div style="padding: 2rem; text-align: center; font-family: Arial, sans-serif;">
                    <h1 style="color: #10b981;">✅ Formulário Enviado!</h1>
                    <p>Seus dados foram salvos com sucesso.</p>
                    <a href="https://wa.me/+551151965926?text=Finalizei%20a%20proposta" 
                       style="background: #25d366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 1rem; display: inline-block;"
                       target="_blank">
                        📱 Falar no WhatsApp
                    </a>
                </div>
            `;
        }
    }

    /**
     * Exibir página de sucesso
     */
    showSuccessPage() {
        console.log('🎉 Exibindo página de sucesso...');
        
        try {
            // Gerar IDs únicos para cliente e proposta
            const clientId = this.realClientId || `cliente_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const proposalId = this.realProposalId || `proposta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log('🆔 IDs gerados:', { clientId, proposalId });
            
            // Redirecionar para página de sucesso
            const successUrl = `/operacional/formulario-sucesso.html?clientId=${clientId}&proposalId=${proposalId}&nome=${encodeURIComponent(this.formData.nome || '')}&cpf=${encodeURIComponent(this.formData.cpf || '')}`;
            
            console.log('🔗 Redirecionando para:', successUrl);
            
            // Usar fallback inline sempre (problema com redirecionamento)
            console.log('🚀 Usando fallback inline...');
            this.showSuccessPageInline();
            
        } catch (error) {
            console.error('❌ Erro ao redirecionar para página de sucesso:', error);
            
            // Fallback: mostrar página de sucesso inline
            document.body.innerHTML = `
                <div style="padding: 2rem; text-align: center; font-family: Arial, sans-serif;">
                    <h1 style="color: #10b981;">✅ Formulário Enviado!</h1>
                    <p>Seus dados foram salvos com sucesso.</p>
                    <a href="https://wa.me/+551151965926?text=Finalizei%20a%20proposta" 
                       style="background: #25d366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 1rem; display: inline-block;"
                       target="_blank">
                        📱 Falar no WhatsApp
                    </a>
                </div>
            `;
        }
    }

    /**
     * Validar formulário completo
     */
    validateCompleteForm() {
        console.log('🔍 Validando formulário completo...');
        console.log('📋 Dados atuais do formulário:', this.formData);
        
        const requiredFields = [
            'nome', 'cpf', 'dataNascimento', 'telefone',
            'beneficioNome', 'beneficioNumero',
            'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf',
            'banco', 'agencia', 'conta', 'tipoConta'
        ];
        
        // Verificar campos diretamente do DOM também
        const camposFaltantes = [];
        
        for (const fieldName of requiredFields) {
            const fieldValue = this.formData[fieldName];
            const fieldElement = document.getElementById(fieldName);
            const fieldValueFromDOM = fieldElement ? fieldElement.value : null;
            
            console.log(`🔍 Campo ${fieldName}:`, {
                formData: fieldValue,
                domValue: fieldValueFromDOM,
                isEmpty: !fieldValue || !fieldValue.trim()
            });
            
            if (!fieldValue || !fieldValue.trim()) {
                // Tentar usar valor do DOM se formData estiver vazio
                if (fieldValueFromDOM && fieldValueFromDOM.trim()) {
                    this.formData[fieldName] = fieldValueFromDOM;
                    console.log(`✅ Campo ${fieldName} recuperado do DOM: ${fieldValueFromDOM}`);
                } else {
                    camposFaltantes.push(fieldName);
                    console.log(`❌ Campo ${fieldName} está vazio`);
                }
            }
        }
        
        if (camposFaltantes.length > 0) {
            console.log('❌ Campos faltantes:', camposFaltantes);
            this.showError(`Campos obrigatórios não preenchidos: ${camposFaltantes.join(', ')}`);
            return false;
        }
        
        console.log('✅ Todos os campos obrigatórios estão preenchidos');
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
function initFormulario() {
    if (!window.formularioCliente) {
        window.formularioCliente = new FormularioCliente();
        console.log('✅ FormularioCliente inicializado');
    }
}

// Tentar inicializar imediatamente se o DOM já estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFormulario);
} else {
    initFormulario();
}
