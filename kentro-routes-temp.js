
// ===== ROTAS KENTRO =====
// Buscar cliente por CPF
app.post('/kentro/buscar-cliente', async (req, res) => {
  try {
    const { cpf } = req.body;
    
    if (!cpf) {
      return res.json({ success: false, error: 'CPF não fornecido' });
    }

    console.log(`🔍 Buscando cliente por CPF: ${cpf}`);
    
    const response = await axios.post('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
      queueId: 25,
      apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
      pipelineId: 2
    }, {
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const oportunidades = response.data;
    
    // Procurar por CPF no campo mainmail (conforme documentação Kentro)
    const oportunidade = oportunidades.find(op => {
      // Buscar CPF no campo mainmail (campo principal para identificação)
      if (op.mainmail && op.mainmail.replace(/\D/g, '') === cpf.replace(/\D/g, '')) {
        return true;
      }
      
      return false;
    });
    
    if (oportunidade) {
      const cliente = {
        idoportunidade: oportunidade.id,
        cliente: {
          nome: oportunidade.contact?.name || oportunidade.name || '',
          status: oportunidade.status || 'Ativo',
          cpf: cpf
        }
      };
      
      res.json({ success: true, ...cliente });
    } else {
      res.json({ success: false, error: 'Cliente não encontrado' });
    }

  } catch (error) {
    console.error('❌ Erro ao buscar cliente:', error);
    res.json({ success: false, error: error.message });
  }
});

// Criar nova oportunidade na Kentro
app.post('/kentro/criar-oportunidade', async (req, res) => {
  try {
    const { cpf, origem, descricao } = req.body;
    
    if (!cpf) {
      return res.json({ success: false, error: 'CPF não fornecido' });
    }

    console.log(`🆕 Criando nova oportunidade para CPF: ${cpf}`);
    console.log(`📋 Origem: ${origem || 'N/A'}`);
    console.log(`📝 Descrição: ${descricao || 'N/A'}`);
    
    const response = await axios.post('https://lunasdigital.atenderbem.com/int/createOpportunity', {
      queueId: 25,
      apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
      title: `Cliente ${cpf.substring(0, 3)}***`,
      mainmail: cpf,
      value: 1,
      description: descricao || 'Oportunidade criada via simulador INSS',
      source: origem || 'INSS_SIMULADOR'
    }, {
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    const novaOportunidade = {
      id: response.data.id,
      cpf: cpf,
      origem: origem || 'INSS_SIMULADOR',
      descricao: descricao || 'Oportunidade criada via simulador INSS',
      status: 'Nova',
      dataCriacao: new Date().toISOString()
    };
    
    console.log(`✅ Oportunidade criada:`, novaOportunidade);
    
    res.json({ 
      success: true, 
      oportunidade: novaOportunidade,
      message: 'Oportunidade criada com sucesso na Kentro'
    });

  } catch (error) {
    console.error('❌ Erro ao criar oportunidade:', error);
    res.json({ success: false, error: error.message });
  }
});




