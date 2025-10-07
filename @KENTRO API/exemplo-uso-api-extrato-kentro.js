/**
 * Exemplo de Uso - API Extrair Extrato com ID Kentro
 * Demonstra como usar a API modificada no frontend
 */

// ========================================
// 1. EXEMPLO DE UPLOAD COM ID KENTRO
// ========================================

async function uploadExtratoComKentro(arquivo, kentroId, cpf) {
  console.log('📄 Iniciando upload de extrato com ID Kentro...');
  console.log(`   - ID Kentro: ${kentroId}`);
  console.log(`   - CPF: ${cpf}`);
  console.log(`   - Arquivo: ${arquivo.name}`);
  
  try {
    // Criar FormData
    const formData = new FormData();
    formData.append('extrato', arquivo);
    formData.append('kentroId', kentroId);
    formData.append('cpf', cpf);
    
    // Fazer upload
    const response = await fetch('/api/extrair-extrato', {
      method: 'POST',
      body: formData
    });
    
    const resultado = await response.json();
    
    if (!response.ok) {
      throw new Error(resultado.error || 'Erro no upload');
    }
    
    console.log('✅ Upload concluído:', resultado);
    return resultado;
    
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    throw error;
  }
}

// ========================================
// 2. EXEMPLO DE PREENCHIMENTO NA KENTRO
// ========================================

async function preencherKentro(kentroId, dadosExtraidos, cpf) {
  console.log('🔄 Preenchendo dados na Kentro...');
  console.log(`   - ID Kentro: ${kentroId}`);
  console.log(`   - CPF: ${cpf}`);
  console.log(`   - Dados: ${JSON.stringify(dadosExtraidos, null, 2)}`);
  
  try {
    const response = await fetch('/api/preencher-kentro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        kentroId: kentroId,
        dadosExtraidos: dadosExtraidos,
        cpf: cpf
      })
    });
    
    const resultado = await response.json();
    
    if (!response.ok) {
      throw new Error(resultado.error || 'Erro no preenchimento');
    }
    
    console.log('✅ Preenchimento concluído:', resultado);
    return resultado;
    
  } catch (error) {
    console.error('❌ Erro no preenchimento:', error);
    throw error;
  }
}

// ========================================
// 3. FLUXO COMPLETO INTEGRADO
// ========================================

