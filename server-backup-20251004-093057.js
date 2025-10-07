const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('.'));

// Configuração do multer para uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Função para mesclar dados do Kentro com dados do extrato
function mesclarDadosKentroExtrato(dadosKentro, dadosExtrato) {
    const dadosMesclados = { ...dadosKentro };
    
    // Mesclar dados pessoais
    if (dadosExtrato.nome) dadosMesclados.nome = dadosExtrato.nome;
    if (dadosExtrato.cpf) dadosMesclados.cpf = dadosExtrato.cpf;
    if (dadosExtrato.nb) dadosMesclados.nb = dadosExtrato.nb;
    if (dadosExtrato.dataNascimento) dadosMesclados.dataNascimento = dadosExtrato.dataNascimento;
    if (dadosExtrato.nomeMae) dadosMesclados.nomeMae = dadosExtrato.nomeMae;
    
    // Mesclar endereço
    if (dadosExtrato.endereco) {
        dadosMesclados.endereco = { ...dadosMesclados.endereco, ...dadosExtrato.endereco };
    }
    
    // Mesclar dados bancários
    if (dadosExtrato.dadosBancarios) {
        dadosMesclados.dadosBancarios = { ...dadosMesclados.dadosBancarios, ...dadosExtrato.dadosBancarios };
    }
    
    // Mesclar benefício
    if (dadosExtrato.beneficio) {
        dadosMesclados.beneficio = { ...dadosMesclados.beneficio, ...dadosExtrato.beneficio };
    }
    
    // Adicionar contratos do extrato
    if (dadosExtrato.contratos) {
        dadosMesclados.contratos = dadosExtrato.contratos;
    }
    
    // Adicionar margens do extrato
    if (dadosExtrato.margens) {
        dadosMesclados.margens = dadosExtrato.margens;
    }
    
    return dadosMesclados;
}

// Função para mapear códigos de banco para nomes
function mapearCodigoBanco(codigo) {
    const bancos = {
        '001': 'Banco do Brasil',
        '104': 'Caixa Econômica Federal',
        '341': 'Itaú Unibanco',
        '033': 'Santander',
        '237': 'Bradesco',
        '756': 'Sicoob',
        '422': 'Banco Safra',
        '260': 'Nu Pagamentos',
        '336': 'Banco C6',
        '290': 'PagSeguro',
        '323': 'Mercado Pago',
        '077': 'Banco Inter',
        '070': 'BRB - Banco de Brasília',
        '756': 'Sicoob',
        '748': 'Sicredi',
        '041': 'Banrisul',
        '422': 'Banco Safra',
        '033': 'Santander',
        '104': 'Caixa Econômica Federal',
        '001': 'Banco do Brasil'
    };
    return bancos[codigo] || `Banco ${codigo}`;
}

