/**
 * Integração com API Kentro
 * Busca dados de oportunidades para preenchimento automático do formulário
 */

class KentroIntegration {
    constructor() {
        this.baseUrl = 'https://lunasdigital.atenderbem.com/int';
        this.apiKey = 'cd4d0509169d4e2ea9177ac66c1c9376';
        this.defaultQueue = 25; // Fila de portabilidade
        this.defaultPipeline = 2; // Pipeline de portabilidade
    }

    /**
     * Buscar cliente por CPF
     */
    async buscarPorCpf(cpf) {
        try {
            console.log(`🔍 Buscando cliente por CPF: ${cpf}`);
            
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
            
            // Procurar por CPF
            const oportunidade = oportunidades.find(op => {
                if (op.contact && op.contact.customFields) {
                    const cpfField = op.contact.customFields.find(field => 
                        field.name === 'CPF' && field.value?.replace(/\D/g, '') === cpf
                    );
                    return !!cpfField;
                }
                return false;
            });
            
            if (oportunidade) {
                return this.formatarDadosCliente(oportunidade);
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Erro ao buscar por CPF:', error);
            return null;
        }
    }

    /**
     * Buscar cliente por Número do Benefício
     */
    async buscarPorNb(nb) {
        try {
            console.log(`🔍 Buscando cliente por NB: ${nb}`);
            
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
            
            // Procurar por NB
            const oportunidade = oportunidades.find(op => {
                if (op.contact && op.contact.customFields) {
                    const nbField = op.contact.customFields.find(field => 
                        (field.name === 'NB' || field.name === 'Número do Benefício') && 
                        field.value?.replace(/\D/g, '') === nb
                    );
                    return !!nbField;
                }
                return false;
            });
            
            if (oportunidade) {
                return this.formatarDadosCliente(oportunidade);
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Erro ao buscar por NB:', error);
            return null;
        }
    }

    /**
     * Buscar dados completos por ID
     */
    async buscarPorId(kentroId) {
        try {
            console.log(`🔍 Buscando dados completos por ID: ${kentroId}`);
            
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
            
            // Procurar por ID
            const oportunidade = oportunidades.find(op => op.id == kentroId);
            
            if (oportunidade) {
                return this.formatarDadosCliente(oportunidade);
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Erro ao buscar por ID:', error);
            return null;
        }
    }

    /**
     * Busca detalhada (com retry e diferentes métodos)
     */
    async buscarDetalhado(valor, tipo) {
        try {
            console.log(`🔍 Busca detalhada - ${tipo}: ${valor}`);
            
            if (tipo === 'cpf') {
                return await this.buscarPorCpf(valor);
            } else if (tipo === 'nb') {
                return await this.buscarPorNb(valor);
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Erro na busca detalhada:', error);
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
            nome: contact.name || '',
            email: contact.mainmail || contact.email || '',
            telefone: contact.phone || '',
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
     * Buscar dados da oportunidade pelo ID
     */
    async buscarOportunidadePorId(kentroId, cpf = null) {
        try {
            console.log(`🔍 Buscando oportunidade Kentro ID: ${kentroId}`);
            
            // Buscar todas as oportunidades da fila
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
            console.log(`📊 ${oportunidades.length} oportunidades encontradas na fila`);

            // Procurar a oportunidade específica
            let oportunidadeEncontrada = null;
            
            if (Array.isArray(oportunidades)) {
                oportunidadeEncontrada = oportunidades.find(op => {
                    const matchId = op.id == kentroId;
                    let matchCpf = true;
                    
                    if (cpf) {
                        const cpfLimpo = cpf.replace(/\D/g, '');
                        const mainmail = op.mainmail || '';
                        matchCpf = mainmail.includes(cpfLimpo);
                    }
                    
                    return matchId && matchCpf;
                });
            }

            if (!oportunidadeEncontrada) {
                console.log(`❌ Oportunidade não encontrada - ID: ${kentroId}, CPF: ${cpf || 'N/A'}`);
                return null;
            }

            console.log(`✅ Oportunidade encontrada: ${oportunidadeEncontrada.name || 'Nome não disponível'}`);
            return oportunidadeEncontrada; // Retornar dados brutos, não formatados

        } catch (error) {
            console.error('❌ Erro ao buscar oportunidade:', error);
            throw new Error(`Falha ao buscar dados da Kentro: ${error.message}`);
        }
    }

    /**
     * Formatar dados da oportunidade para o formulário
     */
    formatarDadosOportunidade(oportunidade) {
        try {
            console.log('🔧 Formatando dados da oportunidade...');
            console.log('📋 Dados brutos da oportunidade:', oportunidade);
            
            // Extrair CPF do mainmail (formato: email-cpf@domain.com)
            const mainmail = oportunidade.mainmail || '';
            console.log('📧 Mainmail:', mainmail);
            const cpfMatch = mainmail.match(/(\d{11})/);
            const cpf = cpfMatch ? this.formatarCPF(cpfMatch[1]) : '';
            console.log('🔍 CPF extraído:', cpf);

            // Extrair dados do formulário (campo formsdata se existir)
            let formData = {};
            if (oportunidade.formsdata) {
                console.log('📝 Formsdata encontrado:', oportunidade.formsdata);
                formData = oportunidade.formsdata;
                console.log('📝 Formsdata processado:', formData);
            } else if (oportunidade.form_data) {
                console.log('📝 Form_data encontrado:', oportunidade.form_data);
                try {
                    formData = typeof oportunidade.form_data === 'string' 
                        ? JSON.parse(oportunidade.form_data) 
                        : oportunidade.form_data;
                    console.log('📝 Form_data processado:', formData);
                } catch (e) {
                    console.warn('⚠️ Erro ao processar form_data:', e.message);
                }
            } else {
                console.log('⚠️ Nenhum formsdata/form_data encontrado na oportunidade');
            }

            // Mapear dados para o formato do formulário
            // IMPORTANTE: Dados do extrato (benefício, NB, etc.) NÃO devem ser sobrescritos pela Kentro
            const dadosFormatados = {
                // Dados básicos da oportunidade (apenas campos de contato do cliente)
                kentroId: oportunidade.id,
                nome: oportunidade.title || oportunidade.name || formData.nome || formData.nome_completo || '',
                cpf: cpf,
                email: oportunidade.email || formData.email || formData.email_cliente || formData['9e7f92b0'] || '',
                telefone: this.formatarTelefone(oportunidade.mainphone || formData['98167d80'] || this.extrairTelefone(oportunidade)),
                
                // Dados pessoais (apenas dados pessoais do cliente)
                dataNascimento: formData.data_nascimento || formData.nascimento || formData.data_nasc || 
                               formData['0bfc6250'] || formData['1f7e85d0'] || '',
                nomeMae: formData.nome_mae || formData.mae || formData.nome_da_mae || formData['917456f0'] || '',
                
                // Dados do benefício - NÃO mapear da Kentro (vem do extrato)
                // Estes campos serão preservados dos dados originais do extrato
                beneficio: {
                    // Campos vazios - serão preenchidos pelos dados do extrato
                    nome: '',
                    numero: '',
                    especie: ''
                },
                
                // Endereço - mapeamento completo dos campos da Kentro (incluindo IDs específicos)
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
                
                // Dados bancários - NÃO mapear da Kentro (vem do extrato)
                // Estes campos serão preservados dos dados originais do extrato
                banco: {
                    // Campos vazios - serão preenchidos pelos dados do extrato
                    nome: '',
                    codigo: '',
                    agencia: '',
                    conta: '',
                    tipoConta: ''
                },

                // Metadados
                metadata: {
                    kentroStage: oportunidade.stage,
                    kentroStatus: oportunidade.status,
                    ultimaAtualizacao: new Date().toISOString(),
                    fonteDados: 'kentro_api',
                    camposMapeados: Object.keys(formData).length,
                    observacao: 'Dados do benefício e bancários preservados do extrato original'
                }
            };

            console.log('✅ Dados formatados com sucesso');
            console.log(`👤 Cliente: ${dadosFormatados.nome} | CPF: ${dadosFormatados.cpf}`);
            console.log('📋 Resumo dos dados mapeados:');
            console.log(`   📧 Email: ${dadosFormatados.email}`);
            console.log(`   📱 Telefone: ${dadosFormatados.telefone}`);
            console.log(`   🏠 Endereço: ${dadosFormatados.endereco?.logradouro || 'N/A'}, ${dadosFormatados.endereco?.numero || 'N/A'}`);
            console.log(`   🏦 Banco: ${dadosFormatados.banco?.nome || 'N/A'}`);
            console.log(`   📊 Campos mapeados: ${dadosFormatados.metadata?.camposMapeados || 0}`);
            
            return dadosFormatados;

        } catch (error) {
            console.error('❌ Erro ao formatar dados:', error);
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
                console.warn('⚠️ Erro ao processar form_data para telefone:', e.message);
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
     * Mapear código/nome do banco para nome completo
     */
    mapearNomeBanco(bancoInput) {
        if (!bancoInput) return '';
        
        const bancoStr = bancoInput.toString().toLowerCase().trim();
        
        // Mapeamento de códigos para nomes
        const codigosBancos = {
            '001': 'Banco do Brasil',
            '033': 'Santander',
            '104': 'Caixa Econômica Federal',
            '237': 'Bradesco',
            '341': 'Itaú',
            '356': 'Banco Real',
            '422': 'Safra',
            '623': 'PAN',
            '707': 'Daycoval',
            '756': 'Sicoob',
            '748': 'Sicredi',
            '070': 'BRB',
            '077': 'Banco Inter',
            '260': 'Nu Pagamentos',
            '336': 'Banco C6',
            '290': 'PagSeguro',
            '323': 'Mercado Pago'
        };
        
        // Se for um código numérico, retornar nome do banco
        if (codigosBancos[bancoStr]) {
            return codigosBancos[bancoStr];
        }
        
        // Se já for um nome, retornar como está
        return bancoInput;
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
     * Formatar telefone com máscara
     */
    formatarTelefone(telefone) {
        const numeros = telefone.replace(/\D/g, '');
        if (numeros.length === 11) {
            return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (numeros.length === 10) {
            return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return telefone;
    }

    /**
     * Atualizar status da oportunidade na Kentro
     */
    async atualizarStatusOportunidade(kentroId, novoStageId, observacoes = '') {
        try {
            console.log(`🔄 Atualizando status da oportunidade ${kentroId} para stage ${novoStageId}`);
            
            const response = await fetch(`${this.baseUrl}/changeOpportunityStage`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    opportunityId: kentroId,
                    destStageId: novoStageId,
                    apiKey: this.apiKey,
                    obs: observacoes
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            const resultado = await response.json();
            console.log('✅ Status atualizado na Kentro:', resultado);
            
            return resultado;

        } catch (error) {
            console.error('❌ Erro ao atualizar status na Kentro:', error);
            throw error;
        }
    }

    /**
     * Atualizar dados do cliente na Kentro
     */
    async atualizarDadosCliente(kentroId, dadosCliente) {
        try {
            console.log(`🔄 Atualizando dados do cliente na Kentro ID: ${kentroId}`);
            console.log('📋 Dados para atualizar:', dadosCliente);
            
            // Buscar a oportunidade primeiro para obter o clientId
            const oportunidade = await this.buscarOportunidadePorId(kentroId);
            if (!oportunidade) {
                throw new Error('Oportunidade não encontrada na Kentro');
            }
            
            // Preparar dados para atualização
            const cpfLimpo = dadosCliente.cpf ? dadosCliente.cpf.replace(/\D/g, '') : '';
            const telefoneLimpo = dadosCliente.telefone ? dadosCliente.telefone.replace(/\D/g, '') : '';
            
            // Parse existing form_data safely
            let formDataExistente = {};
            if (oportunidade.form_data) {
                try {
                    formDataExistente = typeof oportunidade.form_data === 'string' 
                        ? JSON.parse(oportunidade.form_data) 
                        : oportunidade.form_data;
                } catch (e) {
                    console.warn('⚠️ Erro ao parsear form_data existente:', e.message);
                    formDataExistente = {};
                }
            }
            
            const dadosAtualizacao = {
                id: kentroId,
                clientid: oportunidade.clientid || '',
                title: dadosCliente.nome || oportunidade.title || '',
                email: dadosCliente.email || oportunidade.email || '',
                phone: telefoneLimpo || oportunidade.phone || '',
                // Manter o mainmail existente se não houver CPF novo
                mainmail: cpfLimpo ? `${cpfLimpo}@lunasdigital.com` : oportunidade.mainmail || '',
                // Atualizar form_data com os novos dados
                form_data: JSON.stringify({
                    ...formDataExistente,
                    nome: dadosCliente.nome || '',
                    cpf: cpfLimpo,
                    email: dadosCliente.email || '',
                    telefone: telefoneLimpo,
                    data_nascimento: dadosCliente.dataNascimento || '',
                    nome_mae: dadosCliente.nomeMae || '',
                    cep: dadosCliente.endereco?.cep || '',
                    logradouro: dadosCliente.endereco?.logradouro || '',
                    numero: dadosCliente.endereco?.numero || '',
                    complemento: dadosCliente.endereco?.complemento || '',
                    bairro: dadosCliente.endereco?.bairro || '',
                    cidade: dadosCliente.endereco?.cidade || '',
                    uf: dadosCliente.endereco?.uf || '',
                    banco: dadosCliente.dadosBancarios?.banco || '',
                    agencia: dadosCliente.dadosBancarios?.agencia || '',
                    conta: dadosCliente.dadosBancarios?.conta || '',
                    tipo_conta: dadosCliente.dadosBancarios?.tipoConta || ''
                })
            };
            
            console.log('📤 Enviando atualização para Kentro:', dadosAtualizacao);
            
            const response = await fetch(`${this.baseUrl}/updateOpportunity`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    ...dadosAtualizacao
                })
            });
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }
            
            const resultado = await response.json();
            console.log('✅ Dados atualizados na Kentro:', resultado);
            
            return resultado;
            
        } catch (error) {
            console.error('❌ Erro ao atualizar dados na Kentro:', error);
            throw error;
        }
    }

    /**
     * Validar se a integração está funcionando
     */
    async testarConexao() {
        try {
            console.log('🧪 Testando conexão com API Kentro...');
            
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
            
            console.log(`✅ Conexão OK - ${count} oportunidades encontradas`);
            return { success: true, count };

        } catch (error) {
            console.error('❌ Falha na conexão:', error);
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

    /**
     * Mapear código/nome do banco para nome completo
     */
    mapearNomeBanco(bancoInput) {
        if (!bancoInput) return '';
        
        const bancoStr = bancoInput.toString().toLowerCase().trim();
        
        // Mapeamento de códigos para nomes
        const codigosBancos = {
            '001': 'Banco do Brasil',
            '033': 'Santander',
            '104': 'Caixa Econômica Federal',
            '237': 'Bradesco',
            '341': 'Itaú',
            '356': 'Banco Real',
            '422': 'Safra',
            '623': 'PAN',
            '707': 'Daycoval',
            '756': 'Sicoob',
            '748': 'Sicredi',
            '070': 'BRB',
            '077': 'Banco Inter',
            '260': 'Nu Pagamentos',
            '336': 'Banco C6',
            '290': 'PagSeguro',
            '323': 'Mercado Pago'
        };
        
        // Se for um código numérico, retornar nome do banco
        if (codigosBancos[bancoStr]) {
            return codigosBancos[bancoStr];
        }
        
        // Se já for um nome, retornar como está
        return bancoInput;
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
     * Formatar telefone com máscara
     */
    formatarTelefone(telefone) {
        const numeros = telefone.replace(/\D/g, '');
        if (numeros.length === 11) {
            return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (numeros.length === 10) {
            return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return telefone;
    }

    /**
     * Atualizar status da oportunidade na Kentro
     */
    async atualizarStatusOportunidade(kentroId, novoStageId, observacoes = '') {
        try {
            console.log(`🔄 Atualizando status da oportunidade ${kentroId} para stage ${novoStageId}`);
            
            const response = await fetch(`${this.baseUrl}/changeOpportunityStage`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    opportunityId: kentroId,
                    destStageId: novoStageId,
                    apiKey: this.apiKey,
                    obs: observacoes
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            const resultado = await response.json();
            console.log('✅ Status atualizado na Kentro:', resultado);
            
            return resultado;

        } catch (error) {
            console.error('❌ Erro ao atualizar status na Kentro:', error);
            throw error;
        }
    }

    /**
     * Atualizar dados do cliente na Kentro
     */
    async atualizarDadosCliente(kentroId, dadosCliente) {
        try {
            console.log(`🔄 Atualizando dados do cliente na Kentro ID: ${kentroId}`);
            console.log('📋 Dados para atualizar:', dadosCliente);
            
            // Buscar a oportunidade primeiro para obter o clientId
            const oportunidade = await this.buscarOportunidadePorId(kentroId);
            if (!oportunidade) {
                throw new Error('Oportunidade não encontrada na Kentro');
            }
            
            // Preparar dados para atualização
            const cpfLimpo = dadosCliente.cpf ? dadosCliente.cpf.replace(/\D/g, '') : '';
            const telefoneLimpo = dadosCliente.telefone ? dadosCliente.telefone.replace(/\D/g, '') : '';
            
            // Parse existing form_data safely
            let formDataExistente = {};
            if (oportunidade.form_data) {
                try {
                    formDataExistente = typeof oportunidade.form_data === 'string' 
                        ? JSON.parse(oportunidade.form_data) 
                        : oportunidade.form_data;
                } catch (e) {
                    console.warn('⚠️ Erro ao parsear form_data existente:', e.message);
                    formDataExistente = {};
                }
            }
            
            const dadosAtualizacao = {
                id: kentroId,
                clientid: oportunidade.clientid || '',
                title: dadosCliente.nome || oportunidade.title || '',
                email: dadosCliente.email || oportunidade.email || '',
                phone: telefoneLimpo || oportunidade.phone || '',
                // Manter o mainmail existente se não houver CPF novo
                mainmail: cpfLimpo ? `${cpfLimpo}@lunasdigital.com` : oportunidade.mainmail || '',
                // Atualizar form_data com os novos dados
                form_data: JSON.stringify({
                    ...formDataExistente,
                    nome: dadosCliente.nome || '',
                    cpf: cpfLimpo,
                    email: dadosCliente.email || '',
                    telefone: telefoneLimpo,
                    data_nascimento: dadosCliente.dataNascimento || '',
                    nome_mae: dadosCliente.nomeMae || '',
                    cep: dadosCliente.endereco?.cep || '',
                    logradouro: dadosCliente.endereco?.logradouro || '',
                    numero: dadosCliente.endereco?.numero || '',
                    complemento: dadosCliente.endereco?.complemento || '',
                    bairro: dadosCliente.endereco?.bairro || '',
                    cidade: dadosCliente.endereco?.cidade || '',
                    uf: dadosCliente.endereco?.uf || '',
                    banco: dadosCliente.dadosBancarios?.banco || '',
                    agencia: dadosCliente.dadosBancarios?.agencia || '',
                    conta: dadosCliente.dadosBancarios?.conta || '',
                    tipo_conta: dadosCliente.dadosBancarios?.tipoConta || ''
                })
            };
            
            console.log('📤 Enviando atualização para Kentro:', dadosAtualizacao);
            
            const response = await fetch(`${this.baseUrl}/updateOpportunity`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    ...dadosAtualizacao
                })
            });
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }
            
            const resultado = await response.json();
            console.log('✅ Dados atualizados na Kentro:', resultado);
            
            return resultado;
            
        } catch (error) {
            console.error('❌ Erro ao atualizar dados na Kentro:', error);
            throw error;
        }
    }

    /**
     * Validar se a integração está funcionando
     */
    async testarConexao() {
        try {
            console.log('🧪 Testando conexão com API Kentro...');
            
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
            
            console.log(`✅ Conexão OK - ${count} oportunidades encontradas`);
            return { success: true, count };

        } catch (error) {
            console.error('❌ Falha na conexão:', error);
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
