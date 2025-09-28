// ===== SERVIDOR LOCAL DE TESTE - LUNAS DIGITAL =====
// Servidor configurado para testes locais com Design System

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ===== ROTAS PRINCIPAIS =====

// Página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Configurações
app.get('/configuracoes', (req, res) => {
    res.sendFile(path.join(__dirname, 'configuracoes.html'));
});

// Logs
app.get('/logs', (req, res) => {
    res.sendFile(path.join(__dirname, 'logs.html'));
});

// Cache
app.get('/cache', (req, res) => {
    res.sendFile(path.join(__dirname, 'cache.html'));
});

// Painel FGTS
app.get('/fgts', (req, res) => {
    res.sendFile(path.join(__dirname, 'fgts.html'));
});

// Roteiros Bancos
app.get('/bancos', (req, res) => {
    res.sendFile(path.join(__dirname, 'roteiro-bancos.html'));
});

// Simulador INSS
app.get('/simulador', (req, res) => {
    res.sendFile(path.join(__dirname, 'simulador-inss.html'));
});

app.get('/simulador-debug', (req, res) => {
    res.sendFile(path.join(__dirname, 'simulador-debug.html'));
});

// ===== API ENDPOINTS =====

// API de teste
app.get('/api/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'Servidor local funcionando!',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// API de configurações
app.get('/api/config', (req, res) => {
    res.json({
        servidor: 'Local Test Server',
        versao: '1.0.0',
        design_system: 'Lunas Digital',
        cores: {
            teal: '#00d4aa',
            blue: '#5a67d8',
            purple: '#7c3aed'
        }
    });
});

// API de logs (mock)
app.get('/api/logs', (req, res) => {
    const logs = [
        {
            id: 1,
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Servidor iniciado com sucesso',
            source: 'servidor-local.js'
        },
        {
            id: 2,
            timestamp: new Date(Date.now() - 60000).toISOString(),
            level: 'success',
            message: 'Design System carregado',
            source: 'design-system.js'
        },
        {
            id: 3,
            timestamp: new Date(Date.now() - 120000).toISOString(),
            level: 'warning',
            message: 'Cache limpo automaticamente',
            source: 'cache-manager.js'
        }
    ];
    
    res.json({
        status: 'success',
        logs: logs,
        total: logs.length
    });
});

// API de cache (mock)
app.get('/api/cache', (req, res) => {
    res.json({
        status: 'success',
        cache: {
            total_items: 156,
            memory_usage: '2.3 MB',
            last_cleanup: new Date(Date.now() - 300000).toISOString(),
            items: [
                { key: 'user_session', size: '1.2 KB', ttl: '3600s' },
                { key: 'api_response', size: '856 B', ttl: '1800s' },
                { key: 'config_data', size: '2.1 KB', ttl: '7200s' }
            ]
        }
    });
});

// API de métricas (mock)
app.get('/api/metrics', (req, res) => {
    res.json({
        status: 'success',
        metrics: {
            requests_total: 1247,
            requests_success: 1189,
            requests_error: 58,
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            cpu_usage: process.cpuUsage()
        }
    });
});

// API dos Bancos
app.get('/api/bancos', (req, res) => {
    res.json({
        status: 'success',
        message: 'API do Roteiros Bancos funcionando',
        bancos: {
            total: 10,
            categorias: {
                regra_0_parcelas: 4,
                regra_12_parcelas: 2,
                regra_3_parcelas: 2,
                regra_2_parcelas: 2
            }
        },
        timestamp: new Date().toISOString()
    });
});

// ===== MIDDLEWARE DE ERRO =====

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Página não encontrada',
        path: req.path,
        method: req.method
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err);
    res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
    });
});

// ===== INICIALIZAÇÃO =====

app.listen(PORT, () => {
    console.log('🚀 ===== SERVIDOR LOCAL DE TESTE INICIADO =====');
    console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`🎨 Design System: Lunas Digital`);
    console.log(`📁 Diretório: ${__dirname}`);
    console.log('===============================================');
    console.log('');
    console.log('📋 Páginas disponíveis:');
    console.log(`   🏠 Página Inicial: http://localhost:${PORT}/`);
    console.log(`   📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`   ⚙️ Configurações: http://localhost:${PORT}/configuracoes`);
    console.log(`   📋 Logs: http://localhost:${PORT}/logs`);
    console.log(`   💾 Cache: http://localhost:${PORT}/cache`);
    console.log(`   📊 FGTS: http://localhost:${PORT}/fgts`);
    console.log(`   🏦 Roteiros Bancos: http://localhost:${PORT}/bancos`);
    console.log(`   🏛️ Simulador INSS: http://localhost:${PORT}/simulador`);
    console.log(`   🔍 Simulador Debug: http://localhost:${PORT}/simulador-debug`);
    console.log('');
    console.log('🔗 APIs disponíveis:');
    console.log(`   🧪 Teste: http://localhost:${PORT}/api/test`);
    console.log(`   ⚙️ Config: http://localhost:${PORT}/api/config`);
    console.log(`   📋 Logs: http://localhost:${PORT}/api/logs`);
    console.log(`   💾 Cache: http://localhost:${PORT}/api/cache`);
    console.log(`   📊 Métricas: http://localhost:${PORT}/api/metrics`);
    console.log(`   🏦 Roteiros Bancos: http://localhost:${PORT}/api/bancos`);
    console.log('');
    console.log('💡 Para parar o servidor: Ctrl+C');
    console.log('===============================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Parando servidor local...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Parando servidor local...');
    process.exit(0);
});
