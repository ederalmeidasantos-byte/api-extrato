const fs = require('fs');
const path = require('path');

// Ler o arquivo server-crm.js
const filePath = '/root/api-lunas/operacional/server-crm.js';
let content = fs.readFileSync(filePath, 'utf8');

// Encontrar onde está o problema - após o body: JSON.stringify(cliente)
const problemPattern = /body: JSON\.stringify\(cliente\)\s*\}\);/;
const problemMatch = content.match(problemPattern);

if (problemMatch) {
    const insertPoint = problemMatch.index + problemMatch[0].length;
    
    const missingCode = `
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('❌ [CRM] Erro ao salvar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

`;
    
    // Inserir o código que está faltando
    const newContent = content.slice(0, insertPoint) + missingCode + content.slice(insertPoint);
    
    // Salvar o arquivo
    fs.writeFileSync(filePath, newContent);
    console.log('✅ Código faltante adicionado ao server-crm.js');
} else {
    console.log('❌ Não foi possível encontrar o local para corrigir');
}