// Endpoint para buscar dados do Kentro
app.post('/api/buscar-kentro', async (req, res) => {
    try {
        const { cpf, nb } = req.body;
        
        if (!cpf && !nb) {
            return res.status(400).json({ error: 'CPF ou NB é obrigatório' });
        }
        
        console.log(`🔍 Buscando dados no Kentro - CPF: ${cpf}, NB: ${nb}`);
        
        // Simular busca no Kentro (substituir pela API real)
        const dadosKentro = {
            nome: 'Cliente Teste Kentro',
            cpf: cpf,
            nb: nb,
            dataNascimento: '01/01/1980',
            nomeMae: 'Mãe Teste',
            endereco: {
                logradouro: 'Rua Teste Kentro',
                numero: '123',
                bairro: 'Centro',
                cidade: 'São Paulo',
                uf: 'SP',
                cep: '01234-567'
            },
            dadosBancarios: {
                banco: '001',
                agencia: '1234',
                conta: '567890',
                tipoConta: 'corrente'
            },
            beneficio: {
                tipo: 'Aposentadoria',
                valor: 1500.00,
                situacao: 'Ativo',
                bancoPagador: '001'
            }
        };
        
        res.json({ success: true, dados: dadosKentro });
        
    } catch (error) {
        console.error('❌ Erro ao buscar dados no Kentro:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para processar extrato PDF
app.post('/api/processar-extrato', upload.single('extrato'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Arquivo de extrato é obrigatório' });
        }
        
        console.log(`📄 Processando extrato: ${req.file.filename}`);
        
        // Simular processamento do PDF (substituir pela lógica real)
        const dadosExtrato = {
            nome: 'Cliente do Extrato',
            cpf: '12345678901',
            nb: '1234567890',
            dataNascimento: '15/03/1975',
            nomeMae: 'Mãe do Extrato',
            endereco: {
                logradouro: 'Rua do Extrato',
                numero: '456',
                bairro: 'Vila Nova',
                cidade: 'Rio de Janeiro',
                uf: 'RJ',
                cep: '20000-000'
            },
            dadosBancarios: {
                banco: '104',
                agencia: '5678',
                conta: '123456',
                tipoConta: 'poupanca'
            },
            beneficio: {
                tipo: 'Pensão',
                valor: 2000.00,
                situacao: 'Ativo',
                bancoPagador: '104'
            },
            contratos: [
                {
                    tipo: 'Empréstimo Consignado',
                    banco: '001',
                    valor: 5000.00,
                    parcelas: 24,
                    parcelasPagas: 12,
                    valorParcela: 250.00,
                    saldoDevedor: 3000.00
                }
            ],
            margens: {
                margemDisponivel: 500.00,
                margemUtilizada: 250.00,
                margemTotal: 750.00
            }
        };
        
        res.json({ success: true, dados: dadosExtrato });
        
    } catch (error) {
        console.error('❌ Erro ao processar extrato:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para mesclar dados Kentro + Extrato
app.post('/api/mesclar-dados', async (req, res) => {
    try {
        const { dadosKentro, dadosExtrato } = req.body;
        
        if (!dadosKentro || !dadosExtrato) {
            return res.status(400).json({ error: 'Dados do Kentro e Extrato são obrigatórios' });
        }
        
        console.log('🔄 Mesclando dados Kentro + Extrato');
        
        const dadosMesclados = mesclarDadosKentroExtrato(dadosKentro, dadosExtrato);
        
        res.json({ success: true, dados: dadosMesclados });
        
    } catch (error) {
        console.error('❌ Erro ao mesclar dados:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para salvar cliente
app.post('/api/salvar-cliente', async (req, res) => {
    try {
        const { clientData } = req.body;
        
        if (!clientData) {
            return res.status(400).json({ 
                success: false, 
                error: 'clientData é obrigatório' 
            });
        }
    
        console.log(`💾 Salvando cliente no servidor:`, clientData);
        
        // Verificar se o cliente já existe (por CPF ou NB)
        const clientesDir = path.join(__dirname, 'var', 'data', 'clientes');
        await fs.mkdir(clientesDir, { recursive: true });
        
        let finalClientId = clientData.id;
        
        // Verificar se já existe cliente com este CPF ou NB
        const files = await fs.readdir(clientesDir);
        const existingIds = new Set();
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(clientesDir, file);
                    const fileData = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    const id = parseInt(file.replace('.json', ''));
                    if (!isNaN(id)) {
                        existingIds.add(id);
                    }
                    
                    // Verificar se é o mesmo cliente (mesmo CPF ou NB)
                    const existingCpf = fileData.dadosCompletos?.cpf || fileData.cpf;
                    const existingNb = fileData.dadosCompletos?.nb || fileData.nb;
                    const newCpf = clientData.cpf;
                    const newNb = clientData.nb;
                    
                    if ((existingCpf && newCpf && existingCpf === newCpf) || 
                        (existingNb && newNb && existingNb === newNb)) {
                        console.log(`✅ Cliente já existe com ID ${id}, atualizando...`);
                        finalClientId = id.toString();
                        break;
                    }
                } catch (error) {
                    console.error(`❌ Erro ao ler arquivo ${file}:`, error);
                }
            }
        }
        
        // Se não encontrou cliente existente, criar novo ID
        if (!finalClientId || finalClientId === clientData.id) {
            let nextId = 1;
            while (existingIds.has(nextId)) {
                nextId++;
            }
            finalClientId = nextId.toString();
            console.log(`✅ Novo cliente criado com ID: ${finalClientId}`);
        }
    
        // Preparar dados do cliente
        const dadosCliente = {
            id: finalClientId,
            kentroId: clientData.kentroId || null,
            createdAt: clientData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dadosCompletos: {
                nome: clientData.nome || '',
                cpf: clientData.cpf || '',
                email: clientData.email || '',
                telefone: clientData.telefone || '',
                dataNascimento: clientData.nascimento || '',
                nomeMae: clientData.nomeMae || '',
                endereco: clientData.endereco || {},
                beneficio: clientData.beneficio || {}
            },
            propostas: clientData.propostas || [],
            contratos: clientData.contratos || [],
            contratosRMC: clientData.contratosRMC || [],
            contratosRCC: clientData.contratosRCC || [],
            ultimaSincronizacao: new Date().toISOString(),
            fonte: 'simulador_cliente'
        };
    
        // Salvar no arquivo
        const clientDataPath = path.join(clientesDir, `${finalClientId}.json`);
        await fs.writeFile(clientDataPath, JSON.stringify(dadosCliente, null, 2));
        
        console.log(`✅ Cliente salvo em: ${clientDataPath}`);
        
        res.json({ 
            success: true, 
            clientId: finalClientId,
            message: 'Cliente salvo com sucesso no servidor'
        });
        
    } catch (error) {
        console.error('❌ Erro ao salvar cliente:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para sincronizar dados do cliente
app.post('/api/sincronizar-dados-cliente', async (req, res) => {
    try {
        const { clientId, dadosCompletos, propostas, contratos, contratosRMC, contratosRCC } = req.body;
        
        if (!clientId) {
            return res.status(400).json({ 
                success: false, 
                error: 'clientId é obrigatório' 
            });
        }
        
        console.log(`🔄 Sincronizando dados do cliente ${clientId}`);
        
        // Verificar se o cliente já existe
        const clientDir = path.join(__dirname, 'var', 'data', 'clientes');
        await fs.mkdir(clientDir, { recursive: true });
        
        const clientFilePath = path.join(clientDir, `${clientId}.json`);
        let dadosCliente = {};
        let finalClientId = clientId;
        
        try {
            const existingData = await fs.readFile(clientFilePath, 'utf8');
            dadosCliente = JSON.parse(existingData);
            
            // Verificar se é o mesmo cliente (mesmo CPF)
            const existingCpf = dadosCliente.dadosCompletos?.cpf || dadosCliente.cpf;
            const newCpf = dadosCompletos?.cpf;
            
            if (existingCpf && newCpf && existingCpf !== newCpf) {
                console.log(`⚠️ CPF diferente detectado. Criando novo cliente...`);
                // Gerar novo ID sequencial
                const files = await fs.readdir(clientDir);
                const existingIds = new Set();
                
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const id = parseInt(file.replace('.json', ''));
                        if (!isNaN(id)) {
                            existingIds.add(id);
                        }
                    }
                }
                
                let nextId = 1;
                while (existingIds.has(nextId)) {
                    nextId++;
                }
                finalClientId = nextId.toString();
                console.log(`✅ Novo cliente criado com ID: ${finalClientId}`);
            }
        } catch (error) {
            console.log(`📝 Cliente ${clientId} não existe, criando novo...`);
        }
        
        // Preparar dados do cliente
        dadosCliente = {
            id: finalClientId,
            kentroId: dadosCliente.kentroId || null,
            createdAt: dadosCliente.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dadosCompletos: dadosCompletos || dadosCliente.dadosCompletos || {},
            propostas: propostas || dadosCliente.propostas || [],
            contratos: contratos || dadosCliente.contratos || [],
            contratosRMC: contratosRMC || dadosCliente.contratosRMC || [],
            contratosRCC: contratosRCC || dadosCliente.contratosRCC || [],
            ultimaSincronizacao: new Date().toISOString(),
            fonte: 'formulario_cliente'
        };
        
        // Salvar no arquivo de dados do cliente
        const finalClientDataPath = path.join(clientDir, `${finalClientId}.json`);
        await fs.writeFile(finalClientDataPath, JSON.stringify(dadosCliente, null, 2));
        
        console.log(`✅ Dados sincronizados salvos em: ${finalClientDataPath}`);
        
        res.json({ 
            success: true, 
            clientId: finalClientId,
            message: 'Dados sincronizados com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao sincronizar dados do cliente:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para sincronizar clientes
app.get('/api/sincronizar-clientes', async (req, res) => {
    try {
        console.log('🔄 Sincronizando clientes...');
        
        const clientesDir = path.join(__dirname, 'var', 'data', 'clientes');
        await fs.mkdir(clientesDir, { recursive: true });
        
        const files = await fs.readdir(clientesDir);
        const clientes = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(clientesDir, file);
                    const fileData = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    
                    // Usar o ID do arquivo se não houver ID no JSON
                    const clientId = fileData.id || file.replace('.json', '');
                    
                    clientes.push({
                        id: clientId,
                        nome: fileData.dadosCompletos?.nome || fileData.nome || 'Nome não informado',
                        cpf: fileData.dadosCompletos?.cpf || fileData.cpf || '',
                        nb: fileData.dadosCompletos?.nb || fileData.nb || '',
                        telefone: fileData.dadosCompletos?.telefone || fileData.telefone || '',
                        email: fileData.dadosCompletos?.email || fileData.email || '',
                        createdAt: fileData.createdAt || new Date().toISOString(),
                        updatedAt: fileData.updatedAt || new Date().toISOString()
                    });
                } catch (error) {
                    console.error(`❌ Erro ao ler arquivo ${file}:`, error);
                }
            }
        }
        
        console.log(`✅ ${clientes.length} clientes sincronizados`);
        
        res.json({ 
            success: true, 
            clientes: clientes,
            total: clientes.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao sincronizar clientes:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para buscar cliente por ID
app.get('/api/cliente/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        
        console.log(`🔍 Buscando cliente ${clientId}...`);
        
        const clientesDir = path.join(__dirname, 'var', 'data', 'clientes');
        const files = await fs.readdir(clientesDir);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(clientesDir, file);
                    const fileData = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    
                    // Verificar se o ID corresponde (arquivo ou conteúdo)
                    const fileId = file.replace('.json', '');
                    const contentId = fileData.id;
                    
                    if (fileId === clientId || contentId === clientId) {
                        console.log(`✅ Cliente ${clientId} encontrado`);
                        return res.json({ 
                            success: true, 
                            cliente: fileData 
                        });
                    }
                } catch (error) {
                    console.error(`❌ Erro ao ler arquivo ${file}:`, error);
                }
            }
        }
        
        console.log(`❌ Cliente ${clientId} não encontrado`);
        res.status(404).json({ 
            success: false, 
            error: 'Cliente não encontrado' 
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar cliente:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para buscar propostas
app.get('/api/propostas', async (req, res) => {
    try {
        console.log('🔍 Buscando propostas...');
        
        const propostasDir = path.join(__dirname, 'var', 'data', 'propostas');
        await fs.mkdir(propostasDir, { recursive: true });
        
        const files = await fs.readdir(propostasDir);
        const propostas = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(propostasDir, file);
                    const fileData = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    
                    propostas.push({
                        id: fileData.id || file.replace('.json', ''),
                        clientId: fileData.clientId || '',
                        nome: fileData.nome || 'Nome não informado',
                        cpf: fileData.cpf || '',
                        nb: fileData.nb || '',
                        banco: fileData.banco || '',
                        produto: fileData.produto || '',
                        valor: fileData.valor || 0,
                        parcelas: fileData.parcelas || 0,
                        status: fileData.status || 'Pendente',
                        createdAt: fileData.createdAt || new Date().toISOString()
                    });
                } catch (error) {
                    console.error(`❌ Erro ao ler arquivo ${file}:`, error);
                }
            }
        }
        
        console.log(`✅ ${propostas.length} propostas encontradas`);
        
        res.json({ 
            success: true, 
            propostas: propostas,
            total: propostas.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar propostas:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para buscar proposta por ID
app.get('/api/proposta/:propostaId', async (req, res) => {
    try {
        const { propostaId } = req.params;
        
        console.log(`🔍 Buscando proposta ${propostaId}...`);
        
        const propostasDir = path.join(__dirname, 'var', 'data', 'propostas');
        const files = await fs.readdir(propostasDir);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(propostasDir, file);
                    const fileData = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    
                    // Verificar se o ID corresponde (arquivo ou conteúdo)
                    const fileId = file.replace('.json', '');
                    const contentId = fileData.id;
                    
                    if (fileId === propostaId || contentId === propostaId) {
                        console.log(`✅ Proposta ${propostaId} encontrada`);
                        return res.json({ 
                            success: true, 
                            proposta: fileData 
                        });
                    }
                } catch (error) {
                    console.error(`❌ Erro ao ler arquivo ${file}:`, error);
                }
            }
        }
        
        console.log(`❌ Proposta ${propostaId} não encontrada`);
        res.status(404).json({ 
            success: false, 
            error: 'Proposta não encontrada' 
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar proposta:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para atualizar status de proposta
app.patch('/api/proposta/:propostaId/status', async (req, res) => {
    try {
        const { propostaId } = req.params;
        const { status, observacoes } = req.body;
        
        if (!status) {
            return res.status(400).json({ 
                success: false, 
                error: 'Status é obrigatório' 
            });
        }
        
        console.log(`🔄 Atualizando status da proposta ${propostaId} para: ${status}`);
        
        const propostasDir = path.join(__dirname, 'var', 'data', 'propostas');
        const files = await fs.readdir(propostasDir);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(propostasDir, file);
                    const fileData = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    
                    // Verificar se o ID corresponde
                    const fileId = file.replace('.json', '');
                    const contentId = fileData.id;
                    
                    if (fileId === propostaId || contentId === propostaId) {
                        // Atualizar status
                        fileData.status = status;
                        fileData.observacoes = observacoes || fileData.observacoes;
                        fileData.updatedAt = new Date().toISOString();
                        
                        // Salvar arquivo atualizado
                        await fs.writeFile(filePath, JSON.stringify(fileData, null, 2));
                        
                        console.log(`✅ Status da proposta ${propostaId} atualizado`);
                        return res.json({ 
                            success: true, 
                            message: 'Status atualizado com sucesso',
                            proposta: fileData
                        });
                    }
                } catch (error) {
                    console.error(`❌ Erro ao ler arquivo ${file}:`, error);
                }
            }
        }
        
        console.log(`❌ Proposta ${propostaId} não encontrada`);
        res.status(404).json({ 
            success: false, 
            error: 'Proposta não encontrada' 
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status da proposta:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para atualizar status de contrato
app.patch('/api/contrato/:contratoId/status', async (req, res) => {
    try {
        const { contratoId } = req.params;
        const { status, observacoes } = req.body;
        
        if (!status) {
            return res.status(400).json({ 
                success: false, 
                error: 'Status é obrigatório' 
            });
        }
        
        console.log(`🔄 Atualizando status do contrato ${contratoId} para: ${status}`);
        
        // Buscar contrato nos arquivos de clientes
        const clientesDir = path.join(__dirname, 'var', 'data', 'clientes');
        const files = await fs.readdir(clientesDir);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(clientesDir, file);
                    const fileData = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    
                    // Verificar contratos
                    const contratos = fileData.contratos || [];
                    const contratosRMC = fileData.contratosRMC || [];
                    const contratosRCC = fileData.contratosRCC || [];
                    
                    const todosContratos = [...contratos, ...contratosRMC, ...contratosRCC];
                    
                    for (let i = 0; i < todosContratos.length; i++) {
                        if (todosContratos[i].id === contratoId) {
                            // Atualizar status
                            todosContratos[i].status = status;
                            todosContratos[i].observacoes = observacoes || todosContratos[i].observacoes;
                            todosContratos[i].updatedAt = new Date().toISOString();
                            
                            // Salvar arquivo atualizado
                            await fs.writeFile(filePath, JSON.stringify(fileData, null, 2));
                            
                            console.log(`✅ Status do contrato ${contratoId} atualizado`);
                            return res.json({ 
                                success: true, 
                                message: 'Status atualizado com sucesso',
                                contrato: todosContratos[i]
                            });
                        }
                    }
                } catch (error) {
                    console.error(`❌ Erro ao ler arquivo ${file}:`, error);
                }
            }
        }
        
        console.log(`❌ Contrato ${contratoId} não encontrado`);
        res.status(404).json({ 
            success: false, 
            error: 'Contrato não encontrado' 
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status do contrato:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para configuração de status
app.get('/api/status-config', async (req, res) => {
    try {
        const statusConfigPath = path.join(__dirname, 'var', 'data', 'status-config.json');
        
        try {
            const statusConfig = JSON.parse(await fs.readFile(statusConfigPath, 'utf8'));
            res.json({ success: true, config: statusConfig });
        } catch (error) {
            // Se não existe, criar configuração padrão
            const defaultConfig = {
                statusFormulario: [
                    { id: 1, nome: 'Etapa 1 - Dados', descricao: 'Dados pessoais', cor: '#007bff' },
                    { id: 2, nome: 'Etapa 2 - Endereço', descricao: 'Endereço completo', cor: '#28a745' },
                    { id: 3, nome: 'Etapa 3 - Benefício', descricao: 'Dados do benefício', cor: '#ffc107' },
                    { id: 4, nome: 'Etapa 4 - Dados Bancários', descricao: 'Dados bancários', cor: '#17a2b8' },
                    { id: 5, nome: 'Cliente Finalizou', descricao: 'Formulário finalizado', cor: '#6c757d' }
                ],
                produtos: [
                    { id: 1, nome: 'Portabilidade com Troco', descricao: 'Portabilidade com troco', cor: '#007bff', origem: 'calculo', simuladorId: 1 },
                    { id: 2, nome: 'FGTS', descricao: 'Saque do FGTS', cor: '#28a745', origem: 'manual' }
                ],
                statusProposta: [
                    { id: 1, nome: 'Digitando', descricao: 'Em digitação', cor: '#ffc107' },
                    { id: 2, nome: 'Cancelado', descricao: 'Proposta cancelada', cor: '#dc3545' },
                    { id: 3, nome: 'Aprovado', descricao: 'Proposta aprovada', cor: '#28a745' },
                    { id: 4, nome: 'Em Análise', descricao: 'Em análise', cor: '#17a2b8' },
                    { id: 5, nome: 'Ag. Saldo CIP', descricao: 'Aguardando saldo CIP', cor: '#6c757d' }
                ]
            };
            
            await fs.writeFile(statusConfigPath, JSON.stringify(defaultConfig, null, 2));
            res.json({ success: true, config: defaultConfig });
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar configuração de status:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para salvar configuração de status
app.put('/api/status-config', async (req, res) => {
    try {
        const { config } = req.body;
        
        if (!config) {
            return res.status(400).json({ 
                success: false, 
                error: 'Configuração é obrigatória' 
            });
        }
        
        const statusConfigPath = path.join(__dirname, 'var', 'data', 'status-config.json');
        await fs.writeFile(statusConfigPath, JSON.stringify(config, null, 2));
        
        console.log('✅ Configuração de status salva');
        
        res.json({ 
            success: true, 
            message: 'Configuração salva com sucesso' 
        });
        
    } catch (error) {
        console.error('❌ Erro ao salvar configuração de status:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para produtos do simulador
app.get('/api/simulador/produtos', async (req, res) => {
    try {
        // Simular produtos do simulador (substituir pela lógica real)
        const produtos = [
            { id: 1, nome: 'Portabilidade com Troco', descricao: 'Portabilidade com troco' },
            { id: 2, nome: 'FGTS', descricao: 'Saque do FGTS' },
            { id: 3, nome: 'Margem Nova', descricao: 'Nova margem disponível' },
            { id: 4, nome: 'Cartão RMC', descricao: 'Cartão de crédito RMC' },
            { id: 5, nome: 'Cartão RCC', descricao: 'Cartão de crédito RCC' }
        ];
        
        res.json({ success: true, produtos });
        
    } catch (error) {
        console.error('❌ Erro ao buscar produtos do simulador:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para migrar cliente existente
app.post('/api/migrar-cliente-existente', async (req, res) => {
    try {
        const { clientId, novoClientId } = req.body;
        
        if (!clientId || !novoClientId) {
            return res.status(400).json({ 
                success: false, 
                error: 'clientId e novoClientId são obrigatórios' 
            });
        }
        
        console.log(`🔄 Migrando cliente ${clientId} para ${novoClientId}...`);
        
        const clientesDir = path.join(__dirname, 'var', 'data', 'clientes');
        const clientFilePath = path.join(clientesDir, `${clientId}.json`);
        
        try {
            const clientData = JSON.parse(await fs.readFile(clientFilePath, 'utf8'));
            
            // Atualizar ID no conteúdo
            clientData.id = novoClientId;
            clientData.updatedAt = new Date().toISOString();
            
            // Salvar com novo nome
            const novoClientFilePath = path.join(clientesDir, `${novoClientId}.json`);
            await fs.writeFile(novoClientFilePath, JSON.stringify(clientData, null, 2));
            
            // Remover arquivo antigo
            await fs.unlink(clientFilePath);
            
            console.log(`✅ Cliente migrado de ${clientId} para ${novoClientId}`);
            
            res.json({ 
                success: true, 
                message: 'Cliente migrado com sucesso',
                clientId: novoClientId
            });
            
        } catch (error) {
            console.error(`❌ Erro ao migrar cliente ${clientId}:`, error);
            res.status(404).json({ 
                success: false, 
                error: 'Cliente não encontrado' 
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao migrar cliente:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
});