// Sistema de Links Mascarados - Implementação Simples
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

// Função para adicionar endpoints de links mascarados
function adicionarLinksMascarados(app) {
    console.log('🔗 Adicionando sistema de links mascarados...');

    // Endpoint para criar link temporário mascarado
    app.post('/api/criar-link-temporario', async (req, res) => {
        try {
            const { clienteData, contratosData, clientId, proposalId } = req.body;
            
            // Gerar ID único para o link temporário
            const linkId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Salvar dados temporariamente
            const tempData = {
                linkId,
                clienteData,
                contratosData,
                clientId,
                proposalId,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
            };
            
            const tempDir = path.join(__dirname, 'var', 'data', 'temp-links');
            
            // Criar diretório se não existir
            try {
                await fs.mkdir(tempDir, { recursive: true });
            } catch (err) {
                // Diretório já existe
            }
            
            // Salvar arquivo temporário
            await fs.writeFile(
                path.join(tempDir, `${linkId}.json`),
                JSON.stringify(tempData, null, 2)
            );
            
            console.log(`🔗 Link temporário criado: ${linkId}`);
            
            res.json({
                success: true,
                linkId,
                maskedUrl: `/operacional/formulario-cliente.html?linkId=${linkId}`
            });
        } catch (error) {
            console.error('❌ Erro ao criar link temporário:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    });

    // Endpoint para buscar dados do link temporário
    app.get('/api/dados-link-temporario/:linkId', async (req, res) => {
        try {
            const { linkId } = req.params;
            
            const tempDir = path.join(__dirname, 'var', 'data', 'temp-links');
            const filePath = path.join(tempDir, `${linkId}.json`);
            
            // Verificar se arquivo existe
            try {
                await fs.access(filePath);
            } catch (err) {
                return res.status(404).json({
                    success: false,
                    error: 'Link não encontrado ou expirado'
                });
            }
            
            // Ler dados do arquivo
            const fileContent = await fs.readFile(filePath, 'utf8');
            const tempData = JSON.parse(fileContent);
            
            // Verificar se link não expirou
            const now = new Date();
            const expiresAt = new Date(tempData.expiresAt);
            
            if (now > expiresAt) {
                // Remover arquivo expirado
                await fs.unlink(filePath);
                return res.status(410).json({
                    success: false,
                    error: 'Link expirado'
                });
            }
            
            console.log(`📋 Dados do link temporário recuperados: ${linkId}`);
            
            res.json({
                success: true,
                data: {
                    clienteData: tempData.clienteData,
                    contratosData: tempData.contratosData,
                    clientId: tempData.clientId,
                    proposalId: tempData.proposalId
                }
            });
        } catch (error) {
            console.error('❌ Erro ao buscar dados do link temporário:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    });

    console.log('✅ Sistema de links mascarados adicionado!');
}

module.exports = { adicionarLinksMascarados };
