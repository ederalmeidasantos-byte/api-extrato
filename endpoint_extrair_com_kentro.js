app.post('/extrair', async (req, res) => {
  try {
    const { fileId, idoportunidade } = req.body;
    console.log('📄 [INSS] Extraindo dados para fileId:', fileId);
    console.log('📄 [INSS] ID Oportunidade:', idoportunidade);

    // Caminhos dos arquivos
    const pdfPath = path.join(__dirname, '..', 'var', 'data', 'extratos', `extrato_${fileId}.pdf`);
    const jsonPath = path.join(__dirname, '..', 'var', 'data', 'extratos', `extrato_${fileId}.json`);
    
    console.log('📄 [INSS] PDF Path:', pdfPath);
    console.log('📄 [INSS] JSON Path:', jsonPath);

    // Verificar cache válido
    if (fs.existsSync(jsonPath)) {
      const stats = fs.statSync(jsonPath);
      const ageMs = Date.now() - stats.mtime.getTime();
      const ttlMs = 7 * 24 * 60 * 60 * 1000; // 7 dias
      
      if (ageMs < ttlMs) {
        console.log('📄 [INSS] Cache válido encontrado, retornando...');
        const extratoData = JSON.parse(await fsp.readFile(jsonPath, 'utf-8'));
        
        // Incluir ID da oportunidade se fornecido
        if (idoportunidade) {
          extratoData.idoportunidade = idoportunidade;
        }
        
        console.log('✅ [INSS] Dados extraídos do cache com sucesso');
        return res.json(extratoData);
      } else {
        console.log('📄 [INSS] Cache expirado, reprocessando...');
      }
    }

    // Se não há PDF, baixar da API da Kentro
    if (!fs.existsSync(pdfPath)) {
      console.log('📥 [INSS] PDF não encontrado localmente, baixando da API da Kentro...');
      
      try {
        // Baixar PDF da API da Kentro
        const kentroResponse = await fetch('https://lunasdigital.atenderbem.com/int/downloadFile', {
          method: 'POST',
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            queueId: 0,
            apiKey: process.env.KENTRO_API_KEY || 'cd4d0509169d4e2ea9177ac66c1c9376',
            fileId: parseInt(fileId),
            download: true
          })
        });

        if (!kentroResponse.ok) {
          throw new Error(`Erro ao baixar PDF da Kentro: ${kentroResponse.status} ${kentroResponse.statusText}`);
        }

        // Salvar PDF baixado
        const pdfBuffer = await kentroResponse.buffer();
        await fsp.writeFile(pdfPath, pdfBuffer);
        
        console.log('✅ [INSS] PDF baixado e salvo com sucesso:', pdfPath);
        
      } catch (downloadError) {
        console.error('❌ [INSS] Erro ao baixar PDF da Kentro:', downloadError);
        return res.status(404).json({ 
          error: 'Erro ao baixar PDF da Kentro',
          details: downloadError.message,
          fileId: fileId
        });
      }
    }

    console.log('🚀 [INSS] Processando PDF com ChatGPT...');
    
    // Importar função de extração
    const { extrairDeUpload } = await import('./extrair_pdf.js');
    
    // Fazer a extração real
    const resultado = await extrairDeUpload({
      fileId: fileId,
      pdfPath: pdfPath,
      jsonDir: path.join(__dirname, '..', 'var', 'data', 'extratos'),
      ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 dias
      idoportunidade: idoportunidade
    });
    
    console.log('✅ [INSS] Extração concluída com sucesso');
    console.log('📊 [INSS] Cliente:', resultado.cliente);
    console.log('📊 [INSS] Contratos encontrados:', resultado.contratos?.length || 0);
    
    res.json(resultado);

  } catch (error) {
    console.error('❌ [INSS] Erro ao extrair dados:', error);
    res.status(500).json({ 
      error: 'Erro ao extrair dados', 
      details: error.message,
      fileId: req.body.fileId
    });
  }
});


