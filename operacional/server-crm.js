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

// Servir arquivos estáticos do diretório operacional
app.use('/operacional', express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, '..')));

// URL da base de dados
const DB_URL = process.env.DB_SERVICE_URL || 'http://72.60.159.149:3003';

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'crm-service',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

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
        
        const cliente = data.clientes.find(c => c.id === id);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        res.json({ cliente });
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
        
        const proposta = data.propostas.find(p => p.id === id);
        if (!proposta) {
            return res.status(404).json({ error: 'Proposta não encontrada' });
        }
        
        res.json({ proposta });
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
        const { status, observacoes } = req.body;
        
        // Buscar proposta atual
        const response = await fetch(`${DB_URL}/api/propostas`);
        const data = await response.json();
        
        const proposta = data.propostas.find(p => p.id === id);
        if (!proposta) {
            return res.status(404).json({ error: 'Proposta não encontrada' });
        }
        
        // Atualizar status
        proposta.status = status;
        proposta.updatedAt = new Date().toISOString();
        if (observacoes) {
            proposta.observacoes = observacoes;
        }
        
        // Salvar proposta atualizada
        const saveResponse = await fetch(`${DB_URL}/api/propostas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proposta)
        });
        
        const saveData = await saveResponse.json();
        res.json(saveData);
    } catch (error) {
        console.error('❌ [CRM] Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== API DE DASHBOARD =====

// Estatísticas do dashboard
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        // Buscar clientes e propostas
        const [clientesResponse, propostasResponse] = await Promise.all([
            fetch(`${DB_URL}/api/clientes`),
            fetch(`${DB_URL}/api/propostas`)
        ]);
        
        const clientesData = await clientesResponse.json();
        const propostasData = await propostasResponse.json();
        
        const clientes = clientesData.clientes || [];
        const propostas = propostasData.propostas || [];
        
        // Calcular estatísticas
        const stats = {
            totalClientes: clientes.length,
            totalPropostas: propostas.length,
            propostasPorStatus: {},
            propostasRecentes: propostas
                .sort((a, b) => new Date(b.createdAt || b.dataCriacao) - new Date(a.createdAt || a.dataCriacao))
                .slice(0, 5),
            clientesRecentes: clientes
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
        };
        
        // Contar propostas por status
        propostas.forEach(proposta => {
            const status = proposta.status || 'Sem status';
            stats.propostasPorStatus[status] = (stats.propostasPorStatus[status] || 0) + 1;
        });
        
        res.json({ stats });
    } catch (error) {
        console.error('❌ [CRM] Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== ROTAS DE PÁGINAS =====

// Página principal do CRM
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

// Página de detalhes do cliente
app.get('/cliente/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'operacional', 'cliente-detalhes.html'));
});

// Página de detalhes da proposta
app.get('/proposta/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'operacional', 'proposta-detalhes.html'));
});

// Página de fila de digitação
app.get('/operacional/digitation-interface.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'digitation-interface.html'));
});

// ===== INTEGRAÇÃO COM SIMULADOR INSS =====

// Webhook para receber dados do simulador
app.post('/webhook/simulador', async (req, res) => {
    try {
        const { tipo, dados } = req.body;
        
        console.log(`📥 [CRM] Webhook recebido: ${tipo}`);
        
        if (tipo === 'cliente_criado') {
            // Salvar cliente no banco
            const response = await fetch(`${DB_URL}/api/clientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            
            const result = await response.json();
            console.log('✅ [CRM] Cliente salvo via webhook:', result.cliente?.id);
        }
        
        if (tipo === 'proposta_criada') {
            // Salvar proposta no banco
            const response = await fetch(`${DB_URL}/api/propostas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            
            const result = await response.json();
            console.log('✅ [CRM] Proposta salva via webhook:', result.proposta?.id);
        }
        
        res.json({ success: true, message: 'Webhook processado com sucesso' });
    } catch (error) {
        console.error('❌ [CRM] Erro no webhook:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== PROXY PARA API KENTRO (EVITAR CORS) =====

// Proxy para API Kentro
app.post('/api/kentro-proxy', async (req, res) => {
    try {
        const { endpoint, data } = req.body;
        
        if (!endpoint || !data) {
            return res.status(400).json({ 
                error: 'Endpoint e dados são obrigatórios',
                success: false 
            });
        }
        
        // URL base da API Kentro
        const kentroBaseUrl = 'https://api.kentro.com.br/int';
        const url = `${kentroBaseUrl}/${endpoint}`;
        
        console.log(`🔄 [PROXY] Fazendo requisição para: ${url}`);
        console.log(`📤 [PROXY] Dados enviados:`, JSON.stringify(data, null, 2));
        
        // Fazer requisição para a API Kentro
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'LunasDigital-CRM/1.0'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            console.error(`❌ [PROXY] Erro na resposta da API Kentro: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({
                error: `Erro na API Kentro: ${response.status} ${response.statusText}`,
                success: false
            });
        }
        
        const responseData = await response.json();
        console.log(`✅ [PROXY] Resposta recebida:`, JSON.stringify(responseData, null, 2));
        
        // Retornar a resposta da API Kentro
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ [PROXY] Erro no proxy Kentro:', error);
        res.status(500).json({ 
            error: `Erro interno do proxy: ${error.message}`,
            success: false 
        });
    }
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