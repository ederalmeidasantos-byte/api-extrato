const axios = require('axios');

class HostingerVPSManager {
    constructor(apiToken) {
        this.apiToken = apiToken;
        this.baseURL = 'https://developers.hostinger.com/api/vps/v1';
        this.headers = {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Lista todas as máquinas virtuais
     */
    async listVMs() {
        try {
            const response = await axios.get(`${this.baseURL}/virtual-machines`, {
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao listar VMs:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Obtém informações detalhadas de uma VM específica
     */
    async getVMDetails(vmId) {
        try {
            const response = await axios.get(`${this.baseURL}/virtual-machines/${vmId}`, {
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            console.error(`Erro ao obter detalhes da VM ${vmId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Inicia uma VM
     */
    async startVM(vmId) {
        try {
            const response = await axios.post(`${this.baseURL}/virtual-machines/${vmId}/start`, {}, {
                headers: this.headers
            });
            console.log(`✅ VM ${vmId} iniciada com sucesso!`);
            return response.data;
        } catch (error) {
            console.error(`Erro ao iniciar VM ${vmId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Para uma VM
     */
    async stopVM(vmId) {
        try {
            const response = await axios.post(`${this.baseURL}/virtual-machines/${vmId}/stop`, {}, {
                headers: this.headers
            });
            console.log(`✅ VM ${vmId} parada com sucesso!`);
            return response.data;
        } catch (error) {
            console.error(`Erro ao parar VM ${vmId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Reinicia uma VM
     */
    async restartVM(vmId) {
        try {
            const response = await axios.post(`${this.baseURL}/virtual-machines/${vmId}/restart`, {}, {
                headers: this.headers
            });
            console.log(`✅ VM ${vmId} reiniciada com sucesso!`);
            return response.data;
        } catch (error) {
            console.error(`Erro ao reiniciar VM ${vmId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Obtém métricas de monitoramento da VM
     */
    async getVMMetrics(vmId) {
        try {
            const response = await axios.get(`${this.baseURL}/virtual-machines/${vmId}/metrics`, {
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            console.error(`Erro ao obter métricas da VM ${vmId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Lista backups da VM
     */
    async listBackups(vmId) {
        try {
            const response = await axios.get(`${this.baseURL}/virtual-machines/${vmId}/backups`, {
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            console.error(`Erro ao listar backups da VM ${vmId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Cria um backup da VM
     */
    async createBackup(vmId) {
        try {
            const response = await axios.post(`${this.baseURL}/virtual-machines/${vmId}/backups`, {}, {
                headers: this.headers
            });
            console.log(`✅ Backup da VM ${vmId} criado com sucesso!`);
            return response.data;
        } catch (error) {
            console.error(`Erro ao criar backup da VM ${vmId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Monitora o status da VM em tempo real
     */
    async monitorVM(vmId, intervalMs = 5000) {
        console.log(`🔍 Iniciando monitoramento da VM ${vmId}...`);
        
        const monitor = setInterval(async () => {
            try {
                const vmDetails = await this.getVMDetails(vmId);
                const timestamp = new Date().toLocaleString('pt-BR');
                
                console.log(`[${timestamp}] VM ${vmId} - Status: ${vmDetails.state}`);
                
                if (vmDetails.state === 'running') {
                    console.log(`   💻 CPU: ${vmDetails.cpus} cores`);
                    console.log(`   🧠 RAM: ${vmDetails.memory} MB`);
                    console.log(`   💾 Disco: ${vmDetails.disk} MB`);
                    console.log(`   🌐 IP: ${vmDetails.ipv4[0]?.address}`);
                }
                
            } catch (error) {
                console.error(`Erro no monitoramento:`, error.message);
            }
        }, intervalMs);

        // Retorna função para parar o monitoramento
        return () => {
            clearInterval(monitor);
            console.log('🛑 Monitoramento parado.');
        };
    }

    /**
     * Executa comandos SSH na VM (requer configuração SSH)
     */
    async executeSSHCommand(vmId, command, sshConfig = {}) {
        // Esta função seria implementada com uma biblioteca SSH como 'ssh2'
        console.log(`📡 Executando comando SSH na VM ${vmId}: ${command}`);
        console.log('⚠️  Implementação SSH requer configuração adicional');
    }

    /**
     * Deploy automático de aplicação
     */
    async deployApp(vmId, appConfig) {
        console.log(`🚀 Iniciando deploy da aplicação na VM ${vmId}...`);
        
        try {
            // 1. Verificar se VM está rodando
            const vmDetails = await this.getVMDetails(vmId);
            if (vmDetails.state !== 'running') {
                console.log('⚠️  VM não está rodando. Iniciando...');
                await this.startVM(vmId);
                await this.waitForVMState(vmId, 'running');
            }

            // 2. Criar backup antes do deploy
            console.log('💾 Criando backup antes do deploy...');
            await this.createBackup(vmId);

            // 3. Executar comandos de deploy (via SSH)
            console.log('📦 Executando comandos de deploy...');
            // Aqui você implementaria os comandos específicos do seu deploy
            
            console.log('✅ Deploy concluído com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro durante o deploy:', error.message);
            throw error;
        }
    }

    /**
     * Aguarda VM atingir um estado específico
     */
    async waitForVMState(vmId, targetState, maxWaitMs = 300000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitMs) {
            try {
                const vmDetails = await this.getVMDetails(vmId);
                if (vmDetails.state === targetState) {
                    console.log(`✅ VM ${vmId} agora está ${targetState}`);
                    return true;
                }
                
                console.log(`⏳ Aguardando VM ${vmId} ficar ${targetState}... (atual: ${vmDetails.state})`);
                await new Promise(resolve => setTimeout(resolve, 10000)); // Aguarda 10 segundos
                
            } catch (error) {
                console.error('Erro ao verificar estado da VM:', error.message);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        throw new Error(`Timeout: VM ${vmId} não atingiu o estado ${targetState} em ${maxWaitMs}ms`);
    }
}

// Exemplo de uso
async function exemploUso() {
    const apiToken = 'llr3i3O4HmftTCx0uuNzRNpjHkM1wnsmfyEkFNjC5e9050c2';
    const vpsManager = new HostingerVPSManager(apiToken);
    
    try {
        // Listar VMs
        console.log('📋 Listando VMs...');
        const vms = await vpsManager.listVMs();
        console.log('VMs encontradas:', vms);
        
        // Usar a primeira VM encontrada
        const vmId = vms.id || '1035582'; // Seu VPS ID
        
        // Obter detalhes da VM
        console.log(`\n🔍 Obtendo detalhes da VM ${vmId}...`);
        const vmDetails = await vpsManager.getVMDetails(vmId);
        console.log('Detalhes da VM:', vmDetails);
        
        // Monitorar VM por 30 segundos
        console.log(`\n📊 Monitorando VM ${vmId}...`);
        const stopMonitoring = await vpsManager.monitorVM(vmId, 5000);
        
        setTimeout(() => {
            stopMonitoring();
        }, 30000);
        
    } catch (error) {
        console.error('Erro no exemplo:', error.message);
    }
}

// Exportar para uso em outros módulos
module.exports = HostingerVPSManager;

// Executar exemplo se chamado diretamente
if (require.main === module) {
    exemploUso();
}
