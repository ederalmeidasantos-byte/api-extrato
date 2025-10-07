app.post('/api/processar-extrato', upload.single('extrato'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Arquivo de extrato é obrigatório' });
        }
        
        console.log(`📄 Processando extrato real: ${req.file.filename}`);
        
        // Importar função de extração real
        const { extrairDeUpload } = await import('./INSS/extrair_pdf.js');
        
        // Processar PDF real
        const pdfPath = req.file.path;
        const fileId = req.file.filename;
        const jsonDir = 'var/data/extratos';
        const idoportunidade = req.body.idoportunidade || null;
        
        console.log(`🔍 Parâmetros para extração:`);
        console.log(`   - fileId: ${fileId}`);
        console.log(`   - pdfPath: ${pdfPath}`);
        console.log(`   - idoportunidade: ${idoportunidade}`);
        
        const resultado = await extrairDeUpload({
            fileId,
            pdfPath,
            jsonDir,
            ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 dias
            idoportunidade
        });
        
        console.log(`✅ Extração concluída:`, resultado);
        
        res.json({ success: true, fileId: fileId, dados: resultado });
        
    } catch (error) {
        console.error('❌ Erro ao processar extrato:', error);
        res.status(500).json({ error: error.message });
    }
});



