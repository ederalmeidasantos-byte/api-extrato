import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..'))); // Serves static files from /app

const DB_URL = process.env.DB_SERVICE_URL || 'http://localhost:3003';

// ===== API DE CLIENTES =====

// Buscar todos os clientes
app.get('/api/clientes', async (req, res) => {
    try {
        const response = await fetch(`${DB_URL}/api/clientes`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('❌ [CRM] Erro ao buscar clientes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar cliente por ID
app.get('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await fetch(`${DB_URL}/api/clientes`);
        const data = await response.json();
        
        const cliente = data.clientes?.find(c => c.id === id);
        if (cliente) {
            res.json(cliente);
        } else {
            res.status(404).json({ error: 'Cliente não encontrado' });
        }
    } catch (error) {
        console.error('❌ [CRM] Erro ao buscar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar/atualizar cliente
app.post('/api/clientes', async (req, res) => {
    try {
        const cliente = req.body;
        const response = await fetch(`${DB_URL}/api/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cliente)
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('❌ [CRM] Erro ao salvar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Excluir cliente
app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🗑️ [CRM] Excluindo cliente:', id);
        
        const response = await fetch(`${DB_URL}/api/clientes/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('❌ [CRM] Erro ao excluir cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== API DE PROPOSTAS =====

// Buscar todas as propostas
app.get('/api/propostas', async (req, res) => {
    try {
        const response = await fetch(`${DB_URL}/api/propostas`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('❌ [CRM] Erro ao buscar propostas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar proposta por ID
app.get('/api/propostas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await fetch(`${DB_URL}/api/propostas`);
        const data = await response.json();
        
        const proposta = data.propostas?.find(p => p.id === id);
        if (proposta) {
            res.json(proposta);
        } else {
            res.status(404).json({ error: 'Proposta não encontrada' });
        }
    } catch (error) {
        console.error('❌ [CRM] Erro ao buscar proposta:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar/atualizar proposta
app.post('/api/propostas', async (req, res) => {
    try {
        const proposta = req.body;
        const response = await fetch(`${DB_URL}/api/propostas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proposta)
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('❌ [CRM] Erro ao salvar proposta:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar status da proposta
app.put('/api/propostas/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const response = await fetch(`${DB_URL}/api/propostas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('❌ [CRM] Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== API DE DASHBOARD =====

// Estatísticas do dashboard
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const [clientesResponse, propostasResponse] = await Promise.all([
            fetch(`${DB_URL}/api/clientes`),
            fetch(`${DB_URL}/api/propostas`)
        ]);
        
        const clientesData = await clientesResponse.json();
        const propostasData = await propostasResponse.json();
        
        const stats = {
            totalClientes: clientesData.clientes?.length || 0,
            totalPropostas: propostasData.propostas?.length || 0,
            propostasAtivas: propostasData.propostas?.filter(p => p.status === 'active').length || 0,
            propostasFinalizadas: propostasData.propostas?.filter(p => p.status === 'completed').length || 0
        };
        
        res.json(stats);
    } catch (error) {
        console.error('❌ [CRM] Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== WEBHOOK DO SIMULADOR =====

// Webhook para receber dados do simulador INSS
app.post('/webhook/simulador', async (req, res) => {
    try {
        const { cliente, proposta } = req.body;
        console.log('📥 [CRM] Webhook recebido do simulador:', { cliente: cliente?.nome, proposta: proposta?.id });
        
        // Salvar cliente se não existir
        if (cliente) {
            const clienteResponse = await fetch(`${DB_URL}/api/clientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cliente)
            });
            const clienteResult = await clienteResponse.json();
            console.log('✅ [CRM] Cliente salvo via webhook:', clienteResult.cliente?.id);
        }
        
        // Salvar proposta se existir
        if (proposta) {
            const propostaResponse = await fetch(`${DB_URL}/api/propostas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proposta)
            });
            const result = await propostaResponse.json();
            console.log('✅ [CRM] Proposta salva via webhook:', result.proposta?.id);
        }
        
        res.json({ success: true, message: 'Webhook processado com sucesso' });
    } catch (error) {
        console.error('❌ [CRM] Erro no webhook:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== ROTAS DE PÁGINAS =====

// Página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'operacional', 'index.html'));
});

// Página de clientes
app.get('/clientes', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'operacional', 'clientes.html'));
});

// Página de propostas
app.get('/propostas', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'operacional', 'propostas.html'));
});

// Página de buscar cliente
app.get('/buscar-cliente', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'operacional', 'buscar-cliente.html'));
});

// Página de detalhes do cliente
app.get('/crm-cliente', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'operacional', 'crm-cliente.html'));
});

// Página de configurações
app.get('/configuracoes', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'operacional', 'configuracoes.html'));
});

// Página de status
app.get('/status', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'operacional', 'status.html'));
});

// Inicializar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CRM Service rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/`);
    console.log(`👥 Clientes: http://localhost:${PORT}/clientes`);
    console.log(`📋 Propostas: http://localhost:${PORT}/propostas`);
    console.log(`🔗 Base de Dados: ${DB_URL}`);
});
