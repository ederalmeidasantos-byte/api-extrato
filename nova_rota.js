// Rota para simulador com dados JSON
app.get('/inss/simulador/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 [INSS] Buscando dados do simulador para ID: ${id}`);
    
    // Carregar dados do extrato
    const jsonPath = path.join(__dirname, '..', 'var', 'data', 'extratos', `extrato_${id}.json`);
    
    if (fs.existsSync(jsonPath)) {
      console.log(`✅ [INSS] Dados encontrados para ID: ${id}`);
      const dados = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      
      res.json({
        success: true,
        simulador: dados,
        id: id,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`⚠️ [INSS] Arquivo não encontrado: ${jsonPath}`);
      res.status(404).json({
        success: false,
        error: 'Dados do simulador não encontrados',
        id: id
      });
    }
  } catch (error) {
    console.error('❌ [INSS] Erro ao buscar dados do simulador:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});


