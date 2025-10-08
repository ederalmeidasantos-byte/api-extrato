/**
 * Integração com API Kentro
 * Busca dados de oportunidades para preenchimento automático do formulário
 * IMPORTANTE: A Kentro usa mainmail (email) como identificador principal, não CPF
 */

class KentroIntegration {
    constructor() {
        this.baseUrl = 'https://lunasdigital.atenderbem.com/int';
        this.apiKey = 'cd4d0509169d4e2ea9177ac66c1c9376';
        this.defaultQueue = 25; // Fila de portabilidade
        this.defaultPipeline = 2; // Pipeline de portabilidade
    }

    /**
     * Buscar cliente por Email (mainmail) - MÉTODO PRINCIPAL
     * A Kentro usa mainmail como identificador principal, não CPF
     */
    async buscarPorEmail(email) {
        try {
            console.log(`🔍 [KENTRO] Buscando cliente por email (mainmail): ${email}`);
            
            const response = await fetch(`${this.baseUrl}/getPipeOpportunities`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    queueId: this.defaultQueue,
                    apiKey: this.apiKey,
                    pipelineId: this.defaultPipeline
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            const oportunidades = await response.json();
            console.log(`📊 [KENTRO] ${oportunidades.length} oportunidades encontradas na fila`);
            
            // Procurar por mainmail (email)
            const oportunidade = oportunidades.find(op => {
                const mainmail = op.mainmail || op.email || '';
                const match = mainmail.toLowerCase().includes(email.toLowerCase());
                console.log(`🔍 [KENTRO] Verificando: ${mainmail} === ${email} ? ${match}`);
                return match;
            });
            
            if (oportunidade) {
                console.log(`✅ [KENTRO] Cliente encontrado por email: ${oportunidade.title || 'Nome não disponível'}`);
                return this.formatarDadosCliente(oportunidade);
            }
            
            console.log(`❌ [KENTRO] Cliente não encontrado por email: ${email}`);
            return null;
            
        } catch (error) {
            console.error('❌ [KENTRO] Erro ao buscar por email:', error);
            return null;
        }
    }

    /**
     * Buscar cliente por CPF (método alternativo)
     * Usa mainmail que contém o CPF no formato: cpf@domain.com
     */
    async buscarPorCpf(cpf) {
        try {
            console.log(`🔍 [KENTRO] Buscando cliente por CPF: ${cpf}`);
            
            // Limpar CPF
            const cpfLimpo = cpf.replace(/\D/g, '');
            
            const response = await fetch(`${this.baseUrl}/getPipeOpportunities`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    queueId: this.defaultQueue,
                    apiKey: this.apiKey,
                    pipelineId: this.defaultPipeline
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            const oportunidades = await response.json();
            
            // Procurar por CPF no mainmail (formato: cpf@domain.com)
            const oportunidade = oportunidades.find(op => {
                const mainmail = op.mainmail || '';
                const match = mainmail.includes(cpfLimpo);
                console.log(`🔍 [KENTRO] Verificando mainmail: ${mainmail} contém ${cpfLimpo} ? ${match}`);
                return match;
            });
            
            if (oportunidade) {
                console.log(`✅ [KENTRO] Cliente encontrado por CPF: ${oportunidade.title || 'Nome não disponível'}`);
                return this.formatarDadosCliente(oportunidade);
            }
            
            console.log(`❌ [KENTRO] Cliente não encontrado por CPF: ${cpf}`);
            return null;
            
        } catch (error) {
            console.error('❌ [KENTRO] Erro ao buscar por CPF:', error);
            return null;
        }
    }

    /**
     * Buscar dados completos por ID
     */
    async buscarOportunidadePorId(kentroId) {
        try {
            console.log(`🔍 [KENTRO] Buscando oportunidade por ID: ${kentroId}`);
            
            const response = await fetch(`${this.baseUrl}/getPipeOpportunities`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    queueId: this.defaultQueue,
                    apiKey: this.apiKey,
                    pipelineId: this.defaultPipeline
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            const oportunidades = await response.json();
            console.log(`📊 [KENTRO] ${oportunidades.length} oportunidades encontradas na fila`);
            
            // Procurar por ID
            const oportunidade = oportunidades.find(op => op.id == kentroId);
            
            if (oportunidade) {
                console.log(`✅ [KENTRO] Oportunidade encontrada: ${oportunidade.title || 'Nome não disponível'}`);
                return oportunidade; // Retornar dados brutos
            }
            
            console.log(`❌ [KENTRO] Oportunidade não encontrada: ${kentroId}`);
            return null;
            
        } catch (error) {
            console.error('❌ [KENTRO] Erro ao buscar por ID:', error);
            return null;
        }
    }

    /**
     * Formatar dados do cliente da Kentro
     */
    formatarDadosCliente(oportunidade) {
        const contact = oportunidade.contact || {};
        const customFields = contact.customFields || [];
        
        // Extrair campos customizados
        const getCustomField = (names) => {
            const field = customFields.find(f => names.includes(f.name));
            return field ? field.value : null;
        };
        
        const cliente = {
            kentroId: oportunidade.id,
            nome: contact.name || oportunidade.title || '',
            email: contact.mainmail || contact.email || oportunidade.email || '',
            telefone: contact.phone || oportunidade.phone || '',
            cpf: getCustomField(['CPF']),
            nb: getCustomField(['NB', 'Número do Benefício']),
            nascimento: getCustomField(['Data de Nascimento', 'Nascimento']),
            endereco: {
                cep: getCustomField(['CEP']),
                logradouro: getCustomField(['Endereço', 'Logradouro']),
                numero: getCustomField(['Número']),
                complemento: getCustomField(['Complemento']),
                bairro: getCustomField(['Bairro']),
                cidade: getCustomField(['Cidade']),
                uf: getCustomField(['UF', 'Estado'])
            },
            dadosBancarios: {
                banco: getCustomField(['Banco']),
                agencia: getCustomField(['Agência']),
                conta: getCustomField(['Conta']),
                tipoConta: getCustomField(['Tipo de Conta'])
            },
            // Metadados
            ativo: true,
            origem: 'kentro',
            dataImportacao: new Date().toISOString(),
            oportunidadeCompleta: oportunidade
        };
        
        // Limpar campos vazios
        Object.keys(cliente.endereco).forEach(key => {
            if (!cliente.endereco[key]) delete cliente.endereco[key];
        });
        
        Object.keys(cliente.dadosBancarios).forEach(key => {
            if (!cliente.dadosBancarios[key]) delete cliente.dadosBancarios[key];
        });
        
        if (Object.keys(cliente.endereco).length === 0) delete cliente.endereco;
        if (Object.keys(cliente.dadosBancarios).length === 0) delete cliente.dadosBancarios;
        
        return cliente;
    }

    /**
     * Formatar dados da oportunidade para o formulário
     */
    formatarDadosOportunidade(oportunidade) {
        try {
            console.log('🔧 [KENTRO] Formatando dados da oportunidade...');
            console.log('📋 [KENTRO] Dados brutos da oportunidade:', oportunidade);
            
            // Extrair CPF do mainmail (formato: email-cpf@domain.com)
            const mainmail = oportunidade.mainmail || '';
            console.log('📧 [KENTRO] Mainmail:', mainmail);
            const cpfMatch = mainmail.match(/(\d{11})/);
            const cpf = cpfMatch ? this.formatarCPF(cpfMatch[1]) : '';
            console.log('🔍 [KENTRO] CPF extraído:', cpf);

            // Extrair dados do formulário (campo formsdata se existir)
            let formData = {};
            if (oportunidade.formsdata) {
                console.log('📝 [KENTRO] Formsdata encontrado:', oportunidade.formsdata);
                formData = oportunidade.formsdata;
                console.log('📝 [KENTRO] Formsdata processado:', formData);
            } else if (oportunidade.form_data) {
                console.log('📝 [KENTRO] Form_data encontrado:', oportunidade.form_data);
                try {
                    formData = typeof oportunidade.form_data === 'string' 
                        ? JSON.parse(oportunidade.form_data) 
                        : oportunidade.form_data;
                    console.log('📝 [KENTRO] Form_data processado:', formData);
                } catch (e) {
                    console.warn('⚠️ [KENTRO] Erro ao processar form_data:', e.message);
                }
            } else {
                console.log('⚠️ [KENTRO] Nenhum formsdata/form_data encontrado na oportunidade');
            }

            // Mapear dados para o formato do formulário
            const dadosFormatados = {
                // Dados básicos da oportunidade
                kentroId: oportunidade.id,
                nome: oportunidade.title || oportunidade.name || formData.nome || formData.nome_completo || '',
                cpf: cpf,
                email: oportunidade.email || formData.email || formData.email_cliente || formData['9e7f92b0'] || '',
                telefone: this.formatarTelefone(oportunidade.mainphone || formData['98167d80'] || this.extrairTelefone(oportunidade)),
                
                // Dados pessoais
                dataNascimento: formData.data_nascimento || formData.nascimento || formData.data_nasc || 
                               formData['0bfc6250'] || formData['1f7e85d0'] || '',
                nomeMae: formData.nome_mae || formData.mae || formData.nome_da_mae || formData['917456f0'] || '',
                
                // Endereço
                endereco: {
                    cep: formData.cep || formData.cep_endereco || formData['769db520'] || '',
                    logradouro: formData.logradouro || formData.endereco || formData.rua || formData.endereco_completo || 
                               formData['1dbfcef0'] || '',
                    numero: formData.numero || formData.numero_casa || formData.numero_endereco || this.extrairNumeroEndereco(formData['1dbfcef0'] || ''),
                    complemento: formData.complemento || formData.complemento_endereco || '',
                    bairro: formData.bairro || formData.bairro_endereco || formData['3271f710'] || '',
                    cidade: formData.cidade || formData.municipio || formData['25178280'] || '',
                    uf: this.limparUF(formData.uf || formData.estado || formData.sigla_estado || formData['f6384400'] || '')
                },

                // Metadados
                metadata: {
                    kentroStage: oportunidade.stage,
                    kentroStatus: oportunidade.status,
                    ultimaAtualizacao: new Date().toISOString(),
                    fonteDados: 'kentro_api',
                    camposMapeados: Object.keys(formData).length
                }
            };

            console.log('✅ [KENTRO] Dados formatados com sucesso');
            console.log(`👤 [KENTRO] Cliente: ${dadosFormatados.nome} | CPF: ${dadosFormatados.cpf}`);
            console.log('📋 [KENTRO] Resumo dos dados mapeados:');
            console.log(`   📧 Email: ${dadosFormatados.email}`);
            console.log(`   📱 Telefone: ${dadosFormatados.telefone}`);
            console.log(`   🏠 Endereço: ${dadosFormatados.endereco?.logradouro || 'N/A'}, ${dadosFormatados.endereco?.numero || 'N/A'}`);
            console.log(`   📊 Campos mapeados: ${dadosFormatados.metadata?.camposMapeados || 0}`);
            
            return dadosFormatados;

        } catch (error) {
            console.error('❌ [KENTRO] Erro ao formatar dados:', error);
            throw new Error(`Erro ao processar dados da oportunidade: ${error.message}`);
        }
    }

    /**
     * Extrair número do endereço completo
     */
    extrairNumeroEndereco(enderecoCompleto) {
        if (!enderecoCompleto) return '';
        
        // Procura por padrões como "Rua X, 123" ou "Rua X 123"
        const match = enderecoCompleto.match(/(\d+)/);
        return match ? match[1] : '';
    }

    /**
     * Limpar UF (remover espaços extras)
     */
    limparUF(uf) {
        if (!uf) return '';
        return uf.trim().replace(/\s+/g, '');
    }

    /**
     * Formatar telefone como DDD + número
     */
    formatarTelefone(telefone) {
        if (!telefone) return '';
        
        // Remove todos os caracteres não numéricos
        const numeros = telefone.replace(/\D/g, '');
        
        // Se tem 11 dígitos (DDD + 9 dígitos)
        if (numeros.length === 11) {
            return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`;
        }
        // Se tem 10 dígitos (DDD + 8 dígitos)
        else if (numeros.length === 10) {
            return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6)}`;
        }
        // Se tem 9 dígitos (sem DDD)
        else if (numeros.length === 9) {
            return `${numeros.substring(0, 5)}-${numeros.substring(5)}`;
        }
        // Se tem 8 dígitos (sem DDD)
        else if (numeros.length === 8) {
            return `${numeros.substring(0, 4)}-${numeros.substring(4)}`;
        }
        
        return telefone; // Retorna original se não conseguir formatar
    }

    /**
     * Extrair telefone de vários campos possíveis
     */
    extrairTelefone(oportunidade) {
        // Campos diretos da oportunidade
        const camposOportunidade = [
            oportunidade.phone,
            oportunidade.telefone,
            oportunidade.celular,
            oportunidade.phone1,
            oportunidade.phone2,
            oportunidade.mobile,
            oportunidade.whatsapp,
            oportunidade.contact_phone
        ];
        
        // Verificar campos diretos primeiro
        for (const campo of camposOportunidade) {
            if (campo && typeof campo === 'string' && campo.trim()) {
                return this.formatarTelefone(campo.trim());
            }
        }
        
        // Verificar form_data se existir
        if (oportunidade.form_data) {
            let formData = {};
            try {
                formData = typeof oportunidade.form_data === 'string' 
                    ? JSON.parse(oportunidade.form_data) 
                    : oportunidade.form_data;
            } catch (e) {
                console.warn('⚠️ [KENTRO] Erro ao processar form_data para telefone:', e.message);
                return '';
            }
            
            const camposFormData = [
                formData.telefone,
                formData.celular,
                formData.phone,
                formData.telefone_cliente,
                formData.numero_telefone,
                formData.whatsapp,
                formData.contato
            ];
            
            for (const campo of camposFormData) {
                if (campo && typeof campo === 'string' && campo.trim()) {
                    return this.formatarTelefone(campo.trim());
                }
            }
        }

        return '';
    }

    /**
     * Formatar CPF com máscara
     */
    formatarCPF(cpf) {
        const numeros = cpf.replace(/\D/g, '');
        if (numeros.length === 11) {
            return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        return cpf;
    }

    /**
     * Validar se a integração está funcionando
     */
    async testarConexao() {
        try {
            console.log('🧪 [KENTRO] Testando conexão com API Kentro...');
            
            const response = await fetch(`${this.baseUrl}/getPipeOpportunities`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    queueId: this.defaultQueue,
                    apiKey: this.apiKey,
                    pipelineId: this.defaultPipeline
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            const count = Array.isArray(data) ? data.length : 0;
            
            console.log(`✅ [KENTRO] Conexão OK - ${count} oportunidades encontradas`);
            return { success: true, count };

        } catch (error) {
            console.error('❌ [KENTRO] Falha na conexão:', error);
            return { success: false, error: error.message };
        }
    }
}

// Instância global para uso no sistema operacional
window.kentroIntegration = new KentroIntegration();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KentroIntegration;
}