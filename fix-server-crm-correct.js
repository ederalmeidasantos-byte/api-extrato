const fs = require('fs');
const path = require('path');

// Ler o arquivo server-crm.js
const filePath = '/root/api-lunas/operacional/server-crm.js';
let content = fs.readFileSync(filePath, 'utf8');

// Encontrar onde está o endpoint POST de clientes e adicionar o DELETE após ele
const postPattern = /\/\/ Criar\/atualizar cliente[\s\S]*?app\.post\('\/api\/clientes', async \(req, res\) => \{[\s\S]*?\}\);/;
const postMatch = content.match(postPattern);

if (postMatch) {
    const insertPoint = postMatch.index + postMatch[0].length;
    
    const deleteEndpoint = `

// Excluir cliente
app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🗑️ [CRM] Excluindo cliente:', id);
        
        const response = await fetch(\`\${DB_URL}/api/clientes/\${id}\`, {
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

`;
    
    // Inserir o endpoint DELETE
    const newContent = content.slice(0, insertPoint) + deleteEndpoint + content.slice(insertPoint);
    
    // Salvar o arquivo
    fs.writeFileSync(filePath, newContent);
    console.log('✅ Endpoint DELETE adicionado corretamente ao server-crm.js');
} else {
    console.log('❌ Não foi possível encontrar o endpoint POST de clientes');
}
