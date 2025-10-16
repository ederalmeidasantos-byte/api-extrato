// 🚀 Automação Completa VPS + Docker + API Hostinger
// Integração completa para gerenciar VPS via API e Docker

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class HostingerDockerAutomation {
    constructor() {
        this.apiToken = 'llr3i3O4HmftTCx0uuNzRNpjHkM1wnsmfyEkFNjC5e9050c2';
        this.baseURL = 'https://developers.hostinger.com/api/vps/v1';
        this.vmId = '1035582';
        this.vpsIP = '72.60.159.149';
        this.headers = {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
        };
        
        // Configurações Docker
        this.dockerConfig = {
            crm: {
                name: 'crm-lunas-digital',
                port: 3001,
                path: '/opt/lunasdigital/crm-lunasdigital'
            },
            inss: {
                name: 'inss-lunas-digital', 
                port: 3002,
                path: '/opt/lunasdigital/inss-simulador'
            },
            nginx: {
                name: 'nginx-lunas-digital',
                port: 80,
                configPath: '/etc/nginx/sites-available/lunasdigital'
            }
        };
    }

    /**
     * 🖥️ Gerenciamento do VPS via API Hostinger
     */
    
    async getVPSStatus() {
        try {
            const response = await axios.get(`${this.baseURL}/virtual-machines/${this.vmId}`, {
                headers: this.headers
            });
            return {
                success: true,
                data: response.data,
                status: response.data.state
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    async createVPSBackup() {
        try {
            const response = await axios.post(`${this.baseURL}/virtual-machines/${this.vmId}/backups`, {}, {
                headers: this.headers
            });
            return {
                success: true,
                data: response.data,
                message: 'Backup do VPS criado com sucesso!'
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    async restartVPS() {
        try {
            const response = await axios.post(`${this.baseURL}/virtual-machines/${this.vmId}/restart`, {}, {
                headers: this.headers
            });
            return {
                success: true,
                data: response.data,
                message: 'VPS reiniciado com sucesso!'
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * 🐳 Gerenciamento Docker
     */
    
    async getDockerStatus() {
        try {
            const { stdout } = await execAsync('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"');
            return {
                success: true,
                containers: stdout.trim().split('\n').slice(1).map(line => {
                    const [name, status, ports] = line.split('\t');
                    return { name, status, ports };
                })
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async startDockerContainer(containerName) {
        try {
            const { stdout } = await execAsync(`docker start ${containerName}`);
            return {
                success: true,
                message: `Container ${containerName} iniciado com sucesso!`,
                output: stdout
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async stopDockerContainer(containerName) {
        try {
            const { stdout } = await execAsync(`docker stop ${containerName}`);
            return {
                success: true,
                message: `Container ${containerName} parado com sucesso!`,
                output: stdout
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async restartDockerContainer(containerName) {
        try {
            const { stdout } = await execAsync(`docker restart ${containerName}`);
            return {
                success: true,
                message: `Container ${containerName} reiniciado com sucesso!`,
                output: stdout
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getDockerLogs(containerName, lines = 50) {
        try {
            const { stdout } = await execAsync(`docker logs --tail ${lines} ${containerName}`);
            return {
                success: true,
                logs: stdout
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🚀 Deploy Automático Completo
     */
    
    async deployComplete() {
        console.log('🚀 Iniciando deploy completo...');
        
        try {
            // 1. Verificar VPS
            console.log('1️⃣ Verificando status do VPS...');
            const vpsStatus = await this.getVPSStatus();
            if (!vpsStatus.success) {
                throw new Error(`VPS offline: ${vpsStatus.error}`);
            }
            console.log(`✅ VPS Status: ${vpsStatus.data.state}`);

            // 2. Criar backup antes do deploy
            console.log('2️⃣ Criando backup do VPS...');
            const backup = await this.createVPSBackup();
            if (!backup.success) {
                console.warn(`⚠️  Backup falhou: ${backup.error}`);
            } else {
                console.log('✅ Backup criado!');
            }

            // 3. Verificar containers atuais
            console.log('3️⃣ Verificando containers Docker...');
            const dockerStatus = await this.getDockerStatus();
            if (dockerStatus.success) {
                console.log('📋 Containers atuais:');
                dockerStatus.containers.forEach(container => {
                    console.log(`   - ${container.name}: ${container.status}`);
                });
            }

            // 4. Parar containers para deploy
            console.log('4️⃣ Parando containers para deploy...');
            const containers = ['crm-lunas-digital', 'inss-lunas-digital', 'nginx-lunas-digital'];
            for (const container of containers) {
                try {
                    await this.stopDockerContainer(container);
                    console.log(`✅ ${container} parado`);
                } catch (error) {
                    console.log(`⚠️  ${container} não estava rodando`);
                }
            }

            // 5. Executar deploy dos serviços
            console.log('5️⃣ Executando deploy dos serviços...');
            
            // Deploy CRM
            console.log('   📦 Deploy CRM...');
            try {
                const { stdout: crmDeploy } = await execAsync(`
                    cd ${this.dockerConfig.crm.path} && 
                    docker-compose down && 
                    docker-compose build --no-cache && 
                    docker-compose up -d
                `);
                console.log('✅ CRM deployado!');
            } catch (error) {
                console.error('❌ Erro no deploy CRM:', error.message);
            }

            // Deploy INSS
            console.log('   📦 Deploy INSS...');
            try {
                const { stdout: inssDeploy } = await execAsync(`
                    cd ${this.dockerConfig.inss.path} && 
                    docker-compose down && 
                    docker-compose build --no-cache && 
                    docker-compose up -d
                `);
                console.log('✅ INSS deployado!');
            } catch (error) {
                console.error('❌ Erro no deploy INSS:', error.message);
            }

            // 6. Configurar Nginx
            console.log('6️⃣ Configurando Nginx...');
            try {
                await execAsync('nginx -t');
                await execAsync('systemctl reload nginx');
                console.log('✅ Nginx configurado!');
            } catch (error) {
                console.error('❌ Erro no Nginx:', error.message);
            }

            // 7. Verificar serviços
            console.log('7️⃣ Verificando serviços...');
            await new Promise(resolve => setTimeout(resolve, 10000)); // Aguarda 10s
            
            const finalStatus = await this.getDockerStatus();
            if (finalStatus.success) {
                console.log('📋 Status final dos containers:');
                finalStatus.containers.forEach(container => {
                    console.log(`   - ${container.name}: ${container.status}`);
                });
            }

            // 8. Testar conectividade
            console.log('8️⃣ Testando conectividade...');
            const services = [
                { name: 'CRM', url: `http://${this.vpsIP}:3001` },
                { name: 'INSS', url: `http://${this.vpsIP}:3002` },
                { name: 'Nginx', url: `http://${this.vpsIP}` }
            ];

            for (const service of services) {
                try {
                    const response = await axios.get(service.url, { timeout: 5000 });
                    console.log(`✅ ${service.name}: Online (${response.status})`);
                } catch (error) {
                    console.log(`❌ ${service.name}: Offline`);
                }
            }

            console.log('🎉 Deploy completo finalizado!');
            return {
                success: true,
                message: 'Deploy completo executado com sucesso!',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Erro durante deploy:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 📊 Monitoramento Completo
     */
    
    async getCompleteStatus() {
        try {
            const [vpsStatus, dockerStatus] = await Promise.all([
                this.getVPSStatus(),
                this.getDockerStatus()
            ]);

            // Verificar serviços HTTP
            const services = [
                { name: 'CRM', url: `http://${this.vpsIP}:3001/health` },
                { name: 'INSS', url: `http://${this.vpsIP}:3002/health` },
                { name: 'Nginx', url: `http://${this.vpsIP}` }
            ];

            const serviceStatus = [];
            for (const service of services) {
                try {
                    const response = await axios.get(service.url, { timeout: 3000 });
                    serviceStatus.push({
                        name: service.name,
                        status: 'online',
                        responseTime: response.headers['x-response-time'] || 'N/A',
                        statusCode: response.status
                    });
                } catch (error) {
                    serviceStatus.push({
                        name: service.name,
                        status: 'offline',
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                data: {
                    vps: vpsStatus,
                    docker: dockerStatus,
                    services: serviceStatus,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🔄 Backup Completo do Sistema
     */
    
    async createCompleteBackup() {
        console.log('💾 Iniciando backup completo do sistema...');
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = `/opt/lunasdigital/backups/backup-${timestamp}`;
            
            // 1. Criar backup do VPS via API
            console.log('1️⃣ Criando backup do VPS...');
            const vpsBackup = await this.createVPSBackup();
            
            // 2. Criar diretório de backup local
            console.log('2️⃣ Criando backup local...');
            await execAsync(`mkdir -p ${backupDir}`);
            
            // 3. Backup dos containers Docker
            console.log('3️⃣ Fazendo backup dos containers...');
            const containers = ['crm-lunas-digital', 'inss-lunas-digital'];
            for (const container of containers) {
                try {
                    await execAsync(`docker save ${container} > ${backupDir}/${container}.tar`);
                    console.log(`✅ ${container} salvo`);
                } catch (error) {
                    console.log(`⚠️  Erro ao salvar ${container}: ${error.message}`);
                }
            }
            
            // 4. Backup das configurações
            console.log('4️⃣ Fazendo backup das configurações...');
            await execAsync(`cp -r /etc/nginx ${backupDir}/`);
            await execAsync(`cp -r /opt/lunasdigital/configs ${backupDir}/`);
            
            // 5. Backup dos dados (se houver bancos)
            console.log('5️⃣ Fazendo backup dos dados...');
            try {
                await execAsync(`docker exec crm-lunas-digital pg_dump -U postgres crm_db > ${backupDir}/crm_db.sql`);
                await execAsync(`docker exec inss-lunas-digital pg_dump -U postgres inss_db > ${backupDir}/inss_db.sql`);
                console.log('✅ Dados salvos');
            } catch (error) {
                console.log('⚠️  Bancos de dados não encontrados');
            }
            
            // 6. Compactar backup
            console.log('6️⃣ Compactando backup...');
            await execAsync(`tar -czf ${backupDir}.tar.gz -C /opt/lunasdigital/backups backup-${timestamp}`);
            await execAsync(`rm -rf ${backupDir}`);
            
            console.log(`✅ Backup completo criado: backup-${timestamp}.tar.gz`);
            
            return {
                success: true,
                message: 'Backup completo criado com sucesso!',
                backupFile: `backup-${timestamp}.tar.gz`,
                vpsBackup: vpsBackup
            };
            
        } catch (error) {
            console.error('❌ Erro durante backup:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🔄 Restore do Sistema
     */
    
    async restoreSystem(backupFile) {
        console.log(`🔄 Iniciando restore do backup: ${backupFile}`);
        
        try {
            const backupPath = `/opt/lunasdigital/backups/${backupFile}`;
            
            // 1. Verificar se arquivo existe
            try {
                await fs.access(backupPath);
            } catch (error) {
                throw new Error(`Arquivo de backup não encontrado: ${backupPath}`);
            }
            
            // 2. Parar containers
            console.log('1️⃣ Parando containers...');
            const containers = ['crm-lunas-digital', 'inss-lunas-digital', 'nginx-lunas-digital'];
            for (const container of containers) {
                try {
                    await this.stopDockerContainer(container);
                } catch (error) {
                    console.log(`⚠️  ${container} não estava rodando`);
                }
            }
            
            // 3. Extrair backup
            console.log('2️⃣ Extraindo backup...');
            const extractDir = `/tmp/restore-${Date.now()}`;
            await execAsync(`mkdir -p ${extractDir}`);
            await execAsync(`tar -xzf ${backupPath} -C ${extractDir}`);
            
            // 4. Restaurar containers
            console.log('3️⃣ Restaurando containers...');
            const containerFiles = ['crm-lunas-digital.tar', 'inss-lunas-digital.tar'];
            for (const file of containerFiles) {
                try {
                    await execAsync(`docker load < ${extractDir}/backup-*/${file}`);
                    console.log(`✅ ${file} restaurado`);
                } catch (error) {
                    console.log(`⚠️  Erro ao restaurar ${file}: ${error.message}`);
                }
            }
            
            // 5. Restaurar configurações
            console.log('4️⃣ Restaurando configurações...');
            await execAsync(`cp -r ${extractDir}/backup-*/nginx /etc/`);
            await execAsync(`cp -r ${extractDir}/backup-*/configs /opt/lunasdigital/`);
            
            // 6. Reiniciar serviços
            console.log('5️⃣ Reiniciando serviços...');
            await execAsync('systemctl restart nginx');
            
            // 7. Iniciar containers
            console.log('6️⃣ Iniciando containers...');
            for (const container of containers) {
                try {
                    await this.startDockerContainer(container);
                    console.log(`✅ ${container} iniciado`);
                } catch (error) {
                    console.log(`⚠️  Erro ao iniciar ${container}: ${error.message}`);
                }
            }
            
            // 8. Limpar arquivos temporários
            await execAsync(`rm -rf ${extractDir}`);
            
            console.log('✅ Restore concluído com sucesso!');
            
            return {
                success: true,
                message: 'Restore executado com sucesso!',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Erro durante restore:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 📊 Monitoramento Contínuo
     */
    
    async startContinuousMonitoring(intervalMs = 60000) {
        console.log('📊 Iniciando monitoramento contínuo...');
        
        const monitor = setInterval(async () => {
            try {
                const timestamp = new Date().toLocaleString('pt-BR');
                console.log(`\n[${timestamp}] === MONITORAMENTO SISTEMA ===`);
                
                const status = await this.getCompleteStatus();
                
                if (status.success) {
                    // Status VPS
                    const vpsState = status.data.vps.data?.state;
                    console.log(`🖥️  VPS Status: ${vpsState}`);
                    
                    // Status Docker
                    if (status.data.docker.success) {
                        console.log('🐳 Containers Docker:');
                        status.data.docker.containers.forEach(container => {
                            console.log(`   - ${container.name}: ${container.status}`);
                        });
                    }
                    
                    // Status Serviços
                    console.log('🌐 Serviços HTTP:');
                    status.data.services.forEach(service => {
                        if (service.status === 'online') {
                            console.log(`   ✅ ${service.name}: Online (${service.statusCode})`);
                        } else {
                            console.log(`   ❌ ${service.name}: Offline`);
                        }
                    });
                    
                    // Alertas
                    const offlineServices = status.data.services.filter(s => s.status === 'offline');
                    if (offlineServices.length > 0) {
                        console.log(`⚠️  ALERTA: ${offlineServices.length} serviços offline!`);
                        // Aqui você pode implementar notificações por email/SMS
                    }
                    
                } else {
                    console.error('❌ Erro no monitoramento:', status.error);
                }
                
            } catch (error) {
                console.error('❌ Erro no monitoramento contínuo:', error.message);
            }
        }, intervalMs);

        // Retorna função para parar monitoramento
        return () => {
            clearInterval(monitor);
            console.log('🛑 Monitoramento contínuo parado.');
        };
    }
}

// Exemplo de uso
async function exemploCompleto() {
    const automation = new HostingerDockerAutomation();
    
    try {
        console.log('🚀 === AUTOMAÇÃO COMPLETA VPS + DOCKER ===\n');
        
        // 1. Status completo
        console.log('1️⃣ Obtendo status completo...');
        const status = await automation.getCompleteStatus();
        if (status.success) {
            console.log('📊 Status do sistema:', JSON.stringify(status.data, null, 2));
        }
        
        // 2. Backup completo
        console.log('\n2️⃣ Criando backup completo...');
        const backup = await automation.createCompleteBackup();
        if (backup.success) {
            console.log('✅ Backup criado:', backup.backupFile);
        }
        
        // 3. Deploy completo
        console.log('\n3️⃣ Executando deploy completo...');
        const deploy = await automation.deployComplete();
        if (deploy.success) {
            console.log('✅ Deploy concluído!');
        }
        
        // 4. Monitoramento por 2 minutos
        console.log('\n4️⃣ Iniciando monitoramento...');
        const stopMonitoring = await automation.startContinuousMonitoring(30000);
        
        setTimeout(() => {
            stopMonitoring();
            console.log('\n✅ Exemplo completo finalizado!');
        }, 120000); // 2 minutos
        
    } catch (error) {
        console.error('❌ Erro no exemplo:', error.message);
    }
}

// Exportar classe
export default HostingerDockerAutomation;

// Executar exemplo se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    exemploCompleto();
}
