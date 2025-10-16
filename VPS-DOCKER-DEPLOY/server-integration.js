// 🚀 Integração VPS + Docker para server.js
// Adicione estas rotas ao seu server.js existente

import HostingerDockerAutomation from './VPS-DOCKER-DEPLOY/hostinger-docker-automation.js';

// Inicializar automação completa
const vpsDockerAutomation = new HostingerDockerAutomation();

// ================== ROTAS VPS + DOCKER AUTOMATION ==================

/**
 * GET /api/system/status
 * Status completo do sistema (VPS + Docker + Serviços)
 */
app.get('/api/system/status', async (req, res) => {
    try {
        const status = await vpsDockerAutomation.getCompleteStatus();
        
        if (status.success) {
            res.json({
                success: true,
                message: 'Status completo obtido',
                data: status.data
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro ao obter status completo',
                error: status.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

/**
 * POST /api/system/deploy
 * Deploy completo do sistema
 */
app.post('/api/system/deploy', async (req, res) => {
    try {
        // Verificar autenticação
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token de autorização necessário para deploy'
            });
        }

        const deploy = await vpsDockerAutomation.deployComplete();
        
        if (deploy.success) {
            res.json({
                success: true,
                message: deploy.message,
                timestamp: deploy.timestamp
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro durante deploy',
                error: deploy.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

/**
 * POST /api/system/backup
 * Backup completo do sistema
 */
app.post('/api/system/backup', async (req, res) => {
    try {
        const backup = await vpsDockerAutomation.createCompleteBackup();
        
        if (backup.success) {
            res.json({
                success: true,
                message: backup.message,
                backupFile: backup.backupFile,
                vpsBackup: backup.vpsBackup
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro ao criar backup',
                error: backup.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

/**
 * POST /api/system/restore
 * Restore do sistema a partir de backup
 */
app.post('/api/system/restore', async (req, res) => {
    try {
        const { backupFile } = req.body;
        
        if (!backupFile) {
            return res.status(400).json({
                success: false,
                message: 'Nome do arquivo de backup é obrigatório'
            });
        }

        // Verificar autenticação para restore
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token de autorização necessário para restore'
            });
        }

        const restore = await vpsDockerAutomation.restoreSystem(backupFile);
        
        if (restore.success) {
            res.json({
                success: true,
                message: restore.message,
                timestamp: restore.timestamp
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro durante restore',
                error: restore.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

/**
 * GET /api/docker/status
 * Status dos containers Docker
 */
app.get('/api/docker/status', async (req, res) => {
    try {
        const dockerStatus = await vpsDockerAutomation.getDockerStatus();
        
        if (dockerStatus.success) {
            res.json({
                success: true,
                message: 'Status Docker obtido',
                containers: dockerStatus.containers
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro ao obter status Docker',
                error: dockerStatus.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

/**
 * POST /api/docker/restart/:container
 * Reiniciar container específico
 */
app.post('/api/docker/restart/:container', async (req, res) => {
    try {
        const { container } = req.params;
        
        const restart = await vpsDockerAutomation.restartDockerContainer(container);
        
        if (restart.success) {
            res.json({
                success: true,
                message: restart.message,
                output: restart.output
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro ao reiniciar container',
                error: restart.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

/**
 * GET /api/docker/logs/:container
 * Logs de container específico
 */
app.get('/api/docker/logs/:container', async (req, res) => {
    try {
        const { container } = req.params;
        const { lines = 50 } = req.query;
        
        const logs = await vpsDockerAutomation.getDockerLogs(container, parseInt(lines));
        
        if (logs.success) {
            res.json({
                success: true,
                message: 'Logs obtidos com sucesso',
                container: container,
                logs: logs.logs
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro ao obter logs',
                error: logs.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

/**
 * GET /api/vps/status
 * Status do VPS via API Hostinger
 */
app.get('/api/vps/status', async (req, res) => {
    try {
        const vpsStatus = await vpsDockerAutomation.getVPSStatus();
        
        if (vpsStatus.success) {
            res.json({
                success: true,
                message: 'Status VPS obtido',
                data: vpsStatus.data
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro ao obter status VPS',
                error: vpsStatus.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

/**
 * POST /api/vps/backup
 * Criar backup do VPS via API Hostinger
 */
app.post('/api/vps/backup', async (req, res) => {
    try {
        const backup = await vpsDockerAutomation.createVPSBackup();
        
        if (backup.success) {
            res.json({
                success: true,
                message: backup.message,
                data: backup.data
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro ao criar backup VPS',
                error: backup.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

/**
 * POST /api/vps/restart
 * Reiniciar VPS via API Hostinger
 */
app.post('/api/vps/restart', async (req, res) => {
    try {
        // Verificar autenticação
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token de autorização necessário para reiniciar VPS'
            });
        }

        const restart = await vpsDockerAutomation.restartVPS();
        
        if (restart.success) {
            res.json({
                success: true,
                message: restart.message,
                data: restart.data
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro ao reiniciar VPS',
                error: restart.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

/**
 * GET /api/services/health
 * Health check de todos os serviços
 */
app.get('/api/services/health', async (req, res) => {
    try {
        const status = await vpsDockerAutomation.getCompleteStatus();
        
        if (status.success) {
            const healthStatus = {
                timestamp: new Date().toISOString(),
                vps: {
                    status: status.data.vps.data?.state || 'unknown',
                    id: status.data.vps.data?.id || 'unknown'
                },
                docker: {
                    containers: status.data.docker.containers?.length || 0,
                    status: status.data.docker.success ? 'healthy' : 'unhealthy'
                },
                services: status.data.services.map(service => ({
                    name: service.name,
                    status: service.status,
                    statusCode: service.statusCode || null
                }))
            };
            
            // Determinar status geral
            const allServicesOnline = status.data.services.every(s => s.status === 'online');
            const vpsOnline = status.data.vps.data?.state === 'running';
            const dockerHealthy = status.data.docker.success;
            
            healthStatus.overall = (allServicesOnline && vpsOnline && dockerHealthy) ? 'healthy' : 'unhealthy';
            
            res.json({
                success: true,
                message: 'Health check realizado',
                data: healthStatus
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro no health check',
                error: status.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// ================== MIDDLEWARE DE MONITORAMENTO AUTOMÁTICO ==================

let monitoringInterval = null;

function startSystemMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }

    monitoringInterval = setInterval(async () => {
        try {
            const status = await vpsDockerAutomation.getCompleteStatus();
            
            if (status.success) {
                const timestamp = new Date().toLocaleString('pt-BR');
                
                // Log de status
                console.log(`[${timestamp}] Sistema Status:`);
                console.log(`  VPS: ${status.data.vps.data?.state}`);
                console.log(`  Docker: ${status.data.docker.containers?.length} containers`);
                
                // Verificar serviços offline
                const offlineServices = status.data.services.filter(s => s.status === 'offline');
                if (offlineServices.length > 0) {
                    console.warn(`⚠️  ALERTA: ${offlineServices.length} serviços offline!`);
                    console.warn(`   Serviços offline: ${offlineServices.map(s => s.name).join(', ')}`);
                    
                    // Aqui você pode implementar notificações automáticas
                    // Por exemplo: enviar email, SMS, webhook, etc.
                }
                
                // Verificar VPS offline
                if (status.data.vps.data?.state !== 'running') {
                    console.error(`🚨 CRÍTICO: VPS não está rodando! Status: ${status.data.vps.data?.state}`);
                }
                
            } else {
                console.error('❌ Erro no monitoramento automático:', status.error);
            }
            
        } catch (error) {
            console.error('❌ Erro no monitoramento automático:', error.message);
        }
    }, 60000); // A cada 1 minuto

    console.log('📊 Monitoramento automático do sistema iniciado');
}

function stopSystemMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        console.log('🛑 Monitoramento automático do sistema parado');
    }
}

// Iniciar monitoramento quando o servidor subir
startSystemMonitoring();

// Parar monitoramento quando o servidor for encerrado
process.on('SIGINT', () => {
    stopSystemMonitoring();
    process.exit(0);
});

process.on('SIGTERM', () => {
    stopSystemMonitoring();
    process.exit(0);
});

console.log('✅ Rotas VPS + Docker Automation carregadas com sucesso!');
console.log('📋 Endpoints disponíveis:');
console.log('   GET  /api/system/status        - Status completo do sistema');
console.log('   POST /api/system/deploy        - Deploy completo');
console.log('   POST /api/system/backup        - Backup completo');
console.log('   POST /api/system/restore       - Restore do sistema');
console.log('   GET  /api/docker/status        - Status Docker');
console.log('   POST /api/docker/restart/:name - Reiniciar container');
console.log('   GET  /api/docker/logs/:name    - Logs do container');
console.log('   GET  /api/vps/status           - Status VPS');
console.log('   POST /api/vps/backup           - Backup VPS');
console.log('   POST /api/vps/restart          - Reiniciar VPS');
console.log('   GET  /api/services/health      - Health check completo');
