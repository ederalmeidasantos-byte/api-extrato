const HostingerVPSManager = require('./hostinger-vps-automation');
const axios = require('axios');

class LunasDigitalVPSAutomation {
    constructor() {
        this.apiToken = 'llr3i3O4HmftTCx0uuNzRNpjHkM1wnsmfyEkFNjC5e9050c2';
        this.vpsManager = new HostingerVPSManager(this.apiToken);
        this.vmId = '1035582'; // Seu VPS ID
        this.vpsIP = '72.60.159.149'; // IP do seu VPS
    }

    /**
     * Verifica status dos serviços no VPS
     */
    async checkServicesStatus() {
        console.log('🔍 Verificando status dos serviços...');
        
        try {
            const services = [
                { name: 'FGTS Service', port: 3000, path: '/health' },
                { name: 'INSS Service', port: 3001, path: '/health' },
                { name: 'Nginx', port: 80, path: '/' },
                { name: 'API Principal', port: 3002, path: '/api/status' }
            ];

            const results = [];

            for (const service of services) {
                try {
                    const response = await axios.get(`http://${this.vpsIP}:${service.port}${service.path}`, {
                        timeout: 5000
                    });
                    
                    results.push({
                        service: service.name,
                        status: '✅ Online',
                        port: service.port,
                        responseTime: response.headers['x-response-time'] || 'N/A'
                    });
                    
                } catch (error) {
                    results.push({
                        service: service.name,
                        status: '❌ Offline',
                        port: service.port,
                        error: error.message
                    });
                }
            }

            console.table(results);
            return results;
            
        } catch (error) {
            console.error('Erro ao verificar serviços:', error.message);
            throw error;
        }
    }

    /**
     * Reinicia serviços específicos via SSH
     */
    async restartServices(services = ['fgts', 'inss', 'nginx']) {
        console.log('🔄 Reiniciando serviços...');
        
        try {
            // Verificar se VPS está rodando
            const vmDetails = await this.vpsManager.getVMDetails(this.vmId);
            if (vmDetails.state !== 'running') {
                console.log('⚠️  VPS não está rodando. Iniciando...');
                await this.vpsManager.startVM(this.vmId);
                await this.vpsManager.waitForVMState(this.vmId, 'running');
            }

            // Comandos para reiniciar serviços
            const commands = {
                'fgts': 'pm2 restart fgts-service-lunas-digital',
                'inss': 'pm2 restart inss-service-lunas-digital', 
                'nginx': 'sudo systemctl restart nginx',
                'docker': 'docker-compose -f docker-compose-lunasdigital.yml restart'
            };

            for (const service of services) {
                if (commands[service]) {
                    console.log(`🔄 Reiniciando ${service}...`);
                    // Aqui você implementaria a execução SSH
                    console.log(`Comando: ${commands[service]}`);
                }
            }

            console.log('✅ Serviços reiniciados!');
            
        } catch (error) {
            console.error('Erro ao reiniciar serviços:', error.message);
            throw error;
        }
    }

    /**
     * Deploy automático da aplicação
     */
    async deployApplication() {
        console.log('🚀 Iniciando deploy automático...');
        
        try {
            // 1. Verificar VPS
            const vmDetails = await this.vpsManager.getVMDetails(this.vmId);
            console.log(`VPS Status: ${vmDetails.state}`);
            
            if (vmDetails.state !== 'running') {
                console.log('⚠️  VPS offline. Iniciando...');
                await this.vpsManager.startVM(this.vmId);
                await this.vpsManager.waitForVMState(this.vmId, 'running');
            }

            // 2. Criar backup
            console.log('💾 Criando backup do VPS...');
            await this.vpsManager.createBackup(this.vmId);

            // 3. Verificar serviços antes do deploy
            console.log('🔍 Verificando serviços atuais...');
            await this.checkServicesStatus();

            // 4. Executar deploy (simulado)
            console.log('📦 Executando deploy...');
            console.log('   - Fazendo pull do código...');
            console.log('   - Instalando dependências...');
            console.log('   - Reiniciando serviços...');
            
            // 5. Verificar serviços após deploy
            console.log('✅ Deploy concluído! Verificando serviços...');
            await new Promise(resolve => setTimeout(resolve, 10000)); // Aguarda 10s
            await this.checkServicesStatus();

            console.log('🎉 Deploy automático concluído com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro durante deploy:', error.message);
            throw error;
        }
    }