async function processarExtratoCompleto(arquivo, kentroId, cpf) {
  console.log('🚀 Iniciando processamento completo...');
  
  try {
    // 1. Upload e extração
    console.log('\n📄 Passo 1: Upload e extração de dados...');
    const extração = await uploadExtratoComKentro(arquivo, kentroId, cpf);
    
    if (!extração.success) {
      throw new Error('Erro na extração: ' + extração.error);
    }
    
    console.log('✅ Dados extraídos com sucesso');
    console.log(`   - Nome: ${extração.dadosExtraidos.nomeCompleto}`);
    console.log(`   - Saldo: R$ ${extração.dadosExtraidos.saldoDevedor}`);
    console.log(`   - Parcela: R$ ${extração.dadosExtraidos.parcelaAtual}`);
    
    // 2. Preenchimento na Kentro
    console.log('\n🔄 Passo 2: Preenchimento na Kentro...');
    const preenchimento = await preencherKentro(kentroId, extração.dadosExtraidos, cpf);
    
    if (!preenchimento.success) {
      throw new Error('Erro no preenchimento: ' + preenchimento.error);
    }
    
    console.log('✅ Dados preenchidos na Kentro com sucesso');
    console.log(`   - Campos atualizados: ${preenchimento.dadosAtualizados.camposAtualizados}`);
    
    // 3. Resultado final
    const resultadoFinal = {
      success: true,
      kentroId: kentroId,
      cpf: cpf,
      dadosExtraidos: extração.dadosExtraidos,
      dadosAtualizados: preenchimento.dadosAtualizados,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n🎉 Processamento completo concluído!');
    console.log('📊 Resultado final:', resultadoFinal);
    
    return resultadoFinal;
    
  } catch (error) {
    console.error('❌ Erro no processamento completo:', error);
    throw error;
  }
}

// ========================================
// 4. EXEMPLO DE USO NO HTML
// ========================================

function criarInterfaceHTML() {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Upload Extrato com ID Kentro</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .resultado { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px; }
            .erro { background: #f8d7da; color: #721c24; }
            .sucesso { background: #d4edda; color: #155724; }
        </style>
    </head>
    <body>
        <h1>📄 Upload de Extrato com ID Kentro</h1>
        
        <form id="uploadForm" enctype="multipart/form-data">
            <div class="form-group">
                <label for="kentroId">ID Kentro:</label>
                <input type="text" id="kentroId" name="kentroId" required 
                       placeholder="Ex: 36383" value="36383">
            </div>
            
            <div class="form-group">
                <label for="cpf">CPF:</label>
                <input type="text" id="cpf" name="cpf" required 
                       placeholder="Ex: 04973279889" value="04973279889">
            </div>
            
            <div class="form-group">
                <label for="extrato">Extrato PDF:</label>
                <input type="file" id="extrato" name="extrato" accept=".pdf" required>
            </div>
            
            <button type="submit">🚀 Processar Extrato</button>
        </form>
        
        <div id="resultado" class="resultado" style="display: none;"></div>
        
        <script>
            document.getElementById('uploadForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const kentroId = document.getElementById('kentroId').value;
                const cpf = document.getElementById('cpf').value;
                const arquivo = document.getElementById('extrato').files[0];
                
                if (!arquivo) {
                    mostrarErro('Selecione um arquivo PDF');
                    return;
                }
                
                try {
                    mostrarCarregando('Processando extrato...');
                    
                    const resultado = await processarExtratoCompleto(arquivo, kentroId, cpf);
                    
                    mostrarSucesso('Extrato processado com sucesso!', resultado);
                    
                } catch (error) {
                    mostrarErro('Erro ao processar extrato: ' + error.message);
                }
            });
            
            function mostrarCarregando(mensagem) {
                const div = document.getElementById('resultado');
                div.style.display = 'block';
                div.className = 'resultado';
                div.innerHTML = '<p>⏳ ' + mensagem + '</p>';
            }
            
            function mostrarSucesso(mensagem, dados) {
                const div = document.getElementById('resultado');
                div.style.display = 'block';
                div.className = 'resultado sucesso';
                div.innerHTML = '<p>✅ ' + mensagem + '</p><pre>' + JSON.stringify(dados, null, 2) + '</pre>';
            }
            
            function mostrarErro(mensagem) {
                const div = document.getElementById('resultado');
                div.style.display = 'block';
                div.className = 'resultado erro';
                div.innerHTML = '<p>❌ ' + mensagem + '</p>';
            }
        </script>
    </body>
    </html>
  `;
}

// ========================================
// 5. EXEMPLO DE TESTE AUTOMATIZADO
// ========================================

async function testarAPI() {
  console.log('🧪 Iniciando teste da API...');
  
  try {
    // 1. Testar endpoint de teste
    console.log('\n1. Testando endpoint de teste...');
    const response = await fetch('/api/teste-extrato-kentro');
    const teste = await response.json();
    console.log('✅ Endpoint de teste:', teste);
    
    // 2. Simular upload (sem arquivo real)
    console.log('\n2. Simulando upload...');
    const formData = new FormData();
    formData.append('kentroId', '36383');
    formData.append('cpf', '04973279889');
    // formData.append('extrato', arquivoFake); // Em teste real
    
    console.log('✅ Simulação de upload preparada');
    
    // 3. Simular preenchimento
    console.log('\n3. Simulando preenchimento...');
    const dadosSimulados = {
      nomeCompleto: "MARIA DE JESUS SABINO DA SILVA",
      dataNascimento: "12/08/1959",
      nomeMae: "MARIA DE JESUS",
      celular: "5581988457906",
      email: "maria@exemplo.com",
      saldoDevedor: "1630.32",
      parcelaAtual: "37.79",
      taxaJuros: "1.66",
      prazoRestante: "84",
      bancoOriginador: "DAYCOVAL",
      bancoProposta: "DAYCOVAL",
      agencia: "1",
      conta: "0010185906",
      numeroBeneficio: "1631008150",
      especieBeneficio: "41"
    };
    
    console.log('✅ Dados simulados preparados');
    
    console.log('\n🎉 Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// ========================================
// 6. EXEMPLO DE INTEGRAÇÃO COM SISTEMA OPERACIONAL
// ========================================

class ProcessadorExtratoKentro {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }
  
  async processarExtrato(arquivo, kentroId, cpf) {
    try {
      // 1. Upload e extração
      const extração = await this.uploadExtrato(arquivo, kentroId, cpf);
      
      // 2. Preenchimento na Kentro
      const preenchimento = await this.preencherKentro(kentroId, extração.dadosExtraidos, cpf);
      
      // 3. Retornar resultado
      return {
        success: true,
        kentroId: kentroId,
        cpf: cpf,
        dadosExtraidos: extração.dadosExtraidos,
        dadosAtualizados: preenchimento.dadosAtualizados,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Erro no processamento:', error);
      throw error;
    }
  }
  
  async uploadExtrato(arquivo, kentroId, cpf) {
    const formData = new FormData();
    formData.append('extrato', arquivo);
    formData.append('kentroId', kentroId);
    formData.append('cpf', cpf);
    
    const response = await fetch(`${this.apiUrl}/api/extrair-extrato`, {
      method: 'POST',
      body: formData
    });
    
    return await response.json();
  }
  
  async preencherKentro(kentroId, dadosExtraidos, cpf) {
    const response = await fetch(`${this.apiUrl}/api/preencher-kentro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        kentroId: kentroId,
        dadosExtraidos: dadosExtraidos,
        cpf: cpf
      })
    });
    
    return await response.json();
  }
}

// ========================================
// 7. EXEMPLO DE USO DA CLASSE
// ========================================

async function exemploUsoClasse() {
  console.log('🏭 Exemplo de uso da classe ProcessadorExtratoKentro...');
  
  const processador = new ProcessadorExtratoKentro('http://localhost:3000');
  
  try {
    // Simular arquivo
    const arquivoSimulado = {
      name: 'extrato_04973279889.pdf',
      type: 'application/pdf'
    };
    
    const resultado = await processador.processarExtrato(
      arquivoSimulado,
      '36383',
      '04973279889'
    );
    
    console.log('✅ Processamento concluído:', resultado);
    
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
  }
}

// ========================================
// 8. EXPORTAR FUNÇÕES
// ========================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    uploadExtratoComKentro,
    preencherKentro,
    processarExtratoCompleto,
    criarInterfaceHTML,
    testarAPI,
    ProcessadorExtratoKentro,
    exemploUsoClasse
  };
}

// ========================================
// 9. EXECUTAR EXEMPLOS
// ========================================

if (typeof window === 'undefined') {
  // Executar em Node.js
  console.log('🚀 Executando exemplos...');
  
  // testarAPI();
  // exemploUsoClasse();
  
  console.log('✅ Exemplos carregados com sucesso!');
  console.log('📄 Use as funções exportadas para testar a API');
}



