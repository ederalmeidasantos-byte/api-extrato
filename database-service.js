import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3003;

const DATA_DIR = '/app/var/data';
const CLIENTES_DIR = path.join(DATA_DIR, 'clientes');
const PROPOSTAS_DIR = path.join(DATA_DIR, 'propostas');

app.use(cors());
app.use(express.json());

// Garantir que os diretórios existam
async function ensureDirectories() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(CLIENTES_DIR, { recursive: true });
        await fs.mkdir(PROPOSTAS_DIR, { recursive: true });
        console.log('✅ Diretórios de dados criados/verificados');
    } catch (error) {
        console.error('❌ Erro ao criar diretórios:', error);
    }
}

// GET /api/clientes - Listar todos os clientes
app.get('/api/clientes', async (req, res) => {
    try {
        const files = await fs.readdir(CLIENTES_DIR);
        const clientes = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filepath = path.join(CLIENTES_DIR, file);
                const content = await fs.readFile(filepath, 'utf-8');
                const cliente = JSON.parse(content);
                clientes.push(cliente);
            }
        }
        
        res.json({ clientes });
    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/clientes/:id - Buscar cliente específico
app.get('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const filename = `cliente_${id}.json`;
        const filepath = path.join(CLIENTES_DIR, filename);
        
        const content = await fs.readFile(filepath, 'utf-8');
        const cliente = JSON.parse(content);
        
        res.json({ cliente });
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(404).json({ error: 'Cliente não encontrado' });
    }
});

// POST /api/clientes - Criar novo cliente
app.post('/api/clientes', async (req, res) => {
    try {
        const cliente = req.body;
        const filename = `cliente_${cliente.id || Date.now()}.json`;
        const filepath = path.join(CLIENTES_DIR, filename);
        
        await fs.writeFile(filepath, JSON.stringify(cliente, null, 2));
        
        res.json({ 
            success: true, 
            cliente: { ...cliente, id: cliente.id || `cliente_${Date.now()}` }
        });
    } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE /api/clientes/:id - Excluir cliente
app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const filename = `cliente_${id}.json`;
        const filepath = path.join(CLIENTES_DIR, filename);
        
        // Verificar se arquivo existe
        try {
            await fs.access(filepath);
        } catch (error) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        // Excluir arquivo
        await fs.unlink(filepath);
        
        console.log(`✅ Cliente ${id} excluído do banco de dados`);
        res.json({ success: true, message: 'Cliente excluído com sucesso' });
        
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/propostas - Listar todas as propostas
app.get('/api/propostas', async (req, res) => {
    try {
        const files = await fs.readdir(PROPOSTAS_DIR);
        const propostas = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filepath = path.join(PROPOSTAS_DIR, file);
                const content = await fs.readFile(filepath, 'utf-8');
                const proposta = JSON.parse(content);
                propostas.push(proposta);
            }
        }
        
        res.json({ propostas });
    } catch (error) {
        console.error('Erro ao listar propostas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/propostas/:id - Buscar proposta específica
app.get('/api/propostas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const filename = `proposta_${id}.json`;
        const filepath = path.join(PROPOSTAS_DIR, filename);
        
        const content = await fs.readFile(filepath, 'utf-8');
        const proposta = JSON.parse(content);
        
        res.json({ proposta });
    } catch (error) {
        console.error('Erro ao buscar proposta:', error);
        res.status(404).json({ error: 'Proposta não encontrada' });
    }
});

// POST /api/propostas - Criar nova proposta
app.post('/api/propostas', async (req, res) => {
    try {
        const proposta = req.body;
        const filename = `proposta_${proposta.id || Date.now()}.json`;
        const filepath = path.join(PROPOSTAS_DIR, filename);
        
        await fs.writeFile(filepath, JSON.stringify(proposta, null, 2));
        
        res.json({ 
            success: true, 
            proposta: { ...proposta, id: proposta.id || `proposta_${Date.now()}` }
        });
    } catch (error) {
        console.error('Erro ao salvar proposta:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Inicializar servidor
async function startServer() {
    await ensureDirectories();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Database Service rodando na porta ${PORT}`);
        console.log(`📁 Dados salvos em: ${DATA_DIR}`);
    });
}

startServer().catch(console.error);