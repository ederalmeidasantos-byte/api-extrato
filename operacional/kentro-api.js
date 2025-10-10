/**
 * Módulo de integração com a API Kentro (AtenderBem)
 * Versão Node.js - compatível com ES Modules
 * 
 * NOTA: Este módulo assume que fetch está disponível globalmente
 * (Node.js 18+ ou importado no arquivo principal)
 */

/**
 * Busca cliente na Kentro por CPF
 */
export async function buscarClientePorCpf(cpf, apiKey, apiUrl) {
  try {
    const cpfLimpo = cpf.replace(/\D/g, '');
    console.log(`🔍 [KENTRO] Buscando CPF: ${cpfLimpo}`);
    
    // Buscar todas as oportunidades
    const formData = new URLSearchParams();
    formData.append('queueId', '25');
    formData.append('apiKey', apiKey);
    formData.append('pipelineId', '2');
    
    const response = await fetch(`${apiUrl}/getPipeOpportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }
    
    const oportunidades = await response.json();
    console.log(`🔍 [KENTRO] Total de oportunidades encontradas: ${oportunidades.length}`);
    
    // Procurar por CPF no mainmail
    const oportunidade = oportunidades.find(op => {
      const mainmail = op.mainmail || '';
      return mainmail.includes(cpfLimpo);
    });
    
    if (oportunidade) {
      console.log(`✅ [KENTRO] Cliente encontrado: ${oportunidade.title || 'Nome não disponível'}`);
      return {
        kentroId: oportunidade.id,
        nome: oportunidade.title,
        cpf: cpfLimpo,
        mainmail: oportunidade.mainmail,
        telefone: oportunidade.mainphone,
        dadosCompletos: oportunidade
      };
    }
    
    console.log(`❌ [KENTRO] Cliente não encontrado por CPF: ${cpf}`);
    return null;
    
  } catch (error) {
    console.error('❌ [KENTRO] Erro ao buscar cliente por CPF:', error.message);
    throw error;
  }
}

/**
 * Busca oportunidade na Kentro por ID
 */
export async function buscarOportunidadePorId(kentroId, apiKey, apiUrl) {
  try {
    console.log(`🔍 [KENTRO] Buscando oportunidade por ID: ${kentroId}`);
    
    const formData = new URLSearchParams();
    formData.append('queueId', '25');
    formData.append('apiKey', apiKey);
    formData.append('id', kentroId);
    
    const response = await fetch(`${apiUrl}/getOpportunity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }
    
    const oportunidade = await response.json();
    console.log(`✅ [KENTRO] Oportunidade encontrada: ${oportunidade.title || 'Sem título'}`);
    return oportunidade;
    
  } catch (error) {
    console.error('❌ [KENTRO] Erro ao buscar oportunidade por ID:', error.message);
    throw error;
  }
}