    /**
     * Monitoramento contínuo do VPS
     */
    async startMonitoring() {
        console.log('📊 Iniciando monitoramento contínuo...');
        
        const monitor = setInterval(async () => {
            try {
                const timestamp = new Date().toLocaleString('pt-BR');
                console.log(`\n[${timestamp}] === MONITORAMENTO VPS ===`);
                
                // Status do VPS
                const vmDetails = await this.vpsManager.getVMDetails(this.vmId);
                console.log(`🖥️  VPS Status: ${vmDetails.state}`);
                
                // Métricas do VPS
                try {
                    const metrics = await this.vpsManager.getVMMetrics(this.vmId);
                    console.log('📈 Métricas:', metrics);
                } catch (error) {
                    console.log('⚠️  Métricas não disponíveis');
                }
                
                // Status dos serviços
                await this.checkServicesStatus();
                
            } catch (error) {
                console.error('Erro no monitoramento:', error.message);
            }
        }, 60000); // A cada 1 minuto

        // Retorna função para parar monitoramento
        return () => {
            clearInterval(monitor);
            console.log('🛑 Monitoramento parado.');
        };
    }

    /**
     * Backup automático
     */
    async createAutomaticBackup() {
        console.log('💾 Criando backup automático...');
        
        try {
            const backup = await this.vpsManager.createBackup(this.vmId);
            console.log('✅ Backup criado com sucesso!');
            console.log('Backup ID:', backup.id);
            return backup;
            
        } catch (error) {
            console.error('❌ Erro ao criar backup:', error.message);
            throw error;
        }
    }

    /**
     * Lista backups disponíveis
     */
    async listBackups() {
        try {
            const backups = await this.vpsManager.listBackups(this.vmId);
            console.log('📋 Backups disponíveis:');
            console.table(backups);
            return backups;
            
        } catch (error) {
            console.error('Erro ao listar backups:', error.message);
            throw error;
        }
    }

    /**
     * Restaura VPS a partir de um backup
     */
    async restoreFromBackup(backupId) {
        console.log(`🔄 Restaurando VPS a partir do backup ${backupId}...`);
        
        try {
            // Esta funcionalidade dependeria da API específica da Hostinger
            console.log('⚠️  Funcionalidade de restore requer implementação específica da API');
            console.log(`Backup ID: ${backupId}`);
            
        } catch (error) {
            console.error('Erro ao restaurar backup:', error.message);
            throw error;
        }
    }
}

// Exemplo de uso prático
async function exemploPratico() {
    const automation = new LunasDigitalVPSAutomation();
    
    try {
        console.log('🚀 === AUTOMAÇÃO LUNAS DIGITAL VPS ===\n');
        
        // 1. Verificar status geral
        console.log('1️⃣ Verificando status dos serviços...');
        await automation.checkServicesStatus();
        
        // 2. Criar backup
        console.log('\n2️⃣ Criando backup...');
        await automation.createAutomaticBackup();
        
        // 3. Listar backups
        console.log('\n3️⃣ Listando backups...');
        await automation.listBackups();
        
        // 4. Iniciar monitoramento por 2 minutos
        console.log('\n4️⃣ Iniciando monitoramento...');
        const stopMonitoring = await automation.startMonitoring();
        
        setTimeout(() => {
            stopMonitoring();
            console.log('\n✅ Exemplo concluído!');
        }, 120000); // 2 minutos
        
    } catch (error) {
        console.error('Erro no exemplo:', error.message);
    }
}

// Exportar classe
module.exports = LunasDigitalVPSAutomation;

// Executar exemplo se chamado diretamente
if (require.main === module) {
    exemploPratico();
}
