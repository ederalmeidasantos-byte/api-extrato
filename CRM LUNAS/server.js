import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos
app.use(express.static(join(__dirname, 'public')));
app.use('/assets', express.static(join(__dirname, 'assets')));

// Função para ler dados de clientes
async function getClientes() {
    try {
        const clientesDir = join(__dirname, '..', 'var', 'data', 'clientes');
        const files = await fs.readdir(clientesDir);
        const clientes = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = join(clientesDir, file);
                const data = await fs.readFile(filePath, 'utf8');
                const cliente = JSON.parse(data);
                clientes.push(cliente);
            }
        }
        
        return clientes;
    } catch (error) {
        console.error('Erro ao ler clientes:', error);
        return [];
    }
}

// Função para salvar cliente
async function salvarCliente(cliente) {
    try {
        const clientesDir = join(__dirname, '..', 'var', 'data', 'clientes');
        await fs.mkdir(clientesDir, { recursive: true });
        
        const filePath = join(clientesDir, `${cliente.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(cliente, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        return false;
    }
}

// Rotas da API
app.get('/api/clientes', async (req, res) => {
    try {
        const clientes = await getClientes();
        res.json({
            success: true,
            clientes: clientes,
            total: clientes.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar clientes',
            error: error.message
        });
    }
});

app.get('/api/clientes/:id', async (req, res) => {
    try {
        const clientes = await getClientes();
        const cliente = clientes.find(c => c.id == req.params.id);
        
        if (!cliente) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }
        
        res.json({
            success: true,
            cliente: cliente
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar cliente',
            error: error.message
        });
    }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const { cliente } = req.body;
        
        if (!cliente) {
            return res.status(400).json({
                success: false,
                message: 'Dados do cliente são obrigatórios'
            });
        }
        
        // Gerar ID único
        const clientes = await getClientes();
        const maxId = Math.max(...clientes.map(c => c.id || 0), 0);
        cliente.id = maxId + 1;
        cliente.dataCriacao = new Date().toISOString();
        cliente.dataAtualizacao = new Date().toISOString();
        
        const sucesso = await salvarCliente(cliente);
        
        if (sucesso) {
            res.json({
                success: true,
                message: 'Cliente criado com sucesso',
                cliente: cliente
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro ao salvar cliente'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao criar cliente',
            error: error.message
        });
    }
});

app.put('/api/clientes/:id', async (req, res) => {
    try {
        const { cliente } = req.body;
        const clientes = await getClientes();
        const index = clientes.findIndex(c => c.id == req.params.id);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }
        
        cliente.id = parseInt(req.params.id);
        cliente.dataAtualizacao = new Date().toISOString();
        
        const sucesso = await salvarCliente(cliente);
        
        if (sucesso) {
            res.json({
                success: true,
                message: 'Cliente atualizado com sucesso',
                cliente: cliente
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar cliente'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar cliente',
            error: error.message
        });
    }
});

app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const clientesDir = join(__dirname, '..', 'var', 'data', 'clientes');
        const filePath = join(clientesDir, `${req.params.id}.json`);
        
        try {
            await fs.unlink(filePath);
            res.json({
                success: true,
                message: 'Cliente excluído com sucesso'
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                res.status(404).json({
                    success: false,
                    message: 'Cliente não encontrado'
                });
            } else {
                throw error;
            }
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir cliente',
            error: error.message
        });
    }
});

// Rota para estatísticas do dashboard
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const clientes = await getClientes();
        
        const stats = {
            totalClientes: clientes.length,
            clientesHoje: clientes.filter(c => {
                const hoje = new Date().toDateString();
                const dataCriacao = new Date(c.dataCriacao).toDateString();
                return hoje === dataCriacao;
            }).length,
            totalPropostas: clientes.reduce((total, c) => total + (c.propostas?.length || 0), 0),
            propostasAtivas: clientes.reduce((total, c) => {
                return total + (c.propostas?.filter(p => p.status === 'ativa').length || 0);
            }, 0),
            receitaTotal: clientes.reduce((total, c) => {
                return total + (c.propostas?.reduce((pTotal, p) => pTotal + (parseFloat(p.valor) || 0), 0) || 0);
            }, 0)
        };
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar estatísticas',
            error: error.message
        });
    }
});

// Rota para buscar clientes
app.get('/api/clientes/buscar', async (req, res) => {
    try {
        const { q, tipo, status } = req.query;
        const clientes = await getClientes();
        
        let resultados = clientes;
        
        // Filtro por termo de busca
        if (q) {
            const termo = q.toLowerCase();
            resultados = resultados.filter(cliente => {
                switch (tipo) {
                    case 'cpf':
                        return (cliente.cpf || '').toLowerCase().includes(termo);
                    case 'nome':
                        return (cliente.nome || '').toLowerCase().includes(termo);
                    case 'telefone':
                        return (cliente.telefone || '').toLowerCase().includes(termo);
                    case 'email':
                        return (cliente.email || '').toLowerCase().includes(termo);
                    default:
                        return (
                            (cliente.nome || '').toLowerCase().includes(termo) ||
                            (cliente.cpf || '').toLowerCase().includes(termo) ||
                            (cliente.telefone || '').toLowerCase().includes(termo) ||
                            (cliente.email || '').toLowerCase().includes(termo)
                        );
                }
            });
        }
        
        // Filtro por status
        if (status && status !== 'todos') {
            resultados = resultados.filter(cliente => {
                const temPropostas = (cliente.propostas || []).length > 0;
                switch (status) {
                    case 'com-propostas':
                        return temPropostas;
                    case 'sem-propostas':
                        return !temPropostas;
                    default:
                        return true;
                }
            });
        }
        
        res.json({
            success: true,
            clientes: resultados,
            total: resultados.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar clientes',
            error: error.message
        });
    }
});

// Rota principal - Dashboard
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Rota para clientes
app.get('/clientes', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'clientes.html'));
});

// Rota para propostas
app.get('/propostas', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'propostas.html'));
});

// Rota para configurações
app.get('/configuracoes', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'configuracoes.html'));
});

// Rota para relatórios
app.get('/relatorios', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'relatorios.html'));
});

// Rota para detalhes do cliente
app.get('/cliente/:id', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'cliente-detalhes.html'));
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
    });
});

// Middleware 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 CRM LUNAS rodando na porta ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`👥 Clientes: http://localhost:${PORT}/clientes`);
    console.log(`📄 Propostas: http://localhost:${PORT}/propostas`);
    console.log(`⚙️ Configurações: http://localhost:${PORT}/configuracoes`);
});
