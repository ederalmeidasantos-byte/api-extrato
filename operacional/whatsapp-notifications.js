/**
 * Sistema de Notificações WhatsApp
 * Envia mensagens automáticas baseadas no status da proposta
 */

class WhatsAppNotifications {
    constructor() {
        this.baseUrl = 'https://lunasdigital.atenderbem.com/int';
        this.apiKey = 'cd4d0509169d4e2ea9177ac66c1c9376';
    }

    /**
     * Enviar notificação baseada no status da proposta
     */
    async enviarNotificacaoStatus(proposta, cliente, statusConfig) {
        try {
            console.log(`📱 [WHATSAPP] Enviando notificação para status: ${statusConfig.nome}`);
            
            // Verificar se WhatsApp está ativo para este status
            if (!statusConfig.whatsapp || !statusConfig.whatsapp.ativo) {
                console.log(`⚠️ [WHATSAPP] Notificação desabilitada para status: ${statusConfig.nome}`);
                return { success: false, reason: 'whatsapp_disabled' };
            }

            // Verificar se cliente tem telefone
            if (!cliente.telefone) {
                console.log(`⚠️ [WHATSAPP] Cliente sem telefone: ${cliente.nome}`);
                return { success: false, reason: 'no_phone' };
            }

            // Formatar mensagem
            const mensagem = this.formatarMensagem(statusConfig.whatsapp.template, {
                nome: cliente.nome,
                etapa: statusConfig.nome,
                valor: this.formatarValor(proposta.valor),
                banco: proposta.banco || 'N/A',
                produto: proposta.produto || 'N/A'
            });

            // Aplicar delay se configurado
            if (statusConfig.whatsapp.delay > 0) {
                console.log(`⏰ [WHATSAPP] Aplicando delay de ${statusConfig.whatsapp.delay} minutos`);
                setTimeout(() => {
                    this.enviarMensagem(cliente.telefone, mensagem, statusConfig);
                }, statusConfig.whatsapp.delay * 60 * 1000);
                return { success: true, reason: 'scheduled' };
            }

            // Enviar imediatamente
            return await this.enviarMensagem(cliente.telefone, mensagem, statusConfig);

        } catch (error) {
            console.error('❌ [WHATSAPP] Erro ao enviar notificação:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Formatar mensagem com variáveis
     */
    formatarMensagem(template, variaveis) {
        let mensagem = template;
        
        // Substituir variáveis
        Object.keys(variaveis).forEach(key => {
            const regex = new RegExp(`{${key}}`, 'g');
            mensagem = mensagem.replace(regex, variaveis[key] || '');
        });

        return mensagem;
    }

    /**
     * Formatar valor monetário
     */
    formatarValor(valor) {
        if (!valor) return 'N/A';
        
        const numValor = parseFloat(valor);
        if (isNaN(numValor)) return 'N/A';
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(numValor);
    }

    /**
     * Enviar mensagem via API Kentro
     */
    async enviarMensagem(telefone, mensagem, statusConfig) {
        try {
            console.log(`📤 [WHATSAPP] Enviando para ${telefone}: ${mensagem.substring(0, 50)}...`);
            
            // Limpar telefone (remover caracteres especiais)
            const telefoneLimpo = telefone.replace(/\D/g, '');
            
            // Preparar payload para Kentro
            const payload = {
                apiKey: this.apiKey,
                phone: telefoneLimpo,
                message: mensagem,
                priority: statusConfig.whatsapp.prioridade || 'normal',
                status: statusConfig.id,
                metadata: {
                    tipo: 'status_notification',
                    statusId: statusConfig.id,
                    timestamp: new Date().toISOString()
                }
            };

            // Enviar via API Kentro (simulado por enquanto)
            const response = await this.simularEnvioWhatsApp(payload);
            
            if (response.success) {
                console.log(`✅ [WHATSAPP] Mensagem enviada com sucesso para ${telefone}`);
                return { success: true, messageId: response.messageId };
            } else {
                console.log(`❌ [WHATSAPP] Falha ao enviar mensagem: ${response.error}`);
                return { success: false, error: response.error };
            }

        } catch (error) {
            console.error('❌ [WHATSAPP] Erro ao enviar mensagem:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Simular envio WhatsApp (implementação temporária)
     * TODO: Implementar integração real com API Kentro
     */
    async simularEnvioWhatsApp(payload) {
        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simular sucesso (90% das vezes)
        const sucesso = Math.random() > 0.1;
        
        if (sucesso) {
            return {
                success: true,
                messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString()
            };
        } else {
            return {
                success: false,
                error: 'Falha na entrega da mensagem'
            };
        }
    }

    /**
     * Enviar notificação de criação de proposta
     */
    async notificarCriacaoProposta(proposta, cliente) {
        try {
            console.log(`📱 [WHATSAPP] Notificando criação de proposta para ${cliente.nome}`);
            
            const mensagem = `Olá ${cliente.nome}! Sua proposta foi criada com sucesso. Em breve entraremos em contato para dar continuidade ao processo.`;
            
            return await this.enviarMensagem(cliente.telefone, mensagem, {
                whatsapp: { prioridade: 'normal' }
            });

        } catch (error) {
            console.error('❌ [WHATSAPP] Erro ao notificar criação:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Enviar notificação de aprovação
     */
    async notificarAprovacao(proposta, cliente) {
        try {
            console.log(`📱 [WHATSAPP] Notificando aprovação para ${cliente.nome}`);
            
            const valor = this.formatarValor(proposta.valor);
            const mensagem = `🎉 Parabéns ${cliente.nome}! Sua proposta foi aprovada no valor de ${valor}. Em breve você receberá mais informações sobre a liberação.`;
            
            return await this.enviarMensagem(cliente.telefone, mensagem, {
                whatsapp: { prioridade: 'alta' }
            });

        } catch (error) {
            console.error('❌ [WHATSAPP] Erro ao notificar aprovação:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Enviar notificação de rejeição
     */
    async notificarRejeicao(proposta, cliente, motivo = '') {
        try {
            console.log(`📱 [WHATSAPP] Notificando rejeição para ${cliente.nome}`);
            
            let mensagem = `Olá ${cliente.nome}, infelizmente sua proposta não foi aprovada no momento.`;
            
            if (motivo) {
                mensagem += ` Motivo: ${motivo}`;
            }
            
            mensagem += ` Nossa equipe entrará em contato para orientações sobre próximos passos.`;
            
            return await this.enviarMensagem(cliente.telefone, mensagem, {
                whatsapp: { prioridade: 'normal' }
            });

        } catch (error) {
            console.error('❌ [WHATSAPP] Erro ao notificar rejeição:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Verificar se notificação está habilitada para status
     */
    isNotificacaoHabilitada(statusConfig) {
        return statusConfig && 
               statusConfig.whatsapp && 
               statusConfig.whatsapp.ativo === true;
    }

    /**
     * Obter configuração de notificação para status
     */
    getConfiguracaoNotificacao(statusConfig) {
        if (!this.isNotificacaoHabilitada(statusConfig)) {
            return null;
        }

        return {
            template: statusConfig.whatsapp.template,
            prioridade: statusConfig.whatsapp.prioridade || 'normal',
            delay: statusConfig.whatsapp.delay || 0,
            variaveis: statusConfig.whatsapp.variaveis || []
        };
    }
}

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhatsAppNotifications;
}

// Instância global para uso no frontend
if (typeof window !== 'undefined') {
    window.whatsappNotifications = new WhatsAppNotifications();
}

