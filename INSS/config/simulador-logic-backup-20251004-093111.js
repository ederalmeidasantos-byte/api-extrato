// Configurações do simulador (inline para evitar problemas com módulos ES6)
const configSimulador = {
  // URL da API principal (detecta automaticamente se é local ou produção)
  apiUrl: (() => {
    // Se estiver rodando localmente ou em rede local, usa o hostname atual
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const port = window.location.port;
      
      // Localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
        return 'http://localhost:3000';
      }
      
      // IP de rede local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
        return `http://${hostname}:3000`;
      }
    }
    // Caso contrário, usa a URL de produção
    return 'https://api-extrato-1.onrender.com';
  })(),
  
  // Configurações de debug
  debug: {
    habilitado: (() => {
      // Habilita debug automaticamente em ambiente local ou rede local
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Localhost ou IP de rede local
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' ||
            hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
          return true;
        }
      }
      return false;
    })(),
    logLevel: 'info', // debug, info, warn, error
    mostrarDetalhes: (() => {
      // Mostra detalhes automaticamente em ambiente local ou rede local
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Localhost ou IP de rede local
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' ||
            hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
          return true;
        }
      }
      return false;
    })()
  }
};

let contratos = [];
let cliente = {};
let margens = {};
let contratosAtivos = [];
let contratosNaoAprovados = [];
let codigoExtrato = null; // Para identificar múltiplas simulações
let extratoAtual = null; // Dados do extrato atual para uso no sistema operacional

// Função utilitária para pegar parâmetros da URL
function getUrlParameter(name) {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Log de inicialização
console.log('✅ Configuração do simulador carregada:', configSimulador);
if (typeof window !== 'undefined') {
  console.log('🔍 Debug - Hostname:', window.location.hostname);
  console.log('🔍 Debug - Port:', window.location.port);
  console.log('🔍 Debug - Full URL:', window.location.href);
  console.log('🔍 Debug - Parâmetros URL:', window.location.search);
  console.log('🔍 Debug - ID Oportunidade na URL:', getUrlParameter('idoportunidade'));
  console.log('🔍 Debug - Kentro ID na URL:', getUrlParameter('kentroId'));
}
console.log('🔍 Debug - API URL:', configSimulador.apiUrl);
console.log('🔍 Debug - Debug habilitado:', configSimulador.debug.habilitado);

// Tabela de espécies do INSS (código ↔ nome) + mapBeneficio(raw)
const BENEFICIOS = {
    // Aposentadoria por Idade
    "07": "Aposentadoria por idade do trabalhador rural",
    "08": "Aposentadoria por idade do empregador rural",
    "41": "Aposentadoria por idade",
    "52": "Aposentadoria por idade",
    "78": "Aposentadoria por idade (Extinto Plano Básico)",
    "81": "Aposentadoria por idade compulsória (Ex-SASSE)",

    // Aposentadoria por Invalidez
    "04": "Aposentadoria por invalidez do trabalhador rural",
    "06": "Aposentadoria por invalidez do empregador rural",
    "32": "Aposentadoria por invalidez previdenciária",
    "33": "Aposentadoria por invalidez de aeronauta",
    "34": "Aposentadoria por invalidez de ex-combatente marítimo (Lei nº 1.756/52)",
    "51": "Aposentadoria por invalidez (Extinto Plano Básico)",
    "83": "Aposentadoria por invalidez (Ex-SASSE)",

    // Tempo de Contribuição
    "42": "APOSENTADORIA POR TEMPO DE CONTRIBUICAO",
    "43": "Aposentadoria por tempo de contribuição de ex-combatente",
    "44": "Aposentadoria por tempo de contribuição de aeronauta",
    "45": "Aposentadoria por tempo de contribuição de jornalista profissional",
    "46": "Aposentadoria por tempo de contribuição especial",
    "49": "Aposentadoria por tempo de contribuição ordinária",
    "57": "Aposentadoria por tempo de servico de professores",
    "72": "Apos. por tempo de contribuição de ex-combatente marítimo (Lei 1.756/52)",
    "82": "Aposentadoria por tempo de contribuição (Ex-SASSE)",

    // Pensão por morte
    "01": "Pensão por morte do trabalhador rural",
    "03": "Pensão por morte do empregador rural",
    "21": "Pensão por morte previdenciária",
    "23": "Pensão por morte de ex-combatente",
    "27": "Pensão por morte de servidor público federal com dupla aposentadoria",
    "28": "Pensão por morte do Regime Geral (Decreto nº 20.465/31)",
    "29": "Pensão por morte de ex-combatente marítimo (Lei nº 1.756/52)",
    "55": "Pensão por morte (Extinto Plano Básico)",
    "84": "Pensão por morte (Ex-SASSE)",

    // Auxílios
    "13": "Auxílio-doença do trabalhador rural",
    "15": "Auxílio-reclusão do trabalhador rural",
    "25": "Auxílio-reclusão",
    "31": "Auxílio-doença previdenciário",
    "36": "Auxílio Acidente",
    "50": "Auxílio-doença (Extinto Plano Básico)",

    // Benefícios Acidentários
    "02": "Pensão por morte por acidente do trabalho do trabalhador rural",
    "05": "Aposentadoria por invalidez por acidente do trabalho do trabalhador rural",
    "10": "Auxílio-doença por acidente do trabalho do trabalhador rural",
    "91": "Auxílio-doença por acidente do trabalho",
    "92": "APOSENTADORIA INVALIDEZ - ACIDENTE DO TRABALHO",
    "93": "Pensão por morte por acidente do trabalho",
    "94": "Auxílio-acidente por acidente do trabalho",
    "95": "Auxílio-suplementar por acidente do trabalho",

    // Benefícios Assistenciais (LOAS e correlatos)
    "11": "Renda mensal vitalícia por invalidez do trabalhador rural (Lei nº 6.179/74)",
    "12": "Renda mensal vitalícia por idade do trabalhador rural (Lei nº 6.179/74)",
    "30": "Renda mensal vitalícia por invalidez (Lei nº 6.179/74)",
    "40": "Renda mensal vitalícia por idade (Lei nº 6.179/74)",
    "85": "Pensão mensal vitalícia do seringueiro (Lei nº 7.986/89)",
    "86": "Pensão mensal vitalícia do dependente do seringueiro (Lei nº 7.986/89)",
    "87": "BENEFICIO DE PRESTACAO CONTINUADA A PESSOA COM DEFICIENCIA",
    "88": "BENEFICIO DE PRESTACAO CONTINUADA A PESSOA IDOSA",

    // Espécies Diversas
    "47": "Abono de permanência em serviço 25%",
    "48": "Abono de permanência em serviço 20%",
    "68": "Pecúlio especial de aposentadoria",
    "79": "Abono de servidor aposentado pela autarquia empregadora (Lei 1.756/52)",
    "80": "Salário-maternidade",

    // Encargos Previdenciários da União / Especiais
    "22": "Pensão por morte estatutária",
    "26": "Pensão especial (Lei nº 593/48)",
    "37": "Aposentadoria de extranumerário da União",
    "38": "Aposentadoria da extinta CAPIN",
    "54": "Pensão especial vitalícia (Lei nº 9.793/99)",
    "56": "Pensão mensal vitalícia por síndrome de talidomida (Lei nº 7.070/82)",
    "58": "Aposentadoria excepcional do anistiado (Lei nº 6.683/79)",
    "59": "Pensão por morte excepcional do anistiado (Lei nº 6.683/79)",
    "60": "Pensão especial mensal vitalícia (Lei 10.923/2004)",
    "76": "Salário-família estatutário da RFFSA (Decreto-lei nº 956/69)",
    "89": "Pensão especial aos dependentes de vítimas fatais por contaminação na hemodiálise",
    "96": "Pensão especial às pessoas atingidas pela hanseníase (Lei nº 11.520/2007)"
};

// chaves auxiliares para nomes genéricos mais comuns → código "padrão"
const DEFAULT_BY_GROUP = [
    { key: "aposentadoria por idade", codigo: "41" },
    { key: "aposentadoria por invalidez", codigo: "32" },
    { key: "aposentadoria por tempo de contribuicao", codigo: "42" },
    { key: "pensao por morte", codigo: "21" },
    { key: "auxilio-doenca", codigo: "31" },
    { key: "auxilio acidente", codigo: "36" },
    { key: "amparo assistencial ao idoso", codigo: "88" },
    { key: "amparo assistencial a pessoa com deficiencia", codigo: "87" },
];

function formatBRNumber(n) {
    return Number(n).toLocaleString("pt-BR", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

function formatTaxa(value) {
    if (value == null || value === '') return '0,00';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) : value;
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function formatarValorReal(input) {
    // Remove tudo que não é número
    let valor = input.value.replace(/\D/g, '');
    
    // Se vazio, deixa vazio
    if (valor === '') {
        input.value = '';
        return;
    }
    
    // Converte para número e formata
    const numero = parseFloat(valor) / 100;
    input.value = formatBRNumber(numero);
}

function formatarTaxa(input) {
    // Remove tudo que não é número ou vírgula/ponto
    let valor = input.value.replace(/[^\d,.]/g, '');
    
    // Se vazio, deixa vazio
    if (valor === '') {
        input.value = '';
        return;
    }
    
    // Se tem vírgula e ponto, manter apenas o último
    const ultimaVirgula = valor.lastIndexOf(',');
    const ultimoPonto = valor.lastIndexOf('.');
    
    if (ultimaVirgula > ultimoPonto) {
        // Vírgula é o separador decimal
        valor = valor.replace(/\./g, '').replace(',', '.');
    } else if (ultimoPonto > ultimaVirgula) {
        // Ponto é o separador decimal
        valor = valor.replace(/,/g, '');
    } else if (ultimaVirgula !== -1) {
        // Só tem vírgula
        valor = valor.replace(',', '.');
    }
    
    const numero = parseFloat(valor);
    if (!isNaN(numero)) {
        input.value = numero.toFixed(2).replace('.', ',');
    }
}

function calcularPrazoRestante(prazoTotal, parcelasPagas) {
    return Math.max(0, prazoTotal - parcelasPagas);
}

function calcularSaldoDevedor(contrato) {
    // CRÍTICO: Usar sempre a PARCELA ORIGINAL para o saldo devedor, não a ajustada
    const parcelaOriginal = parseFloat(contrato.__parcela_original__ || contrato.valor_parcela_original || contrato.valor_parcela || 0);
    const prazoRestante = calcularPrazoRestante(contrato.prazo_total || 0, contrato.parcelas_pagas || 0);
    let taxaAtualMes = toNumber(contrato.taxa_juros_mensal || 0);
    
    console.log(`💰 Cálculo do saldo devedor para contrato ${contrato.contrato}:`);
    console.log(`   Parcela ORIGINAL: ${parcelaOriginal}`);
    console.log(`   Parcela AJUSTADA: ${contrato.valor_parcela}`);
    console.log(`   Taxa: ${taxaAtualMes}%`);
    console.log(`   Prazo Total: ${contrato.prazo_total}`);
    console.log(`   Parcelas Pagas: ${contrato.parcelas_pagas}`);
    console.log(`   Prazo Restante: ${prazoRestante}`);
    
    // Se não tem taxa, estimar pelo valor pago
    if (!(taxaAtualMes > 0) && contrato.valor_liberado && contrato.prazo_total) {
        taxaAtualMes = estimarTaxaPorValorPago(contrato.valor_liberado, contrato.prazo_total, parcelaOriginal);
    }
    
    // Se ainda não tem taxa, usar padrão
    if (!(taxaAtualMes > 0)) {
        taxaAtualMes = 1.85; // Taxa padrão
    }
    
    // IMPORTANTE: Saldo devedor SEMPRE baseado na parcela original
    const saldoDevedor = pvFromParcela(parcelaOriginal, taxaAtualMes, prazoRestante);
    
    console.log(`   Saldo Devedor Original: R$ ${saldoDevedor.toFixed(2)}`);
    console.log(`   Saldo Devedor Calculado: R$ ${saldoDevedor.toFixed(2)}`);
    console.log(`   ✅ USANDO SALDO CALCULADO: R$ ${saldoDevedor.toFixed(2)}`);
    
    return saldoDevedor;
}

// Função para calcular PV (Valor Presente) de uma série uniforme
function pvFromParcela(parcela, taxaPercentMes, n) {
    const i = Number(taxaPercentMes) / 100;
    if (!(i > 0) || !(n > 0)) return 0;
    const fator = (1 - Math.pow(1 + i, -n)) / i;
    return parcela * fator;
}

// Função para estimar taxa de juros por valor pago
function estimarTaxaPorValorPago(valorLiberado, prazoTotal, valorParcela) {
    const pv = toNumber(valorLiberado || 0);
    const n = toNumber(prazoTotal || 0);
    const pmt = toNumber(valorParcela || 0);
    if (!(pv > 0) || !(n > 0) || !(pmt > 0)) return 0;

    let i = 0.02;
    for (let k = 0; k < 50; k++) {
        const denom = i === 0 ? 1e-9 : i;
        const f = (pmt * (1 - Math.pow(1 + denom, -n))) / denom - pv;
        if (Math.abs(f) < 1e-7) break;

        const h = 1e-5;
        const ip = denom + h;
        const fp = (pmt * (1 - Math.pow(1 + ip, -n))) / ip - pv;
        const fPrime = (fp - f) / h;

        if (!Number.isFinite(fPrime) || Math.abs(fPrime) < 1e-12) break;
        i = i - f / fPrime;
        if (!Number.isFinite(i) || i <= 0 || i > 1) i = 0.01;
    }
    return i * 100;
}

function toggleEdicao(contratoId) {
    const contrato = contratos.find(c => c.id === contratoId);
    if (contrato) {
        if (contrato.editando) {
            // Salvando dados editados antes de bloquear
            salvarDadosEditados(contratoId);
        }
        contrato.editando = !contrato.editando;
        // Não renderizar completamente para não minimizar
        atualizarCamposEdicao(contratoId);
    }
}

function atualizarCamposEdicao(contratoId) {
    const contrato = contratos.find(c => c.id === contratoId);
    if (!contrato) return;
    
    // Atualizar apenas os campos de input sem re-renderizar tudo
    const inputs = document.querySelectorAll(`#detalhes-${contratoId} .detail-input`);
    inputs.forEach(input => {
        input.disabled = !contrato.editando;
    });
    
    // Atualizar botão
    const btn = document.querySelector(`#detalhes-${contratoId} .btn-secondary`);
    if (btn) {
        btn.innerHTML = contrato.editando ? '💾 Salvar' : '✏️ Editar';
    }
}

function salvarDadosEditados(contratoId) {
    const contrato = contratos.find(c => c.id === contratoId);
    if (!contrato) return;
    
    // Salvar no localStorage com código do extrato
    if (codigoExtrato) {
        const dadosCompletos = {
            codigoExtrato: codigoExtrato,
            cliente: cliente,
            margens: margens,
            contratos: contratos,
            timestamp: new Date().toISOString(),
            linkUnico: gerarLinkUnico()
        };
        localStorage.setItem(`extratoData_${codigoExtrato}`, JSON.stringify(dadosCompletos));
    }
}

function gerarLinkUnico() {
    if (!codigoExtrato) return null;
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?extrato=${codigoExtrato}`;
}

// Função global para carregar simulação por ID
window.carregarSimulacaoPorId = async function(extratoId) {
    console.log(`🔄 Carregando simulação para ID: ${extratoId}`);
    console.log(`🔍 Tipo do ID: ${typeof extratoId}`);
    console.log(`🔍 ID válido: ${extratoId ? 'SIM' : 'NÃO'}`);
    console.log(`⚙️ Config atual:`, configSimulador);
    console.log(`🌐 API URL configurada:`, configSimulador.apiUrl);
    
    try {
        // Buscar dados da API usando configuração de ambiente
        const apiUrl = `${configSimulador.apiUrl}/extrato/${extratoId}/raw`;
        console.log(`📡 Fazendo requisição para: ${apiUrl}`);
        
        const response = await fetch(apiUrl);
        
        console.log(`📡 Resposta recebida:`);
        console.log(`   - Status: ${response.status}`);
        console.log(`   - Status Text: ${response.statusText}`);
        console.log(`   - OK: ${response.ok}`);
        console.log(`   - Headers:`, Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erro na resposta: ${errorText}`);
            throw new Error(`Erro ao carregar dados: ${response.status} - ${errorText}`);
        }
        
        console.log(`📡 Convertendo resposta para JSON...`);
        const dados = await response.json();
        console.log(`✅ Dados carregados com sucesso:`, dados);
        
        console.log(`📊 Analisando dados:`);
        console.log(`   - Cliente:`, dados.cliente);
        console.log(`   - Contratos: ${dados.contratos ? dados.contratos.length : 0} encontrados`);
        console.log(`   - Margens:`, dados.margens);
        
        codigoExtrato = extratoId;
        contratos = dados.contratos || [];
        
        // Definir extratoAtual para uso posterior
        extratoAtual = {
            id: extratoId,
            idoportunidade: dados.idoportunidade || null,
            dados: dados
        };
        
        // Mapear dados do cliente corretamente
        cliente = {
            nome: dados.cliente || '-',
            nb: dados.beneficio?.nb || '-',
            especie: dados.beneficio?.nomeBeneficio || '-',
            origem: dados.origem || '-',
            dataExtrato: dados.data_extrato || '-'
        };
        
        // Mapear margens corretamente
        margens = {
            disponivel: dados.margens?.margem_disponivel_empretimo || '0,00',
            extrapolada: dados.margens?.margem_extrapolada || '0,00',
            rmc: dados.margens?.margem_disponivel_rmc || '0,00',
            rcc: dados.margens?.margem_disponivel_rcc || '0,00'
        };
        
        console.log(`📊 Dados mapeados:`);
        console.log(`   - Cliente:`, cliente);
        console.log(`   - Contratos: ${contratos.length} encontrados`);
        console.log(`   - Margens:`, margens);
        
        console.log(`📊 Processando ${contratos.length} contratos`);
        
        // Processar contratos
        contratos.forEach((contrato, index) => {
            console.log(`📋 Processando contrato ${index + 1}:`, contrato.contrato);
            
            if (!contrato.id) {
                contrato.id = index + 1;
            }
            if (contrato.selecionado === undefined) {
                contrato.selecionado = true;
            }
            contrato.simulacao = contrato.simulacao || null;
            contrato.troco = contrato.troco || 0;
            contrato.aprovado = contrato.aprovado || false;
            contrato.editando = contrato.editando || false;
            
            // Garantir que valores estão preenchidos corretamente
            if (!contrato.valor_parcela) {
                contrato.valor_parcela = parseFloat(contrato.valor_parcela || 0);
            }
                if (!contrato.taxa_juros_mensal) {
                    contrato.taxa_juros_mensal = toNumber(contrato.taxa_juros_mensal || 0);
                }
            });
            
            console.log(`✅ Contratos processados com sucesso!`);
            console.log(`🎨 Iniciando renderização da interface...`);
            
            atualizarDadosCliente();
            console.log(`✅ Dados do cliente atualizados`);
            
            atualizarMargens();
            console.log(`✅ Margens atualizadas`);
            
            renderizarContratos();
            console.log(`✅ Contratos renderizados`);
            
            // Mostrar seções se há dados
            if (contratos.length > 0) {
                console.log(`👁️ Mostrando seções da interface...`);
                document.getElementById('clienteSection').style.display = 'block';
                document.getElementById('margensSection').style.display = 'block';
                document.getElementById('contratosAtivosSection').style.display = 'block';
                document.getElementById('contratosNaoAprovadosSection').style.display = 'block';
                document.getElementById('resumoSection').style.display = 'block';
                console.log(`✅ Seções exibidas`);
            } else {
                console.log(`⚠️ Nenhum contrato encontrado, seções permanecem ocultas`);
            }
            
            // Mostrar link único
            mostrarLinkUnico();
            console.log(`✅ Link único exibido`);
            
            console.log(`🎯 Iniciando simulação automática...`);
            simularTodosContratos();
            console.log(`✅ Simulação automática concluída`);
            
            console.log(`🔄 Re-renderizando contratos após simulação...`);
            renderizarContratos();
            console.log(`✅ Contratos re-renderizados`);
            
            console.log(`📊 Atualizando resumo...`);
            atualizarResumo();
            console.log(`✅ Resumo atualizado`);
            
            console.log(`🎉 Carregamento de simulação concluído com sucesso!`);
            
        } catch (error) {
            console.error(`❌ Erro ao carregar simulação para ID ${extratoId}:`, error);
            console.error(`❌ Stack trace:`, error.stack);
            console.error(`❌ URL tentada:`, `${configSimulador.apiUrl}/extrato/${extratoId}/raw`);
            console.error(`❌ Hostname atual:`, window.location.hostname);
            console.error(`❌ API URL configurada:`, configSimulador.apiUrl);
            
            // Mostrar erro na interface com mais detalhes
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `
                <div style="background: #ffebee; border: 1px solid #f44336; padding: 15px; margin: 10px; border-radius: 5px; font-family: monospace; font-size: 12px;">
                    <h3 style="color: #d32f2f; margin: 0 0 10px 0;">❌ Erro ao carregar dados</h3>
                    <p style="margin: 5px 0; color: #d32f2f;"><strong>ID:</strong> ${extratoId}</p>
                    <p style="margin: 5px 0; color: #d32f2f;"><strong>Hostname:</strong> ${window.location.hostname}</p>
                    <p style="margin: 5px 0; color: #d32f2f;"><strong>API URL:</strong> ${configSimulador.apiUrl}</p>
                    <p style="margin: 5px 0; color: #d32f2f;"><strong>Erro:</strong> ${error.message}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>URL tentada:</strong> ${configSimulador.apiUrl}/extrato/${extratoId}/raw</p>
                </div>
            `;
            document.body.insertBefore(errorDiv, document.body.firstChild);
            
            // Mostrar alerta com informações para debug mobile
            alert(`❌ Erro de conexão:\n\nHostname: ${window.location.hostname}\nAPI: ${configSimulador.apiUrl}\nErro: ${error.message}\n\nVerifique se o servidor está rodando e se você está na mesma rede.`);
        }
}

function mostrarLinkUnico() {
    const linkUnico = gerarLinkUnico();
    if (linkUnico) {
        // Adicionar link único no header
        const header = document.querySelector('.header');
        if (header && !document.getElementById('linkUnico')) {
            const linkDiv = document.createElement('div');
            linkDiv.id = 'linkUnico';
            linkDiv.style.cssText = `
                margin-top: 1rem;
                padding: 0.8rem;
                background: #f0f9ff;
                border-radius: 8px;
                border-left: 4px solid #3b82f6;
            `;
            linkDiv.innerHTML = `
                <div style="font-weight: 600; color: #1e293b; margin-bottom: 0.5rem;">
                    🔗 Link Único da Simulação:
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="text" value="${linkUnico}" readonly 
                           style="flex: 1; padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9rem;">
                    <button class="btn btn-primary" onclick="copiarLinkUnico()" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
                        📋 Copiar
                    </button>
                </div>
            `;
            header.appendChild(linkDiv);
        }
    }
}

function copiarLinkUnico() {
    const linkUnico = gerarLinkUnico();
    if (linkUnico) {
        navigator.clipboard.writeText(linkUnico).then(() => {
            alert('✅ Link copiado para a área de transferência!');
        }).catch(() => {
            // Fallback para navegadores mais antigos
            const input = document.querySelector('#linkUnico input');
            if (input) {
                input.select();
                document.execCommand('copy');
                alert('✅ Link copiado para a área de transferência!');
            }
        });
    }
}

function renderizarContratos() {
    // Separar contratos em ativos e não aprovados
    contratosAtivos = contratos.filter(c => c.aprovado === true);
    contratosNaoAprovados = contratos.filter(c => c.aprovado !== true);

    console.log('📊 Classificação dos contratos:');
    console.log(`   Total: ${contratos.length}`);
    console.log(`   Ativos: ${contratosAtivos.length}`);
    console.log(`   Não Aprovados: ${contratosNaoAprovados.length}`);
    
    // Debug: mostrar status de cada contrato
    contratos.forEach(contrato => {
        console.log(`   Contrato ${contrato.contrato}: aprovado=${contrato.aprovado}, troco=${contrato.troco || 0}`);
    });

    // Atualizar contadores
    document.getElementById('contadorAtivos').textContent = contratosAtivos.length;
    document.getElementById('contadorNaoAprovados').textContent = contratosNaoAprovados.length;

    // Renderizar seções
    renderizarContratosAtivos();
    renderizarContratosNaoAprovados();
    atualizarResumo();
}

function renderizarContratosAtivos() {
    const container = document.getElementById('contratosAtivosList');
    
    if (contratosAtivos.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <div class="no-data-icon">📄</div>
                <h3>Nenhum contrato ativo</h3>
                <p>Contratos aprovados aparecerão aqui</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    contratosAtivos.forEach(contrato => {
        const contratoDiv = document.createElement('div');
        contratoDiv.className = 'contrato-item';
        contratoDiv.innerHTML = `
            <div class="contrato-header">
                <div class="contrato-title">
                    <input type="checkbox" class="contrato-checkbox" ${contrato.selecionado ? 'checked' : ''} 
                           onchange="toggleContrato(${contrato.id})">
                    <span class="contrato-info">Contrato ${contrato.contrato} - ${contrato.banco.nome} (${contrato.banco.codigo}) | R$ ${formatBRNumber(parseFloat(contrato.valor_parcela || 0))} | ${contrato.parcelas_pagas || 0} pagas</span>
                    <button class="expand-btn" onclick="toggleDetalhes(${contrato.id})">
                        <i data-feather="chevron-right" class="feather-icon small"></i>
                    </button>
                </div>
                <div class="contrato-actions">
                    <span class="troco-value">💰 R$ ${formatBRNumber(contrato.troco || 0)}</span>
                </div>
            </div>
            
            <div class="contrato-details" id="detalhes-${contrato.id}">
                <div class="details-grid">
                    <div class="detail-group">
                        <div class="detail-group-title">📋 DADOS BÁSICOS</div>
                        <div class="detail-item">
                            <span class="detail-label">Situação</span>
                            <span class="detail-value">${contrato.situacao || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Data Inclusão</span>
                            <span class="detail-value">${contrato.data_inclusao || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Competência Início</span>
                            <span class="detail-value">${contrato.competencia_inicio_desconto || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Primeiro Desconto</span>
                            <span class="detail-value">${contrato.primeiro_desconto || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status Taxa</span>
                            <span class="detail-value">${contrato.status_taxa || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Banco</span>
                            <span class="detail-value">${contrato.banco.nome} (${contrato.banco.codigo})</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Valor do Contrato</span>
                            <span class="detail-value">R$ ${formatBRNumber(contrato.valor_liberado || 0)}</span>
                        </div>
                    </div>
                    
                    <div class="detail-group">
                        <div class="detail-group-title">
                            💰 DADOS FINANCEIROS (EDITÁVEIS)
                            <button class="btn btn-secondary" onclick="toggleEdicao(${contrato.id})" style="margin-left: 1rem; padding: 0.3rem 0.8rem; font-size: 0.8rem;">
                                ${contrato.editando ? '💾 Salvar' : '✏️ Editar'}
                            </button>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Prazo Total</span>
                            <input type="number" class="detail-input" value="${contrato.prazo_total || 0}" 
                                   ${contrato.editando ? '' : 'disabled'}
                                   onchange="atualizarContrato(${contrato.id}, 'prazo_total', this.value)">
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Parcelas Pagas</span>
                            <input type="number" class="detail-input" value="${contrato.parcelas_pagas || 0}" 
                                   ${contrato.editando ? '' : 'disabled'}
                                   onchange="atualizarContrato(${contrato.id}, 'parcelas_pagas', this.value)">
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Prazo Restante</span>
                            <span class="detail-value">${calcularPrazoRestante(contrato.prazo_total || 0, contrato.parcelas_pagas || 0)} parcelas</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Valor Parcela</span>
                            <input type="text" class="detail-input" value="${formatBRNumber(parseFloat(contrato.valor_parcela || 0))}" 
                                   ${contrato.editando ? '' : 'disabled'}
                                   onchange="atualizarContrato(${contrato.id}, 'valor_parcela', this.value)"
                                   onfocus="this.select()"
                                   oninput="formatarValorReal(this)">
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Saldo Devedor</span>
                            <input type="text" class="detail-input" value="${formatBRNumber(contrato.saldo_devedor || calcularSaldoDevedor(contrato))}" 
                                   ${contrato.editando ? '' : 'disabled'}
                                   onchange="atualizarContrato(${contrato.id}, 'saldo_devedor', this.value)"
                                   onfocus="this.select()"
                                   oninput="formatarValorReal(this)">
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Taxa Mensal (%)</span>
                            <input type="text" class="detail-input" value="${formatTaxa(contrato.taxa_juros_mensal || '')}" 
                                   ${contrato.editando ? '' : 'disabled'}
                                   onchange="atualizarContrato(${contrato.id}, 'taxa_juros_mensal', this.value)"
                                   onfocus="this.select()"
                                   oninput="formatarTaxa(this)"
                                   placeholder="Ex: 1,85">
                        </div>
                    </div>
                </div>
                
                ${contrato.simulacao ? `
                    <div class="simulacao-result simulacao-approved">
                        <div class="simulacao-title">📊 RESULTADO DA SIMULAÇÃO</div>
                        <div class="simulacao-details">
                            <div class="simulacao-item">
                                <span class="simulacao-label">Status</span>
                                <span class="simulacao-value">✅ APROVADO</span>
                            </div>
                            <div class="simulacao-item">
                                <span class="simulacao-label">Banco Simulado</span>
                                <span class="simulacao-value">${contrato.simulacao.banco || '-'}</span>
                            </div>
                            <div class="simulacao-item">
                                <span class="simulacao-label">Parcela</span>
                                <span class="simulacao-value">R$ ${formatBRNumber(contrato.simulacao.parcela || 0)} (${contrato.simulacao.parcelasPagas || 0} pagas)</span>
                            </div>
                            <div class="simulacao-item">
                                <span class="simulacao-label">Troco</span>
                                <span class="simulacao-value">R$ ${formatBRNumber(contrato.simulacao.troco || 0)}</span>
                            </div>
                            <div class="simulacao-item">
                                <span class="simulacao-label">Taxa Simulada</span>
                                <span class="simulacao-value">${formatTaxa(contrato.simulacao.taxa || '1,85')}% <button class="btn-taxa-selector" onclick="mostrarTaxasDisponiveis(${contrato.id})">✏️</button></span>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        container.appendChild(contratoDiv);
    });
}

function renderizarContratosNaoAprovados() {
    const container = document.getElementById('contratosNaoAprovadosList');
    
    if (contratosNaoAprovados.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <div class="no-data-icon">📄</div>
                <h3>Nenhum contrato não aprovado</h3>
                <p>Contratos rejeitados aparecerão aqui</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    contratosNaoAprovados.forEach(contrato => {
        const contratoDiv = document.createElement('div');
        contratoDiv.className = 'contrato-item';
        contratoDiv.innerHTML = `
            <div class="contrato-header">
                <div class="contrato-title">
                    <input type="checkbox" class="contrato-checkbox" ${contrato.selecionado ? 'checked' : ''} 
                           onchange="toggleContrato(${contrato.id})">
                    <span class="contrato-info">Contrato ${contrato.contrato} - ${contrato.banco.nome} (${contrato.banco.codigo}) | R$ ${formatBRNumber(parseFloat(contrato.valor_parcela || 0))} | ${contrato.parcelas_pagas || 0} pagas</span>
                    <button class="expand-btn" onclick="toggleDetalhes(${contrato.id})">
                        <i data-feather="chevron-right" class="feather-icon small"></i>
                    </button>
                </div>
                <div class="contrato-actions">
                    <span class="troco-value ${contrato.troco > 0 ? '' : 'troco-zero'}">💰 R$ ${formatBRNumber(contrato.troco || 0)}</span>
                    <button class="btn btn-primary" onclick="simularContrato(${contrato.id})">
                        🔄 Simular
                    </button>
                </div>
            </div>
            
            <div class="contrato-details" id="detalhes-${contrato.id}">
                <div class="details-grid">
                    <div class="detail-group">
                        <div class="detail-group-title">📋 DADOS BÁSICOS</div>
                        <div class="detail-item">
                            <span class="detail-label">Situação</span>
                            <span class="detail-value">${contrato.situacao || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Data Inclusão</span>
                            <span class="detail-value">${contrato.data_inclusao || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Competência Início</span>
                            <span class="detail-value">${contrato.competencia_inicio_desconto || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Primeiro Desconto</span>
                            <span class="detail-value">${contrato.primeiro_desconto || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status Taxa</span>
                            <span class="detail-value">${contrato.status_taxa || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Banco</span>
                            <span class="detail-value">${contrato.banco.nome} (${contrato.banco.codigo}) - R$ ${formatBRNumber(parseFloat(contrato.valor_parcela || 0))} - ${contrato.prazo_total || 0} parcelas</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Valor do Contrato</span>
                            <span class="detail-value">R$ ${formatBRNumber(contrato.valor_liberado || 0)}</span>
                        </div>
                    </div>
                    
                    <div class="detail-group">
                        <div class="detail-group-title">
                            💰 DADOS FINANCEIROS (EDITÁVEIS)
                            <button class="btn btn-secondary" onclick="toggleEdicao(${contrato.id})" style="margin-left: 1rem; padding: 0.3rem 0.8rem; font-size: 0.8rem;">
                                ${contrato.editando ? '💾 Salvar' : '✏️ Editar'}
                            </button>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Prazo Total</span>
                            <input type="number" class="detail-input" value="${contrato.prazo_total || 0}" 
                                   ${contrato.editando ? '' : 'disabled'}
                                   onchange="atualizarContrato(${contrato.id}, 'prazo_total', this.value)">
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Parcelas Pagas</span>
                            <input type="number" class="detail-input" value="${contrato.parcelas_pagas || 0}" 
                                   ${contrato.editando ? '' : 'disabled'}
                                   onchange="atualizarContrato(${contrato.id}, 'parcelas_pagas', this.value)">
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Prazo Restante</span>
                            <span class="detail-value">${calcularPrazoRestante(contrato.prazo_total || 0, contrato.parcelas_pagas || 0)} parcelas</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Valor Parcela</span>
                            <input type="text" class="detail-input" value="${formatBRNumber(parseFloat(contrato.valor_parcela || 0))}" 
                                   ${contrato.editando ? '' : 'disabled'}
                                   onchange="atualizarContrato(${contrato.id}, 'valor_parcela', this.value)"
                                   onfocus="this.select()"
                                   oninput="formatarValorReal(this)">
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Saldo Devedor</span>
                            <input type="text" class="detail-input" value="${formatBRNumber(contrato.saldo_devedor || calcularSaldoDevedor(contrato))}" 
                                   ${contrato.editando ? '' : 'disabled'}
                                   onchange="atualizarContrato(${contrato.id}, 'saldo_devedor', this.value)"
                                   onfocus="this.select()"
                                   oninput="formatarValorReal(this)">
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Taxa Mensal (%)</span>
                            <input type="text" class="detail-input" value="${formatTaxa(contrato.taxa_juros_mensal || '')}" 
                                   ${contrato.editando ? '' : 'disabled'}
                                   onchange="atualizarContrato(${contrato.id}, 'taxa_juros_mensal', this.value)"
                                   onfocus="this.select()"
                                   oninput="formatarTaxa(this)"
                                   placeholder="Ex: 1,85">
                        </div>
                    </div>
                </div>
                
                ${contrato.simulacao ? `
                    <div class="simulacao-result ${contrato.simulacao.aprovado ? 'simulacao-approved' : 'simulacao-rejected'}">
                        <div class="simulacao-title">📊 RESULTADO DA SIMULAÇÃO</div>
                        <div class="simulacao-details">
                            <div class="simulacao-item">
                                <span class="simulacao-label">Status</span>
                                <span class="simulacao-value">${contrato.simulacao.aprovado ? '✅ APROVADO' : '❌ REJEITADO'}</span>
                            </div>
                        <div class="simulacao-item">
                            <span class="simulacao-label">Banco Simulado</span>
                            <span class="simulacao-value">${contrato.simulacao.banco || '-'}</span>
                        </div>
                        <div class="simulacao-item">
                            <span class="simulacao-label">Parcela</span>
                            <span class="simulacao-value">R$ ${formatBRNumber(contrato.simulacao.parcela || 0)} (${contrato.simulacao.parcelasPagas || 0} pagas)</span>
                        </div>
                        <div class="simulacao-item">
                            <span class="simulacao-label">Troco</span>
                            <span class="simulacao-value">R$ ${formatBRNumber(contrato.simulacao.troco || 0)}</span>
                        </div>
                        <div class="simulacao-item">
                            <span class="simulacao-label">Taxa Simulada</span>
                            <span class="simulacao-value">${formatTaxa(contrato.simulacao.taxa || '1,85')}% <button class="btn-taxa-selector" onclick="mostrarTaxasDisponiveis(${contrato.id})">✏️</button></span>
                        </div>
                        </div>
                        ${!contrato.simulacao.aprovado ? `
                            <div class="motivo-rejeicao">
                                <div class="motivo-title">❌ MOTIVO REJEIÇÃO:</div>
                                <div class="motivo-text">${contrato.simulacao.motivo || 'Motivo não especificado'}</div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
        container.appendChild(contratoDiv);
    });
}

function toggleDetalhes(contratoId) {
    const detalhes = document.getElementById(`detalhes-${contratoId}`);
    const btn = event.target.closest('.expand-btn');
    const icon = btn.querySelector('.feather-icon');
    
    if (detalhes.classList.contains('expanded')) {
        detalhes.classList.remove('expanded');
        btn.classList.remove('expanded');
        icon.setAttribute('data-feather', 'chevron-right');
    } else {
        detalhes.classList.add('expanded');
        btn.classList.add('expanded');
        icon.setAttribute('data-feather', 'chevron-down');
    }
    
    // Atualizar o ícone
    feather.replace();
}

function simularContrato(contratoId) {
    const contrato = contratos.find(c => c.id === contratoId);
    if (!contrato) return;

    console.log('🔄 Iniciando simulação local para contrato:', contrato.contrato);

    // Verificar se há margem extrapolada
    const margemExtrapolada = toNumber(margens.extrapolada);
    const temMargemExtrapolada = margemExtrapolada > 0;
    console.log(`🔍 Margem extrapolada detectada: ${temMargemExtrapolada} (${margemExtrapolada})`);

    // Simular automaticamente taxa e saldo se estiverem em branco
    if (!contrato.taxa_juros_mensal || contrato.taxa_juros_mensal === 0) {
        contrato.taxa_juros_mensal = 1.85; // Taxa padrão
        console.log('📊 Taxa definida automaticamente:', contrato.taxa_juros_mensal);
    }
    if (!contrato.saldo_devedor || contrato.saldo_devedor === 0) {
        contrato.saldo_devedor = calcularSaldoDevedor(contrato);
        console.log('💰 Saldo devedor calculado:', contrato.saldo_devedor);
    }

    // Simular loading - encontrar o botão pelo ID
    const btn = document.querySelector(`button[onclick="simularContrato(${contratoId})"]`);
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="loading"></span> Simulando...';
        btn.disabled = true;

        try {
            // Usar a nova lógica local baseada no calculo (1).js
            const resultado = calcularParaContrato(contrato, "15", temMargemExtrapolada);
            
            console.log('📊 Resultado da simulação local:', resultado);
            
            if (resultado.motivo) {
                // Contrato rejeitado
                contrato.simulacao = {
                    aprovado: false,
                    motivo: resultado.motivo,
                    banco: resultado.banco?.nome || 'Nenhum',
                    troco: 0,
                    taxa: contrato.taxa_juros_mensal
                };
                contrato.troco = 0;
                contrato.aprovado = false;
                
                console.log('❌ Contrato rejeitado:', resultado.motivo);
            } else {
                // Contrato aprovado
                contrato.simulacao = {
                    aprovado: true,
                    banco: resultado.bancoNovo,
                    troco: toNumber(resultado.troco),
                    taxa: toNumber(resultado.taxa_calculada),
                    parcela: toNumber(resultado.parcela),
                    parcelasPagas: resultado.parcelas_pagas,
                    valorEmprestimo: toNumber(resultado.valor_emprestimo),
                    coeficiente: resultado.coeficiente_usado
                };
                contrato.troco = contrato.simulacao.troco;
                contrato.aprovado = true;
                
                console.log('✅ Contrato aprovado:', {
                    banco: resultado.bancoNovo,
                    troco: contrato.simulacao.troco,
                    taxa: contrato.simulacao.taxa
                });
                
                console.log('🔍 Verificação troco:', {
                    'contrato.simulacao.troco': contrato.simulacao.troco,
                    'contrato.troco': contrato.troco,
                    'formatBRNumber(contrato.troco)': formatBRNumber(contrato.troco)
                });
            }
            
            // Salvar dados com código do extrato
            salvarDadosEditados(contratoId);
            
            renderizarContratos();
            
        } catch (error) {
            console.error('❌ Erro na simulação local:', error);
            alert('Erro na simulação: ' + error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } else {
        console.error('❌ Botão não encontrado para contrato:', contratoId);
    }
}

function toggleContrato(contratoId) {
    const contrato = contratos.find(c => c.id === contratoId);
    if (contrato) {
        contrato.selecionado = !contrato.selecionado;
        atualizarResumo();
    }
}

function atualizarContrato(contratoId, campo, valor) {
    const contrato = contratos.find(c => c.id === contratoId);
    if (contrato) {
        // Converter valor brasileiro para número
        let valorNumerico = 0;
        if (valor && valor !== '') {
            valorNumerico = toNumber(valor);
        }
        
        contrato[campo] = valorNumerico;
        
        // Limpar simulação quando dados mudam
        contrato.simulacao = null;
        contrato.troco = 0;
        contrato.aprovado = false;
        
        // Atualizar saldo devedor se necessário
        if (campo === 'valor_parcela' || campo === 'parcelas_pagas') {
            contrato.saldo_devedor = calcularSaldoDevedor(contrato);
        }
    }
}

function atualizarResumo() {
    const contratosAprovados = contratos.filter(c => c.aprovado && c.simulacao && c.simulacao.aprovado);
    let totalTroco = 0;
    const bancosAgrupados = {};

    contratosAprovados.forEach(contrato => {
        if (contrato.simulacao && contrato.simulacao.aprovado) {
            totalTroco += contrato.simulacao.troco || 0;
            const banco = contrato.simulacao.banco || 'Desconhecido';
            if (!bancosAgrupados[banco]) {
                bancosAgrupados[banco] = {
                    parcela: 0,
                    troco: 0
                };
            }
            bancosAgrupados[banco].parcela += contrato.simulacao.parcela || 0;
            bancosAgrupados[banco].troco += contrato.simulacao.troco || 0;
        }
    });

    // Removido totalTroco à esquerda - só fica no resumo à direita
    const bancosHtml = Object.entries(bancosAgrupados)
        .map(([banco, valores]) => `
            <div class="banco-item">
                <div class="banco-info">
                    <i data-feather="building-2" class="banco-icon"></i>
                    <span class="banco-nome">${banco}</span>
                </div>
                <div class="banco-valores">
                    <span class="banco-parcela">R$ ${formatBRNumber(valores.parcela)}</span>
                    <span class="banco-troco">R$ ${formatBRNumber(valores.troco)}</span>
                </div>
            </div>
        `)
        .join('');
    
    // Atualizar ícones após gerar HTML
    setTimeout(() => {
        feather.replace();
    }, 100);
    
    // Atualizar totais
    document.getElementById('totalContratos').textContent = contratosAprovados.length;
    document.getElementById('totalTroco').textContent = formatBRNumber(totalTroco);
    
    // Atualizar lista de bancos
    document.getElementById('bancosResumo').innerHTML = bancosHtml;
}

function exportarResultados() {
    const contratosAprovados = contratos.filter(c => c.aprovado && c.simulacao && c.simulacao.aprovado);
    const dados = contratosAprovados.map(c => ({
        contrato: c.contrato,
        banco_origem: c.banco.nome,
        banco_simulado: c.simulacao.banco,
        parcela: c.simulacao.parcela,
        troco: c.simulacao.troco
    }));
    
    const csv = [
        'Contrato,Banco Origem,Banco Simulado,Parcela,Troco',
        ...dados.map(d => `${d.contrato},${d.banco_origem},${d.banco_simulado},${d.parcela},${d.troco}`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simulacao_inss.csv';
    a.click();
}

function novaSimulacao() {
    contratos.forEach(c => {
        c.simulacao = null;
        c.aprovado = false;
        c.selecionado = true;
    });
    renderizarContratos();
}

function atualizarDadosCliente() {
    console.log('👤 Atualizando dados do cliente...');
    console.log('👤 Dados do cliente:', cliente);
    
    const nomeElement = document.getElementById('clienteNome');
    const nbElement = document.getElementById('clienteNB');
    const especieElement = document.getElementById('clienteEspecie');
    const origemElement = document.getElementById('clienteOrigem');
    const dataElement = document.getElementById('clienteData');
    
    console.log('👤 Elementos encontrados:', {
        nome: nomeElement ? 'SIM' : 'NÃO',
        nb: nbElement ? 'SIM' : 'NÃO',
        especie: especieElement ? 'SIM' : 'NÃO',
        origem: origemElement ? 'SIM' : 'NÃO',
        data: dataElement ? 'SIM' : 'NÃO'
    });
    
    if (nomeElement) {
        nomeElement.textContent = cliente.nome || '-';
        console.log('👤 Nome definido:', cliente.nome || '-');
    }
    
    if (nbElement) {
        nbElement.textContent = cliente.nb || '-';
        console.log('👤 NB definido:', cliente.nb || '-');
    }
    
    if (especieElement) {
        especieElement.textContent = formatarEspecie(cliente.especie);
        console.log('👤 Espécie definida:', formatarEspecie(cliente.especie));
    }
    
    if (origemElement) {
        origemElement.textContent = cliente.origem || '-';
        console.log('👤 Origem definida:', cliente.origem || '-');
    }
    
    if (dataElement) {
        dataElement.textContent = cliente.dataExtrato || '-';
        console.log('👤 Data definida:', cliente.dataExtrato || '-');
    }
    
    console.log('✅ Dados do cliente atualizados!');
}

function atualizarMargens() {
    console.log('💰 Atualizando margens...');
    console.log('💰 Dados das margens:', margens);
    
    const margemDisponivel = document.getElementById('margemDisponivel');
    const margemExtrapolada = document.getElementById('margemExtrapolada');
    const margemRMC = document.getElementById('margemRMC');
    const margemRCC = document.getElementById('margemRCC');
    
    if (margemDisponivel) {
        margemDisponivel.textContent = `R$ ${margens.disponivel || '0,00'}`;
        console.log('💰 Margem disponível:', margens.disponivel);
    }
    
    if (margemExtrapolada) {
        margemExtrapolada.textContent = `R$ ${margens.extrapolada || '0,00'}`;
        
        // Aplicar cor vermelha se margem extrapolada tem valor
        const valorExtrapolada = parseFloat((margens.extrapolada || '0').replace(',', '.'));
        if (valorExtrapolada > 0) {
            margemExtrapolada.style.color = '#d32f2f';
            margemExtrapolada.style.fontWeight = 'bold';
            console.log('💰 Margem extrapolada em vermelho (desconto):', margens.extrapolada);
        } else {
            margemExtrapolada.style.color = '';
            margemExtrapolada.style.fontWeight = '';
        }
    }
    
    if (margemRMC) {
        margemRMC.textContent = `R$ ${margens.rmc || '0,00'}`;
        console.log('💰 Margem RMC:', margens.rmc);
    }
    
    if (margemRCC) {
        margemRCC.textContent = `R$ ${margens.rcc || '0,00'}`;
        console.log('💰 Margem RCC:', margens.rcc);
    }
    
    console.log('✅ Margens atualizadas!');
}

async function carregarDados() {
    console.log('🚀 Iniciando carregamento de dados...');
    
    // SEMPRE verificar ID da URL primeiro
    const urlParams = new URLSearchParams(window.location.search);
    const extratoId = urlParams.get('extrato') || urlParams.get('id') || urlParams.get('extratoId');
    
    // Verificar parâmetros de cliente
    const clienteParams = {
        nome: urlParams.get('nome'),
        cpf: urlParams.get('cpf'),
        nb: urlParams.get('nb'),
        telefone: urlParams.get('telefone'),
        email: urlParams.get('email'),
        clientId: urlParams.get('clientId')
    };
    
    console.log('👤 Parâmetros do cliente:', clienteParams);
    
    // Preencher dados do cliente se fornecidos
    if (clienteParams.nome || clienteParams.cpf || clienteParams.nb) {
        console.log('📝 Preenchendo dados do cliente do URL...');
        
        // Preencher objeto cliente global
        if (clienteParams.nome) cliente.nome = clienteParams.nome;
        if (clienteParams.cpf) cliente.cpf = clienteParams.cpf;
        if (clienteParams.nb) cliente.nb = clienteParams.nb;
        if (clienteParams.telefone) cliente.telefone = clienteParams.telefone;
        if (clienteParams.email) cliente.email = clienteParams.email;
        
        console.log('✅ Dados do cliente preenchidos:', cliente);
    }
    
    console.log(`🔍 Parâmetros da URL:`, {
        extrato: urlParams.get('extrato'),
        id: urlParams.get('id'),
        extratoId: urlParams.get('extratoId'),
        extratoIdFinal: extratoId
    });
    
    if (extratoId) {
        console.log(`📋 Carregando simulação específica para ID: ${extratoId}`);
        // Carregar simulação específica via API
        await carregarSimulacaoPorId(extratoId);
        return;
    }
    
    // Verificar se há dados pré-carregados do servidor (fallback)
    if (window.DADOS_PRE_CARREGADOS && window.EXTRATO_ID) {
        console.log('📋 Usando dados pré-carregados do servidor (fallback)');
        console.log('📋 Dados:', window.DADOS_PRE_CARREGADOS);
        
        const dados = window.DADOS_PRE_CARREGADOS;
        codigoExtrato = window.EXTRATO_ID;
        contratos = dados.contratos || [];
        cliente = dados.cliente || {};
        margens = dados.margens || {};
        
        // Definir extratoAtual para uso posterior
        extratoAtual = {
            id: window.EXTRATO_ID,
            idoportunidade: dados.idoportunidade || null,
            dados: dados
        };
        
        console.log(`📊 Processando ${contratos.length} contratos pré-carregados`);
        
        // Processar contratos com validação robusta
        contratos.forEach((contrato, index) => {
            // Validar se contrato é válido
            if (!contrato || typeof contrato !== 'object') {
                console.warn(`⚠️ Contrato inválido no índice ${index}:`, contrato);
                return;
            }
            
            if (!contrato.id) {
                contrato.id = index + 1;
            }
            if (contrato.selecionado === undefined) {
                contrato.selecionado = true;
            }
            contrato.simulacao = contrato.simulacao || null;
            contrato.troco = contrato.troco || 0;
            contrato.aprovado = contrato.aprovado || false;
            contrato.editando = contrato.editando || false;
            
            // Garantir que valores estão preenchidos corretamente (validação robusta)
            if (!contrato.valor_parcela || contrato.valor_parcela === null || contrato.valor_parcela === undefined) {
                contrato.valor_parcela = 0;
            } else {
                const valor = parseFloat(contrato.valor_parcela);
                contrato.valor_parcela = isNaN(valor) ? 0 : valor;
            }
            
            if (!contrato.taxa_juros_mensal || contrato.taxa_juros_mensal === null || contrato.taxa_juros_mensal === undefined) {
                contrato.taxa_juros_mensal = 0;
            } else {
                const taxa = toNumber(contrato.taxa_juros_mensal);
                contrato.taxa_juros_mensal = isNaN(taxa) ? 0 : taxa;
            }
            
            // Validar outros campos importantes
            contrato.contrato = contrato.contrato || `Contrato-${index + 1}`;
            contrato.banco = contrato.banco || { codigo: '000', nome: 'Banco não informado' };
            contrato.situacao = contrato.situacao || 'ATIVO';
        });
        
        // Renderizar interface com tratamento de erro
        try {
        atualizarDadosCliente();
            console.log('✅ Dados do cliente atualizados');
        } catch (error) {
            console.error('❌ Erro ao atualizar dados do cliente:', error);
        }
        
        try {
            atualizarMargens();
            console.log('✅ Margens atualizadas');
        } catch (error) {
            console.error('❌ Erro ao atualizar margens:', error);
        }
        
        try {
            renderizarContratos();
            console.log('✅ Contratos renderizados');
        } catch (error) {
            console.error('❌ Erro ao renderizar contratos:', error);
        }
        
        try {
            simularTodosContratos();
            console.log('✅ Simulações executadas');
        } catch (error) {
            console.error('❌ Erro ao simular contratos:', error);
        }
        
        try {
            atualizarResumo();
            console.log('✅ Resumo atualizado');
        } catch (error) {
            console.error('❌ Erro ao atualizar resumo:', error);
        }
        
        console.log('✅ Dados pré-carregados processados com sucesso!');
        return;
    }
    
    // NÃO carregar dados de teste ou localStorage automaticamente
    // Apenas se não houver extratoId na URL
    console.log('⚠️ Nenhum dado encontrado para carregar');
}

function carregarDadosTeste() {
    const dadosTeste = {
        "cliente": {
            "nome": "ISABEL DE FATIMA DE FARIAS",
            "nb": "6043215431",
            "especie": "APOSENTADORIA POR INVALIDEZ PREVIDENCIARIA",
            "origem": "INSS",
            "dataExtrato": "17/07/2025"
        },
        "margens": {
            "disponivel": 0,
            "extrapolada": 0,
            "rmc": 0,
            "rcc": 0
        },
        "contratos": [
            {
                "contrato": "2666838921",
                "banco": {
                    "codigo": "341",
                    "nome": "Itaú"
                },
                "situacao": "ATIVO",
                "data_inclusao": "09/04/2025",
                "competencia_inicio_desconto": "05/2025",
                "qtde_parcelas": 96,
                "valor_parcela": "12,14",
                "valor_liberado": "528,71",
                "iof": "13,67",
                "cet_mensal": "192,00",
                "cet_anual": "2.570,00",
                "taxa_juros_mensal": "1,85",
                "taxa_juros_anual": "24,60",
                "valor_pago": "120,94",
                "primeiro_desconto": "07/06/2025",
                "status_taxa": "INFORMADA_EXTRATO",
                "prazo_total": 96,
                "parcelas_pagas": 2,
                "prazo_restante": 94
            },
            {
                "contrato": "0144406604IDF",
                "banco": {
                    "codigo": "329",
                    "nome": "QI Sociedade de Crédito"
                },
                "situacao": "ATIVO",
                "data_inclusao": "17/03/2025",
                "competencia_inicio_desconto": "04/2025",
                "qtde_parcelas": 96,
                "valor_parcela": "27,98",
                "valor_liberado": "1.249,28",
                "iof": "41,92",
                "cet_mensal": "260,00",
                "cet_anual": "3.602,00",
                "taxa_juros_mensal": "1,79",
                "taxa_juros_anual": "23,73",
                "valor_pago": "957,50",
                "primeiro_desconto": "19/05/2025",
                "status_taxa": "INFORMADA_EXTRATO",
                "prazo_total": 96,
                "parcelas_pagas": 3,
                "prazo_restante": 93
            },
            {
                "contrato": "90138107120",
                "banco": {
                    "codigo": "626",
                    "nome": "C6"
                },
                "situacao": "ATIVO",
                "data_inclusao": "14/10/2024",
                "competencia_inicio_desconto": "11/2024",
                "qtde_parcelas": 84,
                "valor_parcela": "48,29",
                "valor_liberado": "2.179,48",
                "iof": "12,37",
                "cet_mensal": "162,00",
                "cet_anual": "2.153,00",
                "taxa_juros_mensal": "1,60",
                "taxa_juros_anual": "20,98",
                "valor_pago": "1.777,73",
                "primeiro_desconto": "07/12/2024",
                "status_taxa": "INFORMADA_EXTRATO",
                "prazo_total": 84,
                "parcelas_pagas": 8,
                "prazo_restante": 76
            },
            {
                "contrato": "90135819879",
                "banco": {
                    "codigo": "626",
                    "nome": "C6"
                },
                "situacao": "ATIVO",
                "data_inclusao": "15/07/2024",
                "competencia_inicio_desconto": "08/2024",
                "qtde_parcelas": 84,
                "valor_parcela": "23,20",
                "valor_liberado": "1.022,93",
                "iof": "31,43",
                "cet_mensal": "176,00",
                "cet_anual": "2.368,00",
                "taxa_juros_mensal": "1,66",
                "taxa_juros_anual": "21,84",
                "valor_pago": "991,50",
                "primeiro_desconto": "07/09/2024",
                "status_taxa": "INFORMADA_EXTRATO",
                "prazo_total": 84,
                "parcelas_pagas": 11,
                "prazo_restante": 73
            },
            {
                "contrato": "140184493",
                "banco": {
                    "codigo": "001",
                    "nome": "Banco do Brasil"
                },
                "situacao": "ATIVO",
                "data_inclusao": "26/09/2023",
                "competencia_inicio_desconto": "10/2023",
                "qtde_parcelas": 77,
                "valor_parcela": "29,94",
                "valor_liberado": "1.219,85",
                "iof": "0,00",
                "cet_mensal": "184,00",
                "cet_anual": "2.444,00",
                "taxa_juros_mensal": "1,84",
                "taxa_juros_anual": "24,46",
                "valor_pago": "1.219,85",
                "primeiro_desconto": "05/11/2023",
                "status_taxa": "INFORMADA_EXTRATO",
                "prazo_total": 77,
                "parcelas_pagas": 21,
                "prazo_restante": 56
            },
            {
                "contrato": "0063476189",
                "banco": {
                    "codigo": "935",
                    "nome": "Facta"
                },
                "situacao": "ATIVO",
                "data_inclusao": "29/08/2023",
                "competencia_inicio_desconto": "09/2023",
                "qtde_parcelas": 84,
                "valor_parcela": "470,64",
                "valor_liberado": "20.413,71",
                "iof": "692,27",
                "cet_mensal": "2.045,00",
                "cet_anual": "1.886,00",
                "taxa_juros_mensal": "1,78",
                "taxa_juros_anual": "23,63",
                "valor_pago": "0,00",
                "primeiro_desconto": null,
                "status_taxa": "RECALCULADA",
                "prazo_total": 84,
                "parcelas_pagas": 22,
                "prazo_restante": 62
            }
        ]
    };

    // Carregar dados de teste
    contratos = dadosTeste.contratos || [];
    cliente = dadosTeste.cliente || {};
    margens = dadosTeste.margens || {};
    
    // Gerar código único do extrato
    codigoExtrato = `extrato_teste_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Definir extratoAtual para uso posterior
    extratoAtual = {
        id: codigoExtrato,
        idoportunidade: null,
        dados: dadosTeste
    };
    
    // Adicionar IDs únicos aos contratos
    contratos.forEach((contrato, index) => {
        contrato.id = index + 1;
        contrato.selecionado = true;
        contrato.simulacao = null;
        contrato.troco = 0;
        contrato.aprovado = false;
        contrato.editando = false;
        
        // Converter valores para números e processar dados
        contrato.valor_parcela = parseFloat(contrato.valor_parcela || 0);
        contrato.taxa_juros_mensal = toNumber(contrato.taxa_juros_mensal || 0);
        contrato.valor_liberado = parseFloat(contrato.valor_liberado || 0);
        contrato.valor_pago = parseFloat(contrato.valor_pago || 0);
        
        // Remover campos desnecessários
        delete contrato.iof;
        delete contrato.cet_anual;
        
        // Garantir que taxa está correta
        if (!contrato.taxa_juros_mensal || contrato.taxa_juros_mensal === 0) {
            contrato.taxa_juros_mensal = 1.85; // Taxa padrão
        }
    });
    
    // Salvar no localStorage
    localStorage.setItem('extratoData', JSON.stringify(dadosTeste));
    
    // Atualizar interface
    atualizarDadosCliente();
    atualizarMargens();
    
    // Simular todos os contratos automaticamente
    simularTodosContratos();
    
    // Mostrar seções
    document.getElementById('clienteSection').style.display = 'block';
    document.getElementById('margensSection').style.display = 'block';
    document.getElementById('contratosAtivosSection').style.display = 'block';
    document.getElementById('contratosNaoAprovadosSection').style.display = 'block';
    document.getElementById('resumoSection').style.display = 'block';
    
    // Mostrar link único
    mostrarLinkUnico();
    
    alert('✅ Dados de teste carregados com sucesso!');
}

function limparDados() {
    if (confirm('Tem certeza que deseja limpar todos os dados?')) {
        // Limpar dados do localStorage
        localStorage.removeItem('extratoData');
        
        // Resetar variáveis globais
        contratos = [];
        contratosAtivos = [];
        contratosNaoAprovados = [];
        cliente = {};
        margens = {};
        
        // Ocultar todas as seções
        document.getElementById('clienteSection').style.display = 'none';
        document.getElementById('margensSection').style.display = 'none';
        document.getElementById('contratosAtivosSection').style.display = 'none';
        document.getElementById('contratosNaoAprovadosSection').style.display = 'none';
        document.getElementById('resumoSection').style.display = 'none';
        
        // Limpar renderização
        renderizarContratos();
        
        // Limpar URL (remover parâmetros)
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        alert('🗑️ Dados limpos com sucesso!');
    }
}

// Função para mostrar taxas disponíveis
function mostrarTaxasDisponiveis(contratoId) {
    const contrato = contratos.find(c => c.id === contratoId);
    if (!contrato) return;
    
    // Buscar taxas do banco no roteiro
    const bancoNome = contrato.simulacao?.banco || 'FINANTO';
    const taxasDisponiveis = obterTaxasDoBanco(bancoNome);
    
    if (taxasDisponiveis.length === 0) {
        alert('Nenhuma taxa disponível para este banco');
        return;
    }
    
    // Criar lista de taxas
    const listaTaxas = document.createElement('div');
    listaTaxas.className = 'taxas-disponiveis';
    listaTaxas.innerHTML = `
        <div class="taxas-title">🎯 TAXAS DISPONÍVEIS PARA ${bancoNome.toUpperCase()}:</div>
        ${taxasDisponiveis.map(taxa => `
            <button class="taxa-option" onclick="selecionarTaxa(${contratoId}, ${taxa})">
                [${formatTaxa(taxa)}%] - Troco: R$ ${calcularTrocoParaTaxa(contrato, taxa)}
            </button>
        `).join('')}
    `;
    
    // Inserir após o resultado da simulação
    const simulacaoResult = document.querySelector(`#detalhes-${contratoId} .simulacao-result`);
    if (simulacaoResult) {
        simulacaoResult.appendChild(listaTaxas);
    }
}

// Configurações do simulador
const TROCO_MINIMO = 100;
const ORDEM_BANCOS = ["FINANTO", "C6", "PICPAY", "BRB", "DAYCOVAL", "INBURSA", "FINTECH", "DIGIO", "FACTA"];
const PRAZO_SIMULADO = 96;

// Roteiro de Bancos (baseado no RoteiroBancos.js)
const RoteiroBancos = {
  BRB: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "001", nome: "Banco do Brasil", regra: "1 paga" },
      { codigo: "104", nome: "Caixa Econômica Federal", regra: "1 paga" },
      { codigo: "033", nome: "Santander", detalhe: "Contratos iniciados com 20, 30, 40", regra: "1 paga" },
      { codigo: "905", nome: "Banco Alfa", regra: "1 paga" },
      { codigo: "754", nome: "Sicoob", regra: "1 paga" },
      { codigo: "341", nome: "Itaú", regra: "1 paga" },
      { codigo: "237", nome: "Bradesco", regra: "1 paga" },
      { codigo: "260", nome: "Nu CFI", regra: "1 paga" },
      { codigo: "000", nome: "Demais bancos", regra: "12 pagas" }
    ],
    naoPorta: [
      { codigo: "079", nome: "Picpay" },
      { codigo: "121", nome: "Agibank" },
      { codigo: "626", nome: "C6 / C6 Consignado" },
      { codigo: "925", nome: "BRB" }
    ],
    idade: "21 a 73 anos",
    especiesAceitas: { todas: true },
    taxas: [1.85, 1.79],
    saldoDevedorMinimo: 4000,
    parcelaMinima: 0
  },
  DAYCOVAL: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "935", nome: "Facta", regra: "24 pagas" },
      { codigo: "121", nome: "Agibank", regra: "15 pagas" },
      { codigo: "012", nome: "Banco Inbursa", regra: "13 pagas" },
      { codigo: "623", nome: "Banco PAN", regra: "12 pagas" },
      { codigo: "389", nome: "MERCANTIL", regra: "6 pagas" },
      { codigo: "754", nome: "SICOOB", regra: "6 pagas" },
      { codigo: "000", nome: "Demais bancos", regra: "12 pagas" }
    ],
    naoPorta: [
      { codigo: "626", nome: "C6 / C6 Consignado" },
      { codigo: "422", nome: "Safra" },
      { codigo: "004", nome: "BNB - Banco do Nordeste" },
      { codigo: "905", nome: "Banco Alfa" },
      { codigo: "707", nome: "Daycoval" }
    ],
    idade: "21 a 72 anos",
    especiesAceitas: { todas: true, exceto: ["87", "88"] },
    taxas: [1.85, 1.79, 1.66],
    saldoDevedorMinimo: 500,
    parcelaMinima: 20
  },
  INBURSA: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "623", nome: "Banco PAN", regra: "12 paga" },
      { codigo: "925", nome: "Banco BRB", regra: "5 paga" },
      { codigo: "001", nome: "Banco do Brasil", regra: "1 paga" },
      { codigo: "104", nome: "Caixa Econômica Federal", regra: "1 paga" },
      { codigo: "754", nome: "Sicoob", regra: "1 paga" },
      { codigo: "341", nome: "Itaú", regra: "1 paga" },
      { codigo: "237", nome: "Bradesco", regra: "1 paga" },
      { codigo: "260", nome: "Nu CFI", regra: "1 paga" },
      { codigo: "000", nome: "Demais bancos", regra: "12 pagas" }
    ],
    naoPorta: [
      { codigo: "626", nome: "C6 / C6 Consignado" },
      { codigo: "149", nome: "FACTA" },
      { codigo: "012", nome: "INBURSA" },
      { codigo: "422", nome: "SAFRA" },
      { codigo: "079", nome: "PICPAY" },
      { codigo: "935", nome: "Facta" },
      { codigo: "329", nome: "QI" },
      { codigo: "752", nome: "BNP Paribas" },
      { codigo: "025", nome: "Banco Alfa" }
    ],
    idade: "21 a 69 anos",
    especiesAceitas: { todas: true, exceto: ["87", "88"] },
    taxas: [1.66],
    saldoDevedorMinimo: 2500,
    parcelaMinima: 0
  },
  FINTECH: {
    regraGeral: "2 parcelas pagas",
    excecoes: [
      { codigo: "623", nome: "Banco PAN", regra: "13 paga" },
      { codigo: "000", nome: "Demais bancos", regra: "2 pagas" }
    ],
    naoPorta: [
      { codigo: "643", nome: "Banco Pine" },
      { codigo: "626", nome: "C6 / C6 Consignado" },
      { codigo: "149", nome: "FACTA" },
      { codigo: "012", nome: "INBURSA" },
      { codigo: "925", nome: "BRB" },
      { codigo: "254", nome: "Paraná Banco" },
      { codigo: "935", nome: "Facta" }
    ],
    idade: "21 a 69",
    especiesAceitas: { todas: true, exceto: ["87", "88"] },
    taxas: [1.85, 1.79, 1.66],
    saldoDevedorMinimo: 4000,
    parcelaMinima: 0
  },
  DIGIO: {
    regraGeral: "12 parcelas pagas",
    excecoes: [
      { codigo: "001", nome: "Banco do Brasil", regra: "1 paga" },
      { codigo: "104", nome: "Caixa Econômica Federal", regra: "1 paga" },
      { codigo: "033", nome: "Santander", detalhe: "Contratos iniciados com 20, 30, 40", regra: "1 paga" },
      { codigo: "905", nome: "Banco Alfa", regra: "1 paga" },
      { codigo: "754", nome: "Sicoob", regra: "1 paga" },
      { codigo: "341", nome: "Itaú", regra: "1 paga" },
      { codigo: "260", nome: "Nu CFI", regra: "1 paga" },
      { codigo: "000", nome: "Demais bancos", regra: "12 pagas" }
    ],
    naoPorta: [
      { codigo: "001", nome: "Banco do Brasil" },
      { codigo: "041", nome: "Banrisul" },
      { codigo: "237", nome: "Bradesco" },
      { codigo: "623", nome: "Banco PAN" }
    ],
    idade: "21 a 66 anos (prazo 96x) / 67 a 72 anos (prazo 96x)",
    especiesAceitas: { todas: true, exceto: ["87", "88"] },
    taxas: [1.85, 1.79, 1.66],
    saldoDevedorMinimo: 4000,
    parcelaMinima: 0
  },
  FACTA: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "707", nome: "Daycoval", regra: "24 paga" },
      { codigo: "623", nome: "PAN", regra: "16 paga" },
      { codigo: "121", nome: "AGIBANK", regra: "15 paga" },
      { codigo: "254", nome: "Banco PARANA", regra: "15 paga" },
      { codigo: "318", nome: "BMG", regra: "12 paga" },
      { codigo: "033", nome: "OLE", regra: "12 paga" },
      { codigo: "000", nome: "Demais bancos", regra: "3 pagas" }
    ],
    naoPorta: [
      { codigo: "012", nome: "INBURSA" },
      { codigo: "643", nome: "PINE" },
      { codigo: "935", nome: "FACTA" },
      { codigo: "329", nome: "QI" },
      { codigo: "626", nome: "C6" }
    ],
    idade: "21 a 73 anos",
    especiesAceitas: { todas: true },
    taxas: [1.85],
    saldoDevedorMinimo: 0,
    parcelaMinima: 50
  },
  FINANTO: {
    regraGeral: "3 parcelas pagas",
    excecoes: [
      { codigo: "623", nome: "Banco PAN", regra: "12 pagas" },
      { codigo: "033", nome: "Santander", regra: "12 pagas" },
      { codigo: "254", nome: "Paraná Banco", regra: "12 pagas" },
      { codigo: "041", nome: "Banrisul", regra: "12 pagas" },
      { codigo: "326", nome: "Parati – Crédito", regra: "12 pagas" },
      { codigo: "389", nome: "Banco Mercantil do Brasil", regra: "12 pagas" },
      { codigo: "121", nome: "Agibank", regra: "12 pagas" },
      { codigo: "707", nome: "Daycoval", regra: "13 pagas" },
      { codigo: "000", nome: "Demais bancos", regra: "3 pagas" }
    ],
    naoPorta: [
      { codigo: "012", nome: "Banco Inbursa" },
      { codigo: "329", nome: "QI Sociedade de Crédito" },
      { codigo: "422", nome: "Safra" },
      { codigo: "752", nome: "BNP Paribas" },
      { codigo: "643", nome: "Banco Pine" },
      { codigo: "079", nome: "Picpay" },
      { codigo: "025", nome: "Banco Alfa" },
      { codigo: "935", nome: "Facta" },
      { codigo: "626", nome: "C6 / C6 Consignado" }
    ],
    idade: "21 a 69 anos",
    especiesAceitas: {
      todas: true,
      exceto: ["87"],
      regrasEspeciais: [
        { especies: ["32"], idadeMinima: 60 }
      ]
    },
    taxas: [1.85, 1.79],
    saldoDevedorMinimo: 8000,
    parcelaMinima: 0
  },
  C6: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "935", nome: "Facta", regra: "13 pagas" },
      { codigo: "149", nome: "Facta", regra: "13 pagas" },  
      { codigo: "329", nome: "QI Sociedade de Crédito", regra: "13 pagas" },
      { codigo: "012", nome: "Banco Inbursa", regra: "19 pagas" },
      { codigo: "623", nome: "Banco PAN", regra: "37 pagas" },
      { codigo: "000", nome: "Demais bancos", regra: "2 pagas" }
    ],
    naoPorta: [
      { codigo: "626", nome: "C6 / C6 Consignado" },
      { codigo: "079", nome: "Picpay" },
      { codigo: "707", nome: "Daycoval" },
      { codigo: "121", nome: "Agibank" }
    ],
    idade: "21 a 72 anos",
    especiesAceitas: { todas: true},
    taxas: [1.85, 1.79, 1.66],
    saldoDevedorMinimo: 2000,
    parcelaMinima: 0
  },
  PICPAY: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "001", nome: "Banco do Brasil", regra: "1 paga" },
      { codigo: "104", nome: "Caixa Econômica Federal", regra: "1 paga" },
      { codigo: "033", nome: "Santander", detalhe: "Contratos iniciados com 20, 30, 40", regra: "1 paga" },
      { codigo: "905", nome: "Banco Alfa", regra: "1 paga" },
      { codigo: "754", nome: "Sicoob", regra: "1 paga" },
      { codigo: "341", nome: "Itaú", regra: "1 paga" },
      { codigo: "237", nome: "Bradesco", regra: "1 paga" },
      { codigo: "260", nome: "Nu CFI", regra: "1 paga" },
      { codigo: "000", nome: "Demais bancos", regra: "12 pagas" }
    ],
    naoPorta: [
      { codigo: "012", nome: "INBURSA" },
      { codigo: "121", nome: "AGIBANK" },
      { codigo: "925", nome: "BRB" }
    ],
    idade: "21 a 73 anos",
    especiesAceitas: { todas: true },
    taxas: [1.85],
    saldoDevedorMinimo: 0,
    parcelaMinima: 50
  }
};

// Coeficientes corretos baseados no calculo.js
const coeficientes = {
    "1.66": {
        "01": 0.021490, "02": 0.021486, "03": 0.021482, "04": 0.021478, "05": 0.021474,
        "06": 0.021470, "07": 0.021466, "08": 0.021462, "09": 0.021458, "10": 0.021454,
        "11": 0.021450, "12": 0.021446, "13": 0.021442, "14": 0.021438, "15": 0.021434,
        "16": 0.021430, "17": 0.021426, "18": 0.021422, "19": 0.021418, "20": 0.021414,
        "21": 0.021410, "22": 0.021406, "23": 0.021402, "24": 0.021398, "25": 0.021394,
        "26": 0.021390, "27": 0.021386, "28": 0.021382, "29": 0.021378, "30": 0.021374
    },
    "1.79": {
        "01": 0.022543, "02": 0.022540, "03": 0.022536, "04": 0.022532, "05": 0.022528,
        "06": 0.022524, "07": 0.022520, "08": 0.022516, "09": 0.022512, "10": 0.022508,
        "11": 0.022504, "12": 0.022500, "13": 0.022496, "14": 0.022492, "15": 0.022488,
        "16": 0.022484, "17": 0.022480, "18": 0.022476, "19": 0.022472, "20": 0.022468,
        "21": 0.022464, "22": 0.022460, "23": 0.022456, "24": 0.022452, "25": 0.022448,
        "26": 0.022444, "27": 0.022440, "28": 0.022436, "29": 0.022432, "30": 0.022428
    },
    "1.85": {
        "01": 0.023038, "02": 0.023033, "03": 0.023028, "04": 0.023024, "05": 0.023019,
        "06": 0.023014, "07": 0.023010, "08": 0.023005, "09": 0.023001, "10": 0.022996,
        "11": 0.022992, "12": 0.022987, "13": 0.022983, "14": 0.022979, "15": 0.022974,
        "16": 0.022970, "17": 0.022966, "18": 0.022961, "19": 0.022957, "20": 0.022953,
        "21": 0.022949, "22": 0.022944, "23": 0.022940, "24": 0.022936, "25": 0.022932,
        "26": 0.022928, "27": 0.022924, "28": 0.022920, "29": 0.022916, "30": 0.022912
    }
};

// Função para converter valores (baseada no calculo (1).js)
function toNumber(v) {
    if (v == null) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    let s = v.toString().replace(/[R$\s%]/g, "").trim();
    if (s === "") return 0;
    const hasDot = s.includes(".");
    const hasComma = s.includes(",");
    if (hasDot && hasComma) {
        if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
        else s = s.replace(/,/g, "");
    } else if (hasComma) s = s.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
}

// Função para mapear espécie usando beneficios.js
function mapBeneficio(raw) {
    if (!raw) return { codigo: null, nome: null };

    const rawStr = String(raw).trim();

    // 1) Se veio código, mapeia direto
    const m = rawStr.match(/\d{1,3}/);
    if (m) {
        const codigo = m[0].padStart(2, "0");
        const nome = BENEFICIOS[codigo] || null;
        if (nome) return { codigo, nome };
    }

    // 2) Tenta por nome/sinônimo
    const norm = normalize(rawStr);

    // 2.1) tenta grupos padrão
    for (const g of DEFAULT_BY_GROUP) {
        if (norm.includes(g.key)) {
            const nome = BENEFICIOS[g.codigo] || null;
            return { codigo: g.codigo, nome };
        }
    }

    // 2.2) aproximação simples: acha o primeiro cujo nome "esteja contido" no texto
    for (const [codigo, nome] of Object.entries(BENEFICIOS)) {
        if (norm.includes(normalize(nome))) {
            return { codigo, nome };
        }
    }

    // 2.3) falhou → nulls
    return { codigo: null, nome: null };
}

// Função para normalizar texto
function normalize(s) {
    if (!s) return "";
    return s
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^a-z0-9\s%\-\.]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Função para formatar espécie com código
function formatarEspecie(especie) {
    const mapeado = mapBeneficio(especie);
    if (mapeado.codigo && mapeado.nome) {
        return `${mapeado.codigo} - ${mapeado.nome}`;
    }
    return especie || "Não informado";
}

// Função para obter coeficiente baseado na taxa e dia
function getCoeficiente(taxa, dia = "15") {
    const tabela = coeficientes[Number(taxa).toFixed(2)];
    if (!tabela) return null;

    return tabela[dia] || tabela["01"] || tabela["1"] || null;
}

// Função para bancos permitidos por espécie
function bancosPermitidosPorEspecie(especie) {
    if (especie === "87") return ["BRB", "PICPAY", "C6", "FACTA"];
    if (especie === "88") return ["FINANTO", "BRB", "PICPAY", "C6", "FACTA"];
    return ORDEM_BANCOS;
}

// Função para validar espécie para roteiro
function validarEspecieParaRoteiro(especie, roteiro) {
    if (!roteiro || !roteiro.especiesAceitas) return true;

    const ea = roteiro.especiesAceitas;
    if (ea.todas === true) {
        if (Array.isArray(ea.exceto) && ea.exceto.includes(String(especie))) {
            return false;
        }
        return true;
    }

    if (ea.todas === false) {
        if (Array.isArray(ea.permitidas)) {
            return ea.permitidas.includes(String(especie));
        }
        return false;
    }

    return true;
}

// Função para aplicar roteiro (baseada no calculo (1).js)
function aplicarRoteiro(c, banco) {
    const roteiro = RoteiroBancos[banco];
    if (!roteiro) return { valido: false, motivo: "Banco não encontrado" };

    console.log(`🔍 Aplicando roteiro ${banco} para contrato ${c.contrato}:`);
    console.log(`   Banco contrato: ${c.banco?.nome} (${c.banco?.codigo})`);
    console.log(`   Parcelas pagas: ${c.parcelas_pagas}`);
    console.log(`   Saldo devedor: ${c.saldo_devedor}`);

    const saldo = toNumber(c.saldo_devedor);
    if (typeof roteiro.saldoDevedorMinimo === "number" && saldo < roteiro.saldoDevedorMinimo) {
        console.log(`❌ Saldo insuficiente: ${saldo} < ${roteiro.saldoDevedorMinimo}`);
        return { valido: false, motivo: `Saldo mínimo (${roteiro.saldoDevedorMinimo}) - ${banco}` };
    }

    // Validar parcela mínima
    const parcela = toNumber(c.valor_parcela || 0);
    if (typeof roteiro.parcelaMinima === "number" && parcela < roteiro.parcelaMinima) {
        console.log(`❌ Parcela insuficiente: ${parcela} < ${roteiro.parcelaMinima}`);
        return { valido: false, motivo: `Parcela mínima (${roteiro.parcelaMinima}) - ${banco}` };
    }

    if (!validarEspecieParaRoteiro(c.especie, roteiro)) {
        console.log(`❌ Espécie não permitida: ${c.especie}`);
        return { valido: false, motivo: `Banco ${banco} não permitido esp ${c.especie}` };
    }

    const parcelasPagas = Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0;
    let regraParcelas = null;

    if (Array.isArray(roteiro.excecoes)) {
        const excecao = roteiro.excecoes.find((e) => String(e.codigo) === String(c.banco?.codigo));
        if (excecao && typeof excecao.regra === "string") {
            regraParcelas = Number(excecao.regra.split(" ")[0]);
            console.log(`📋 Exceção específica encontrada: ${excecao.nome} = ${regraParcelas} pagas`);
        }
    }

    if (regraParcelas === null && Array.isArray(roteiro.excecoes)) {
        const demais = roteiro.excecoes.find((e) => e.nome.toLowerCase().includes("demais bancos"));
        if (demais && demais.regra) {
            regraParcelas = Number(demais.regra.split(" ")[0]);
            console.log(`📋 Regra demais bancos: ${regraParcelas} pagas`);
        }
    }

    if (regraParcelas === null) {
        regraParcelas = Number(roteiro.regraGeral?.split(" ")[0] || 0);
        console.log(`📋 Regra geral: ${regraParcelas} pagas`);
    }

    console.log(`📊 Comparação: ${parcelasPagas} pagas >= ${regraParcelas} pagas`);

    if (parcelasPagas < regraParcelas) {
        console.log(`❌ Parcelas insuficientes: ${parcelasPagas} < ${regraParcelas}`);
        return {
            valido: false,
            motivo: `Parcelas abaixo do mínimo (${regraParcelas}) - banco: ${c.banco?.nome || "N/A"} (código ${c.banco?.codigo || "N/A"})`,
        };
    }

    if (Array.isArray(roteiro.naoPorta) && roteiro.naoPorta.some((b) => String(b.codigo) === String(c.banco?.codigo))) {
        console.log(`❌ Banco não permitido: ${c.banco?.nome} (${c.banco?.codigo})`);
        return { valido: false, motivo: `Banco não permitido (${c.banco?.nome || "N/A"})` };
    }

    console.log(`✅ ${banco} APROVADO!`);
    return { valido: true, motivo: null };
}

// Função para calcular contrato (baseada no calculo (1).js)
function calcularParaContrato(contrato, diaAverbacao = "15", temMargemExtrapolada = false) {
    if (!contrato || (contrato.situacao && contrato.situacao.toLowerCase() !== "ativo")) {
        return { contrato: contrato?.contrato, motivo: "Contrato não ativo", banco: contrato?.banco };
    }

    // Adicionar espécie se não existir
    if (!contrato.especie) {
        contrato.especie = cliente.especie || "32"; // Espécie padrão
    }

    const parcelaOriginal = toNumber(contrato.valor_parcela || 0);
    const parcelaAjustada = toNumber(contrato.valor_parcela || 0);
    const totalParcelas = Number.isFinite(+contrato.prazo_total) ? +contrato.prazo_total : 0;
    const prazoRestante = Number.isFinite(+contrato.prazo_restante) ? +contrato.prazo_restante : totalParcelas;

    // Reforço da validação: bloqueia definitivamente contratos com parcela original < 25 (exceto espécie 32)
    if (parcelaOriginal < 25 && contrato.especie !== "32") {
        return {
            contrato: contrato.contrato,
            motivo: `Parcela (${formatBRNumber(parcelaOriginal)}) abaixo da mínima (25,00)`,
            parcela: formatBRNumber(parcelaOriginal),
            saldo_devedor: formatBRNumber(parseFloat(contrato.saldo_devedor || 0)),
            prazo_total: totalParcelas,
            parcelas_pagas: Number.isFinite(+contrato.parcelas_pagas) ? +contrato.parcelas_pagas : 0,
            banco: contrato.banco,
        };
    }

    const saldoDevedor = calcularSaldoDevedor(contrato); // Sempre usar cálculo correto
    let taxaAtualMes = toNumber(contrato.taxa_juros_mensal || 0);
    
    console.log(`🔍 DEBUG calcularParaContrato - Contrato ${contrato.contrato}:`);
    console.log(`   Taxa Original: "${contrato.taxa_juros_mensal}"`);
    console.log(`   Taxa Convertida: ${taxaAtualMes}`);
    console.log(`   Tipo da Taxa: ${typeof contrato.taxa_juros_mensal}`);
    console.log(`   Taxa > 0: ${taxaAtualMes > 0}`);

    console.log(`💰 Cálculo do saldo devedor para contrato ${contrato.contrato}:`);
    console.log(`   Parcela: ${contrato.valor_parcela}`);
    console.log(`   Taxa: ${contrato.taxa_juros_mensal}%`);
    console.log(`   Prazo Total: ${contrato.prazo_total}`);
    console.log(`   Parcelas Pagas: ${contrato.parcelas_pagas}`);
    console.log(`   Prazo Restante: ${calcularPrazoRestante(contrato.prazo_total || 0, contrato.parcelas_pagas || 0)}`);
    console.log(`   Saldo Devedor Original: R$ ${formatBRNumber(contrato.saldo_devedor || 0)}`);
    console.log(`   Saldo Devedor Calculado: R$ ${formatBRNumber(saldoDevedor)}`);
    console.log(`   ✅ USANDO SALDO CALCULADO: R$ ${formatBRNumber(saldoDevedor)}`);

    if (!(taxaAtualMes > 0)) {
        const estimada = estimarTaxaPorValorPago(contrato.valor_liberado, totalParcelas, parcelaOriginal);
        if (estimada > 0) {
            taxaAtualMes = estimada;
        } else {
            return {
                contrato: contrato.contrato,
                motivo: "Falha ao calcular taxa",
                parcela: formatBRNumber(parcelaOriginal),
                saldo_devedor: formatBRNumber(saldoDevedor),
                prazo_total: totalParcelas,
                parcelas_pagas: Number.isFinite(+contrato.parcelas_pagas) ? +contrato.parcelas_pagas : 0,
                banco: contrato.banco,
            };
        }
    }

    // Bancos de simulação - Se tem margem extrapolada, só testa BRB
    const bancosParaSimular = temMargemExtrapolada ? ["BRB"] : bancosPermitidosPorEspecie(contrato.especie);
    let escolhido = null;

    // Armazena apenas a última taxa por banco
    const motivosBloqueio = {};

    console.log(`🔍 Testando bancos para contrato ${contrato.contrato}:`, bancosParaSimular);

    for (const banco of bancosParaSimular) {
        console.log(`🏦 Testando banco: ${banco}`);
        const aplicacao = aplicarRoteiro({ ...contrato, saldo_devedor: saldoDevedor }, banco);
        console.log(`📋 Resultado aplicacaoRoteiro para ${banco}:`, aplicacao);

        if (!aplicacao.valido) {
            motivosBloqueio[banco] = aplicacao.motivo;
            console.log(`❌ ${banco} rejeitado: ${aplicacao.motivo}`);
            continue;
        }

        const roteiro = RoteiroBancos[banco];
        const taxasPermitidas = roteiro?.taxas || [];
        console.log(`💰 Testando taxas para ${banco}:`, taxasPermitidas);
        
        for (const tx of taxasPermitidas) {
            const coefNovo = getCoeficiente(tx, diaAverbacao);
            console.log(`🔍 Taxa ${tx}% - Coeficiente encontrado: ${coefNovo}`);
            
            if (!coefNovo) {
                console.log(`❌ Coeficiente não encontrado para taxa ${tx}%`);
                continue;
            }

            const valorEmprestimo = parcelaOriginal / coefNovo;
            const troco = valorEmprestimo - saldoDevedor;

            console.log(`💵 Cálculo detalhado para ${banco} (${tx}%):`);
            console.log(`   Parcela Original: R$ ${formatBRNumber(parcelaOriginal)}`);
            console.log(`   Coeficiente: ${coefNovo}`);
            console.log(`   Valor Empréstimo: R$ ${formatBRNumber(valorEmprestimo)}`);
            console.log(`   Saldo Devedor: R$ ${formatBRNumber(saldoDevedor)}`);
            console.log(`   Troco Calculado: R$ ${formatBRNumber(troco)}`);
            console.log(`   Troco Mínimo: R$ ${formatBRNumber(TROCO_MINIMO)}`);
            console.log(`   Troco >= Mínimo: ${troco >= TROCO_MINIMO}`);

            if (Number.isFinite(troco) && troco >= TROCO_MINIMO) {
                console.log(`✅ ${banco} APROVADO com troco R$ ${formatBRNumber(troco)}`);
                escolhido = {
                    bancoNovo: banco,
                    taxaSelecionada: tx,
                    coeficiente_usado: coefNovo,
                    saldoDevedor,
                    valorEmprestimo,
                    troco,
                };
                break; // banco válido encontrado
            } else {
                console.log(`❌ ${banco} rejeitado - Troco insuficiente: R$ ${formatBRNumber(troco)} < R$ ${formatBRNumber(TROCO_MINIMO)}`);
                // Sobrescreve apenas a última taxa testada para esse banco
                motivosBloqueio[banco] = `Troco (${formatBRNumber(troco)}) TX ${tx}`;
            }
        }
        if (escolhido) break;
    }

    console.log(`📝 Motivos de bloqueio finais:`, motivosBloqueio);

    // Contrato não elegível
    if (!escolhido) {
        const todosMotivos = Object.entries(motivosBloqueio)
            .map(([banco, motivo]) => `${banco}: ${motivo}`)
            .join(" | ");
        return {
            contrato: contrato.contrato,
            motivo: `Nenhum banco/taxa elegível - motivos: ${todosMotivos}`,
            parcela: formatBRNumber(parcelaOriginal),
            saldo_devedor: formatBRNumber(saldoDevedor),
            prazo_total: totalParcelas,
            parcelas_pagas: Number.isFinite(+contrato.parcelas_pagas) ? +contrato.parcelas_pagas : 0,
            banco: contrato.banco,
        };
    }

    return {
        banco: contrato.banco,
        bancoNovo: escolhido.bancoNovo,
        contrato: contrato.contrato,
        parcela_original: formatBRNumber(parcelaOriginal),
        parcela: formatBRNumber(parcelaOriginal),
        prazo_total: totalParcelas,
        parcelas_pagas: Number.isFinite(+contrato.parcelas_pagas) ? +contrato.parcelas_pagas : 0,
        prazo_restante: prazoRestante,
        prazo_simulado: PRAZO_SIMULADO,
        taxa_atual: formatBRNumber(taxaAtualMes),
        taxa_atual_anual: formatBRNumber((Math.pow(1 + taxaAtualMes / 100, 12) - 1) * 100),
        status_taxa: contrato.status_taxa || "RECALCULADA_VALOR_PAGO",
        taxa_calculada: formatBRNumber(escolhido.taxaSelecionada),
        coeficiente_usado: escolhido.coeficiente_usado,
        saldo_devedor: formatBRNumber(escolhido.saldoDevedor),
        valor_emprestimo: formatBRNumber(escolhido.valorEmprestimo),
        troco: formatBRNumber(escolhido.troco),
        data_contrato: contrato.data_contrato || contrato.data_inclusao || null,
        motivo: null,
    };
}

// Função para obter taxas do banco
function obterTaxasDoBanco(bancoNome) {
    const roteiro = RoteiroBancos[bancoNome.toUpperCase()];
    if (roteiro && roteiro.taxas) {
        return roteiro.taxas;
    }
    return [1.85]; // Taxa padrão
}

// Função para calcular troco para uma taxa específica
function calcularTrocoParaTaxa(contrato, taxa) {
    const parcelaOriginal = toNumber(contrato.valor_parcela || 0);
    const saldoDevedor = contrato.saldo_devedor || calcularSaldoDevedor(contrato);
    
    const coeficiente = getCoeficiente(taxa);
    if (!coeficiente) return formatBRNumber(0);
    
    const valorEmprestimo = parcelaOriginal / coeficiente;
    const troco = valorEmprestimo - saldoDevedor;
    
    return formatBRNumber(Math.max(0, troco));
}

// Função para selecionar taxa
function selecionarTaxa(contratoId, taxa) {
    const contrato = contratos.find(c => c.id === contratoId);
    if (!contrato) return;
    
    // Atualizar taxa simulada
    if (contrato.simulacao) {
        contrato.simulacao.taxa = taxa;
        // Recalcular troco com coeficiente correto
        const parcelaOriginal = toNumber(contrato.valor_parcela || 0);
        const saldoDevedor = contrato.saldo_devedor || calcularSaldoDevedor(contrato);
        
        const coeficiente = getCoeficiente(taxa);
        if (coeficiente) {
            const valorEmprestimo = parcelaOriginal / coeficiente;
            const novoTroco = valorEmprestimo - saldoDevedor;
            contrato.simulacao.troco = Math.max(0, novoTroco);
            contrato.troco = contrato.simulacao.troco; // Atualizar troco do contrato
        }
    }
    
    // Remover lista de taxas
    const listaTaxas = document.querySelector(`#detalhes-${contratoId} .taxas-disponiveis`);
    if (listaTaxas) {
        listaTaxas.remove();
    }
    
    // Re-renderizar contrato
    renderizarContratos();
    salvarDadosEditados(contratoId);
}

// Função para abrir upload de extrato
async function abrirDigitar() {
    // Verificar se há dados do cliente
    if (!cliente || !cliente.nome) {
        alert('⚠️ Dados do cliente não encontrados! Certifique-se de que o extrato foi carregado corretamente.');
        return;
    }
    
    // Verificar e inicializar extratoAtual se necessário
    if (!extratoAtual) {
        console.log('⚠️ extratoAtual não definido, inicializando...');
        extratoAtual = {
            id: codigoExtrato || `extrato_${Date.now()}`,
            idoportunidade: null,
            dados: {
                cliente: cliente,
                contratos: contratos,
                margens: margens
            }
        };
    }
    
    // Filtrar contratos ativos
    const contratosAtivos = contratos.filter(c => c.aprovado && c.simulacao && c.simulacao.aprovado);
    
    if (contratosAtivos.length === 0) {
        alert('⚠️ Nenhum contrato ativo encontrado para digitação!\n\nFaça a simulação primeiro para gerar os contratos.');
        return;
    }
    
    try {
        // Verificar se o ClientManager está disponível
        if (typeof window.clientManager === 'undefined') {
            // Criar um script tag para carregar o client-manager
            const script = document.createElement('script');
            script.src = '/operacional/client-manager.js?v=20250103210000';
            script.onload = async () => {
                console.log('✅ ClientManager carregado, inicializando com sincronização...');
                try {
                    // Inicializar com sincronização híbrida
                    await window.clientManager.initialize();
                    console.log('✅ ClientManager inicializado com dados sincronizados');
                    setTimeout(() => abrirDigitar(), 100);
                } catch (error) {
                    console.error('❌ Erro ao inicializar ClientManager:', error);
                    alert('❌ Erro ao sincronizar dados. Abrindo modo manual...');
                    abrirDigitarManual();
                }
            };
            script.onerror = () => {
                console.error('❌ Erro ao carregar ClientManager');
                alert('❌ Erro ao conectar com sistema operacional. Abrindo modo manual...');
                abrirDigitarManual();
            };
            document.head.appendChild(script);
            return;
        }
        
        // Preparar dados do cliente para o sistema operacional
        const clienteData = {
            nome: cliente.nome || '',
            cpf: cliente.cpf || '',
            nascimento: cliente.nascimento || '',
            telefone: cliente.telefone || '',
            email: cliente.email || '',
            nb: cliente.nb || '',
            endereco: {
                cep: cliente.cep || '',
                logradouro: cliente.logradouro || '',
                numero: cliente.numero || '',
                complemento: cliente.complemento || '',
                bairro: cliente.bairro || '',
                cidade: cliente.cidade || '',
                uf: cliente.uf || ''
            }
        };
        
        // Preparar contratos para o sistema operacional
        const contratosFormatados = contratosAtivos.map((c, index) => ({
            id: index + 1,
            banco: c.simulacao?.bancoNovo || c.banco?.nome || 'Não definido',
            parcelas: 96,
            valorParcela: c.simulacao ? `R$ ${c.simulacao.parcela?.toFixed(2)}` : 'R$ 0,00',
            taxa: c.simulacao ? `${c.simulacao.taxa}%` : '0%',
            troco: c.simulacao ? `R$ ${c.simulacao.troco?.toFixed(2)}` : 'R$ 0,00',
            editando: false
        }));
        
        // Criar ou atualizar cliente no sistema operacional
        let clientId;
        try {
            clientId = await window.clientManager.createOrUpdateClient(clienteData);
            console.log('✅ Cliente criado/atualizado:', clientId);
        } catch (error) {
            console.error('❌ Erro ao criar cliente:', error);
            alert(`❌ Erro ao salvar cliente: ${error.message}\n\nTentando modo manual...`);
            abrirDigitarManual();
            return;
        }
        
        // Calcular resumo da proposta para o clientManager
        const primeiroContratoResumo = contratosAtivos[0] || {};
        const bancoAtualResumo = primeiroContratoResumo.banco || 'N/A';
        const bancoNovoResumo = primeiroContratoResumo.simulacao?.banco || 'N/A';
        const parcelaAtualResumo = primeiroContratoResumo.valor_parcela || 0;
        const parcelaNovaResumo = primeiroContratoResumo.simulacao?.parcela || 0;
        const prazoAtualResumo = primeiroContratoResumo.parcelas_pagas || 0;
        const prazoNovoResumo = primeiroContratoResumo.prazo_total || 0;
        const trocoTotalResumo = contratosAtivos.reduce((sum, c) => sum + (c.simulacao?.troco || 0), 0);
        const saldoDevedorResumo = contratosAtivos.reduce((sum, c) => sum + (c.saldo_devedor || 0), 0);
        const numeroContratoResumo = primeiroContratoResumo.contrato || 'N/A';
        
        // Dados da proposta
        const proposalData = {
            extrato: {
                data: new Date().toISOString().split('T')[0],
                margem: margens.margem_disponivel_empretimo || 'R$ 0,00',
                origem: 'INSS - Simulador'
            },
            contratos: contratosFormatados,
            status: 'pending',
            origem: 'simulador',
            extratoId: extratoAtual?.id || null,
            statusProdutos: '1', // ID do produto: 1 = Portabilidade c/ Troco
            // Resumo da proposta para exibição na fila
            bancoAtual: bancoAtualResumo,
            bancoNovo: bancoNovoResumo,
            parcelaAtual: parcelaAtualResumo,
            parcelaNova: parcelaNovaResumo,
            prazoAtual: prazoAtualResumo,
            prazoNovo: prazoNovoResumo,
            trocoTotal: trocoTotalResumo,
            saldoDevedor: saldoDevedorResumo,
            numeroContrato: numeroContratoResumo,
            dataCriacao: new Date().toISOString(),
            dataAtualizacao: new Date().toISOString()
        };
        
        // Adicionar proposta ao cliente
        try {
            const proposalId = window.clientManager.addProposalToClient(clientId, proposalData);
            console.log('✅ Proposta criada:', proposalId);
            
            // Atualizar status para "CLIENTE_ACEITOU"
            window.clientManager.updateProposalStatus(clientId, proposalId, 'CLIENTE_ACEITOU', {
                origem: 'simulador',
                extratoId: extratoAtual?.id || null
            });

            // Criar ID único para a proposta (compatível com o servidor)
            const propostaId = `proposta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Preparar dados da proposta para salvar no servidor
            // Calcular resumo da proposta
            const primeiroContrato = contratosAtivos[0] || {};
            const bancoAtual = primeiroContrato.banco || 'N/A';
            const bancoNovo = primeiroContrato.simulacao?.banco || 'N/A';
            const parcelaAtual = primeiroContrato.valor_parcela || 0;
            const parcelaNova = primeiroContrato.simulacao?.parcela || 0;
            const prazoAtual = primeiroContrato.parcelas_pagas || 0;
            const prazoNovo = primeiroContrato.prazo_total || 0;
            const trocoTotal = contratosAtivos.reduce((sum, c) => sum + (c.simulacao?.troco || 0), 0);
            const saldoDevedor = contratosAtivos.reduce((sum, c) => sum + (c.saldo_devedor || 0), 0);
            const numeroContrato = primeiroContrato.contrato || 'N/A';
            
            const dadosProposta = {
                id: propostaId,
                clientId: clientId,
                proposalId: proposalId, // ID do clientManager
                cliente: cliente,
                margens: margens,
                contratos: contratosAtivos,
                timestamp: new Date().toISOString(),
                tipo: 'proposta_cliente',
                status: 'CLIENTE_ACEITOU',
                origem: 'simulador',
                extratoId: extratoAtual?.id || null,
                idoportunidade: window.idoportunidade || null, // Incluir ID da Kentro
                statusProdutos: '1', // ID do produto: 1 = Portabilidade c/ Troco (calculado pelo simulador)
                // Resumo da proposta para exibição na fila
                bancoAtual: bancoAtual,
                bancoNovo: bancoNovo,
                parcelaAtual: parcelaAtual,
                parcelaNova: parcelaNova,
                prazoAtual: prazoAtual,
                prazoNovo: prazoNovo,
                trocoTotal: trocoTotal,
                saldoDevedor: saldoDevedor,
                numeroContrato: numeroContrato,
                dataCriacao: new Date().toISOString()
            };
            
            // Salvar proposta no servidor
            console.log('💾 Salvando proposta no servidor:', propostaId);
            fetch('/salvar-proposta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    propostaId: propostaId,
                    dados: dadosProposta
                })
            })
            .then(response => response.json())
            .then(result => {
                console.log('✅ Proposta salva no servidor:', result);
                if (result.success) {
                    // Sincronizar dados Kentro + Extrato no sistema Lunas
                    if (window.idoportunidade && clientId) {
                        console.log('🔄 Sincronizando dados Kentro + Extrato...');
                        sincronizarDadosCliente(clientId, window.idoportunidade, cliente);
                    }
                    
                    // Gerar link completo
                    const linkCompleto = `${window.location.origin}/detalhesdaproposta/${propostaId}`;
                    console.log('🔗 Link gerado:', linkCompleto);
                    
                    // Mostrar modal com opções
                    mostrarModalProposta(linkCompleto);
                } else {
                    console.error('❌ Erro ao salvar proposta:', result.error);
                    alert('Erro ao salvar proposta: ' + result.error);
                }
            })
            .catch(error => {
                console.error('❌ Erro ao salvar proposta:', error);
                alert('Erro ao salvar proposta: ' + error.message);
            });

            let formUrl = `/detalhesdaproposta/${propostaId}`;
            
        } catch (error) {
            console.error('❌ Erro ao criar proposta:', error);
            alert(`❌ Erro ao criar proposta: ${error.message}`);
        }
        
    } catch (error) {
        console.error('❌ Erro geral no abrirDigitar:', error);
        alert(`❌ Erro inesperado: ${error.message}\n\nTentando modo manual...`);
        abrirDigitarManual();
    }
}

// Função auxiliar para modo manual (fallback)
function abrirDigitarManual() {
    // Gerar ID único para a proposta
    const propostaId = `proposta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Salvar dados da proposta no localStorage (modo antigo)
    const dadosProposta = {
        id: propostaId,
        cliente: cliente,
        margens: margens,
        contratos: contratos.filter(c => c.aprovado && c.simulacao && c.simulacao.aprovado),
        timestamp: new Date().toISOString(),
        tipo: 'proposta_cliente'
    };
    
    // Salvar proposta no servidor
    console.log('💾 Salvando proposta:', propostaId);
    console.log('📋 Dados da proposta:', dadosProposta);
    
    fetch('/salvar-proposta', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            propostaId: propostaId,
            dados: dadosProposta
        })
    })
    .then(response => {
        console.log('📡 Resposta do servidor:', response.status);
        return response.json();
    })
    .then(result => {
        console.log('✅ Resultado do salvamento:', result);
        if (result.success) {
            // Gerar link
            const linkCompleto = `${window.location.origin}/detalhesdaproposta/${propostaId}`;
            console.log('🔗 Link gerado:', linkCompleto);
            
            // Mostrar modal com opções
            mostrarModalProposta(linkCompleto);
        } else {
            console.error('❌ Erro ao salvar proposta:', result.error);
            alert('Erro ao salvar proposta: ' + result.error);
        }
    })
    .catch(error => {
        console.error('❌ Erro ao salvar proposta:', error);
        alert('Erro ao salvar proposta: ' + error.message);
    });
}

// Função para mostrar sucesso da digitação
function mostrarSucessoDigitacao(clientId, proposalId) {
    // Criar elemento de notificação de sucesso
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        z-index: 10000;
        max-width: 400px;
        font-family: 'Inter', sans-serif;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                ✓
            </div>
            <strong>Proposta Enviada com Sucesso!</strong>
        </div>
        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 15px;">
            Cliente: ${cliente.nome}<br>
            CPF: ${cliente.cpf}<br>
            ID da Proposta: ${proposalId}
        </div>
        <div style="display: flex; gap: 10px;">
            <a href="/operacional/digitation-interface.html?clientId=${clientId}&propostaId=${proposalId}" 
               target="_blank" 
               style="background: rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">
                🚀 Abrir Digitação
            </a>
            <a href="/operacional/fila-digitation.html" 
               target="_blank" 
               style="background: rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">
                📋 Ver Fila
            </a>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remover notificação após 10 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 10000);
}

// Função para mostrar modal de proposta gerada
function mostrarModalProposta(link) {
    // Criar modal
    const modal = document.createElement('div');
    modal.className = 'modal-proposta-overlay';
    modal.innerHTML = `
        <div class="modal-proposta-content">
            <div class="modal-proposta-header">
                <div class="modal-proposta-icon">
                    <i data-feather="check-circle" class="feather-icon"></i>
                </div>
                <h3 class="modal-proposta-title">Proposta Gerada com Sucesso!</h3>
                <p class="modal-proposta-text">Sua proposta foi criada e está pronta para ser compartilhada com o cliente.</p>
            </div>
            <div class="modal-proposta-body">
                <div class="link-container">
                    <label class="link-label">Link da Proposta:</label>
                    <div class="link-input-container">
                        <input type="text" id="linkProposta" value="${link}" readonly class="link-input">
                        <button class="btn-copy-link" onclick="copiarLink()">
                            <i data-feather="copy" class="feather-icon"></i>
                            COPIAR LINK
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-proposta-actions">
                <button class="btn-modal btn-modal-secondary" onclick="fecharModalProposta()">
                    <i data-feather="x" class="feather-icon"></i>
                    Fechar
                </button>
                <button class="btn-modal btn-modal-primary" onclick="abrirProposta('${link}')">
                    <i data-feather="external-link" class="feather-icon"></i>
                    Abrir Proposta
                </button>
            </div>
        </div>
    `;
    
    // Adicionar estilos se não existirem
    if (!document.getElementById('modal-proposta-styles')) {
        const styles = document.createElement('style');
        styles.id = 'modal-proposta-styles';
        styles.textContent = `
            .modal-proposta-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .modal-proposta-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                animation: slideIn 0.3s ease;
            }
            
            .modal-proposta-header {
                padding: 1.5rem 1.5rem 1rem 1.5rem;
                text-align: center;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .modal-proposta-icon {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #10b981, #059669);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1rem auto;
            }
            
            .modal-proposta-icon i {
                color: white;
                width: 30px;
                height: 30px;
            }
            
            .modal-proposta-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: #1e293b;
                margin: 0 0 0.5rem 0;
            }
            
            .modal-proposta-text {
                color: #64748b;
                margin: 0;
                font-size: 0.9rem;
            }
            
            .modal-proposta-body {
                padding: 1.5rem;
            }
            
            .link-container {
                margin-bottom: 1rem;
            }
            
            .link-label {
                display: block;
                font-weight: 600;
                color: #374151;
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }
            
            .link-input-container {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }
            
            .link-input {
                flex: 1;
                padding: 0.75rem;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 0.9rem;
                background: #f9fafb;
                color: #374151;
            }
            
            .btn-copy-link {
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
                border: none;
                padding: 0.75rem 1rem;
                border-radius: 6px;
                font-weight: 600;
                font-size: 0.85rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: all 0.3s ease;
                white-space: nowrap;
            }
            
            .btn-copy-link:hover {
                background: linear-gradient(135deg, #2563eb, #1e40af);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
            
            .btn-copy-link:active {
                transform: translateY(0);
            }
            
            .btn-copy-link i {
                width: 16px;
                height: 16px;
            }
            
            .modal-proposta-actions {
                padding: 1rem 1.5rem 1.5rem 1.5rem;
                display: flex;
                gap: 0.75rem;
                justify-content: flex-end;
            }
            
            .btn-modal {
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                font-weight: 600;
                font-size: 0.9rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: all 0.3s ease;
                border: none;
            }
            
            .btn-modal-secondary {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }
            
            .btn-modal-secondary:hover {
                background: #e5e7eb;
            }
            
            .btn-modal-primary {
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
            }
            
            .btn-modal-primary:hover {
                background: linear-gradient(135deg, #2563eb, #1e40af);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
            
            .btn-modal i {
                width: 16px;
                height: 16px;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            @media (max-width: 768px) {
                .modal-proposta-content {
                    width: 95%;
                    margin: 1rem;
                }
                
                .link-input-container {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .btn-copy-link {
                    justify-content: center;
                }
                
                .modal-proposta-actions {
                    flex-direction: column;
                }
                
                .btn-modal {
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Adicionar modal ao body
    document.body.appendChild(modal);
    
    // Atualizar ícones
    feather.replace();
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            fecharModalProposta();
        }
    });
}

// Função para copiar link
function copiarLink() {
    const linkInput = document.getElementById('linkProposta');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // Para mobile
    
    try {
        document.execCommand('copy');
        
        // Mostrar feedback visual
        const btn = document.querySelector('.btn-copy-link');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-feather="check" class="feather-icon"></i> COPIADO!';
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        
        // Atualizar ícone
        feather.replace();
        
        // Restaurar botão após 2 segundos
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
            feather.replace();
        }, 2000);
        
    } catch (err) {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar link. Tente selecionar e copiar manualmente.');
    }
}

// Função para abrir proposta
function abrirProposta(link) {
    window.open(link, '_blank');
    fecharModalProposta();
}

// Função para fechar modal
function fecharModalProposta() {
    const modal = document.querySelector('.modal-proposta-overlay');
    if (modal) {
        modal.remove();
    }
}

function abrirUploadExtrato() {
    
    // Criar modal para CPF
    criarModalCPF();
}

function criarModalCPF() {
    // Remover modal existente se houver
    const modalExistente = document.getElementById('modal-cpf');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    // Criar modal com estilo da página
    const modal = document.createElement('div');
    modal.id = 'modal-cpf';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(51, 65, 85, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        backdrop-filter: blur(4px);
    `;
    
    // Conteúdo do modal com estilo da página
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            max-width: 450px;
            width: 90%;
            text-align: center;
            border: 1px solid rgba(59, 130, 246, 0.1);
        ">
            <div style="
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
                padding: 1rem;
                border-radius: 12px;
                margin-bottom: 1.5rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            ">
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600;">
                    📄 Upload de Extrato
                </h3>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; opacity: 0.9;">
                    Digite o CPF do cliente para continuar
                </p>
            </div>
            
            <div style="
                background: linear-gradient(135deg, #dbeafe, #bfdbfe);
                border: 1px solid #93c5fd;
                border-radius: 8px;
                padding: 0.75rem;
                margin-bottom: 1.5rem;
                font-size: 0.875rem;
                color: #1e40af;
            ">
                💡 <strong>Dica:</strong> Digite apenas os números do CPF. A formatação será aplicada automaticamente.
            </div>
            
            <input type="text" 
                   id="cpf-input" 
                   placeholder="000.000.000-00"
                   maxlength="14"
                   style="
                       width: 100%;
                       padding: 1rem;
                       border: 2px solid #e2e8f0;
                       border-radius: 12px;
                       font-size: 1.125rem;
                       text-align: center;
                       margin-bottom: 1.5rem;
                       box-sizing: border-box;
                       background: #ffffff;
                       color: #334155;
                       transition: all 0.2s ease;
                       font-weight: 500;
                   "
                   autocomplete="off"
                   onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'; this.style.background='#f8fafc'"
                   onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'; this.style.background='#ffffff'">
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="btn-cancelar" style="
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.875rem;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    min-width: 100px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 8px -1px rgba(0, 0, 0, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.1)'">
                    ❌ Cancelar
                </button>
                
                <button id="btn-continuar" style="
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.875rem;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    min-width: 100px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 8px -1px rgba(0, 0, 0, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.1)'">
                    ✅ Continuar
                </button>
            </div>
            
            <div id="cpf-error" style="
                color: #ef4444;
                font-size: 0.875rem;
                margin-top: 1rem;
                display: none;
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 6px;
                padding: 0.5rem;
            "></div>
        </div>
    `;
    
    // Adicionar ao DOM
    document.body.appendChild(modal);
    
    // Focar no input
    const input = document.getElementById('cpf-input');
    input.focus();
    
    // Formatar CPF automaticamente
    input.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length <= 11) {
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            e.target.value = value;
        }
        
        // Limpar erro
        document.getElementById('cpf-error').style.display = 'none';
    });
    
    // Permitir Enter para continuar
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('btn-continuar').click();
        }
    });
    
    // Botão cancelar
    document.getElementById('btn-cancelar').addEventListener('click', function() {
        modal.remove();
    });
    
    // Botão continuar
    document.getElementById('btn-continuar').addEventListener('click', function() {
        const cpf = input.value.replace(/\D/g, '');
        
        if (cpf.length !== 11) {
            const errorDiv = document.getElementById('cpf-error');
            errorDiv.textContent = 'CPF inválido. Digite 11 números.';
            errorDiv.style.display = 'block';
            input.focus();
            return;
        }
        
        modal.remove();
        
        // Continuar com o upload
        continuarUploadExtrato(cpf);
    });
    
    // Fechar modal clicando fora
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function continuarUploadExtrato(cpfLimpo) {
    
    // Criar input de arquivo
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.style.display = 'none';
    
    // Adicionar ao DOM temporariamente
    document.body.appendChild(input);
    
    // Quando arquivo for selecionado
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        
        // Verificar se é PDF
        if (file.type !== 'application/pdf') {
            alert('Por favor, selecione apenas arquivos PDF.');
            return;
        }
        
        // Verificar tamanho (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande. Tamanho máximo: 10MB');
            return;
        }
        
        
        // Fazer upload do arquivo com CPF
        uploadExtrato(file, cpfLimpo);
        
        // Remover input do DOM
        document.body.removeChild(input);
    };
    
    // Abrir seletor de arquivo (usar setTimeout para manter user activation)
    setTimeout(() => {
        input.click();
    }, 0);
}

async function uploadExtrato(file, cpf) {
    try {
        // Mostrar loading para busca na Kentro
        const loadingMsg = document.createElement('div');
        loadingMsg.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                        z-index: 10000; text-align: center; min-width: 350px;">
                <div style="margin-bottom: 1rem;">
                    <div style="width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top: 4px solid #3b82f6; 
                                border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                </div>
                <h3 style="margin: 0 0 0.5rem 0; color: #1f2937;">Processando Solicitação</h3>
                <p style="margin: 0; color: #6b7280;" id="loading-text">Buscando cliente na Kentro...</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.appendChild(loadingMsg);
        
        // 1. Buscar cliente na Kentro pelo CPF
        console.log(`🔍 Buscando cliente na Kentro com CPF: ${cpf}`);
        let idoportunidade;
        
        // Tornar idoportunidade global para uso posterior
        window.idoportunidade = null;
        
        try {
            // Atualizar loading
            document.getElementById('loading-text').textContent = 'Buscando cliente na Kentro...';
            
            const kentroResponse = await fetch(`${configSimulador.apiUrl}/kentro/buscar-cliente`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cpf: cpf })
            });
            
            if (kentroResponse.ok) {
                const kentroData = await kentroResponse.json();
                if (kentroData.idoportunidade) {
                    idoportunidade = kentroData.idoportunidade;
                    window.idoportunidade = idoportunidade; // Tornar global
                    console.log(`✅ Cliente encontrado na Kentro. ID Oportunidade: ${idoportunidade}`);
                    document.getElementById('loading-text').textContent = 'Cliente encontrado! Processando extrato...';
                } else {
                    throw new Error('Cliente não encontrado na Kentro');
                }
            } else {
                throw new Error('Erro ao buscar na Kentro');
            }
            
        } catch (kentroError) {
            console.log(`⚠️ Cliente não encontrado na Kentro: ${kentroError.message}`);
            
            // 2. Criar nova oportunidade na Kentro
            document.getElementById('loading-text').textContent = 'Criando nova oportunidade na Kentro...';
            
            try {
                const criarResponse = await fetch(`${configSimulador.apiUrl}/kentro/criar-oportunidade`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        cpf: cpf,
                        origem: 'INSS_SIMULADOR',
                        descricao: 'Oportunidade criada via simulador INSS'
                    })
                });
                
                if (criarResponse.ok) {
                    const novaOportunidade = await criarResponse.json();
                    idoportunidade = novaOportunidade.oportunidade.id;
                    window.idoportunidade = idoportunidade; // Tornar global
                    console.log(`✅ Nova oportunidade criada na Kentro. ID: ${idoportunidade}`);
                    document.getElementById('loading-text').textContent = 'Nova oportunidade criada! Processando extrato...';
                } else {
                    throw new Error('Erro ao criar oportunidade na Kentro');
                }
                
            } catch (criarError) {
                console.error(`❌ Erro ao criar oportunidade: ${criarError.message}`);
                
                // Se Kentro falhar, não continuar - mostrar erro
                document.body.removeChild(loadingMsg);
                alert(`❌ Erro ao criar oportunidade na Kentro: ${criarError.message}\n\nPor favor, verifique sua conexão e tente novamente.`);
                return;
            }
        }
        
        // 3. Fazer upload do extrato com ID da oportunidade
        const formData = new FormData();
        formData.append('file', file);
        formData.append('idoportunidade', idoportunidade);
        formData.append('cpf', cpf);
        
        console.log(`📤 Fazendo upload com idoportunidade: ${idoportunidade} e CPF: ${cpf}`);
        
        // Fazer upload usando configuração de ambiente
        const response = await fetch(`${configSimulador.apiUrl}/extrairpdf`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Erro no upload: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Remover loading
        if (loadingMsg && loadingMsg.parentNode) {
            loadingMsg.parentNode.removeChild(loadingMsg);
        }
        
        if (result.success) {
            // Carregar dados do extrato
            await carregarSimulacaoPorId(result.fileId);
            alert('✅ Extrato processado com sucesso!');
        } else {
            alert(`❌ Erro ao processar extrato: ${result.error || 'Erro desconhecido'}`);
        }
        
    } catch (error) {
        console.error('Erro no upload:', error);
        
        // Remover loading se ainda estiver visível
        const loadingMsg = document.querySelector('div[style*="position: fixed"]');
        if (loadingMsg && loadingMsg.parentNode) {
            loadingMsg.parentNode.removeChild(loadingMsg);
        }
        
        alert(`❌ Erro ao fazer upload do extrato: ${error.message}`);
    }
}

// Função para alternar exibição dos bancos no resumo
function toggleResumoBancos() {
    const bancosResumo = document.getElementById('bancosResumo');
    const toggle = document.querySelector('.resumo-toggle');
    const icon = toggle.querySelector('.feather-icon');
    
    if (bancosResumo.classList.contains('expandida')) {
        bancosResumo.classList.remove('expandida');
        toggle.innerHTML = '<i data-feather="chevron-down" class="feather-icon small"></i> Ver detalhes';
        feather.replace();
    } else {
        bancosResumo.classList.add('expandida');
        toggle.innerHTML = '<i data-feather="chevron-up" class="feather-icon small"></i> Ocultar detalhes';
        feather.replace();
    }
}

// Função para aplicar ajuste de margem extrapolada (baseada no calculo.js)
function aplicarAjusteMargemExtrapolada(contratos, extrapoladaAbs) {
    if (!(extrapoladaAbs > 0) || !Array.isArray(contratos) || contratos.length === 0) {
        return { contratosAjustados: contratos, info: null };
    }

    const ordenados = [...contratos].sort((a, b) => toNumber(b.valor_parcela) - toNumber(a.valor_parcela));
    const maior = ordenados[0];
    if (!maior) return { contratosAjustados: contratos, info: null };

    const original = toNumber(maior.valor_parcela);
    const nova = Math.max(0, original - extrapoladaAbs);

        const ajustados = contratos.map(c => {
            if (c.contrato === maior.contrato) {
                return {
                    ...c,
                    __parcela_original__: original, // Manter como número para cálculos
                    valor_parcela_original: original, // Backup adicional
                    valor_parcela: nova // Parcela ajustada
                };
            }
            return c;
        });

    return {
        contratosAjustados: ajustados,
        info: {
            contrato: maior.contrato,
            parcela_original: formatBRNumber(original),
            parcela_ajustada: formatBRNumber(nova),
            extrapolada_utilizada: formatBRNumber(extrapoladaAbs)
        }
    };
}

// Função para simular todos os contratos automaticamente
function simularTodosContratos() {
    console.log('🔄 Simulando todos os contratos automaticamente...');
    console.log(`📊 Total de contratos para simular: ${contratos.length}`);
    
    // ===================== Aplicar Ajuste de Margem Extrapolada =====================
    console.log('🚀 INICIANDO VERIFICAÇÃO DE MARGEM EXTRAPOLADA - VERSÃO NOVA 2025-01-02 01:35:00');
    const margemExtrapolada = toNumber(margens.extrapolada);
    let infoAjuste = null;
    
    console.log(`🔍 DEBUG Margem Extrapolada:`);
    console.log(`   - margens.extrapolada: "${margens.extrapolada}"`);
    console.log(`   - typeof margens.extrapolada: ${typeof margens.extrapolada}`);
    console.log(`   - toNumber(margens.extrapolada): ${margemExtrapolada}`);
    console.log(`   - typeof margemExtrapolada: ${typeof margemExtrapolada}`);
    console.log(`   - margemExtrapolada > 0: ${margemExtrapolada > 0}`);
    console.log(`   - Teste toNumber("76,20"): ${toNumber("76,20")}`);
    
    if (margemExtrapolada > 0) {
        console.log(`🔧 Margem extrapolada detectada: R$${formatBRNumber(margemExtrapolada)}`);
        const { contratosAjustados, info } = aplicarAjusteMargemExtrapolada(contratos, margemExtrapolada);
        
        // Atualizar contratos globais com os ajustados
        contratos.length = 0; // Limpar array
        contratos.push(...contratosAjustados); // Adicionar contratos ajustados
        
        infoAjuste = info;
        console.log(`📊 Ajuste aplicado:`, info);
        
        // Mostrar notificação do ajuste
        if (info) {
            console.log(`🔔 NOTIFICAÇÃO: Margem extrapolada R$${info.extrapolada_utilizada} aplicada no contrato ${info.contrato}. Parcela ajustada: R$${info.parcela_original} → R$${info.parcela_ajustada}`);
            // TODO: Implementar função mostrarNotificacao se necessário
        }
        
        // Atualizar interface para mostrar os valores ajustados
        renderizarContratos();
    }
    
    contratos.forEach((contrato, index) => {
        console.log(`🔄 Simulando contrato ${index + 1}/${contratos.length}: ${contrato.contrato}`);
        if (!contrato.simulacao) {
            try {
                // Simular automaticamente taxa e saldo se estiverem em branco
                if (!contrato.taxa_juros_mensal || contrato.taxa_juros_mensal === 0) {
                    contrato.taxa_juros_mensal = 1.85; // Taxa padrão
                }
                if (!contrato.saldo_devedor || contrato.saldo_devedor === 0) {
                    contrato.saldo_devedor = calcularSaldoDevedor(contrato);
                }

                // Usar a nova lógica local baseada no calculo (1).js
                const temMargemExtrapolada = margemExtrapolada > 0;
                const resultado = calcularParaContrato(contrato, "15", temMargemExtrapolada);
                
                if (resultado.motivo) {
                    // Contrato rejeitado
                    contrato.simulacao = {
                        aprovado: false,
                        motivo: resultado.motivo,
                        banco: resultado.banco?.nome || 'Nenhum',
                        troco: 0,
                        taxa: contrato.taxa_juros_mensal
                    };
                    contrato.troco = 0;
                    contrato.aprovado = false;
                } else {
                    // Contrato aprovado
                    contrato.simulacao = {
                        aprovado: true,
                        banco: resultado.bancoNovo,
                        troco: toNumber(resultado.troco),
                        taxa: toNumber(resultado.taxa_calculada),
                        parcela: toNumber(resultado.parcela),
                        parcelasPagas: resultado.parcelas_pagas,
                        valorEmprestimo: toNumber(resultado.valor_emprestimo),
                        coeficiente: resultado.coeficiente_usado
                    };
                    contrato.troco = contrato.simulacao.troco;
                    contrato.aprovado = true;
                    
                    console.log('🔍 Verificação troco (selecionarTaxa):', {
                        'contrato.simulacao.troco': contrato.simulacao.troco,
                        'contrato.troco': contrato.troco,
                        'formatBRNumber(contrato.troco)': formatBRNumber(contrato.troco)
                    });
                }
                
                console.log(`✅ Contrato ${contrato.contrato} simulado:`, contrato.simulacao.aprovado ? 'APROVADO' : 'REJEITADO');
                
            } catch (error) {
                console.error(`❌ Erro ao simular contrato ${contrato.contrato}:`, error);
                contrato.simulacao = {
                    aprovado: false,
                    motivo: 'Erro na simulação: ' + error.message,
                    banco: 'Nenhum',
                    troco: 0,
                    taxa: contrato.taxa_juros_mensal
                };
                contrato.troco = 0;
                contrato.aprovado = false;
            }
        }
    });
    
    // Salvar dados após simular todos
    salvarDadosEditados();
    
    // Atualizar interface após simulação
    console.log('🔄 Re-renderizando contratos após simulação...');
    renderizarContratos();
    console.log('✅ Contratos re-renderizados após simulação');
    
    console.log('✅ Todos os contratos foram simulados automaticamente');
}

// Função para sincronizar dados Kentro + Extrato no sistema Lunas
async function sincronizarDadosCliente(clientId, kentroId, dadosExtrato) {
    try {
        console.log(`🔄 Iniciando sincronização para cliente ${clientId} com Kentro ID ${kentroId}`);
        
        const response = await fetch('/api/sincronizar-dados-cliente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clientId: clientId,
                kentroId: kentroId,
                dadosExtrato: dadosExtrato
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Dados sincronizados com sucesso:', result.message);
            console.log('📋 Dados mesclados:', result.dadosCliente);
        } else {
            console.error('❌ Erro na sincronização:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Erro ao sincronizar dados:', error);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM carregado, iniciando carregamento de dados...');
    console.log('🔍 URL atual:', window.location.href);
    console.log('🔍 Parâmetros da URL:', window.location.search);
    
    try {
        await carregarDados();
        console.log('✅ Carregamento de dados concluído!');
    } catch (error) {
        console.error('❌ Erro no carregamento de dados:', error);
        console.error('❌ Stack trace:', error.stack);
    }
});

                        troco: 0,
                        taxa: contrato.taxa_juros_mensal
                    };
                    contrato.troco = 0;
                    contrato.aprovado = false;
                } else {
                    // Contrato aprovado
                    contrato.simulacao = {
                        aprovado: true,
                        banco: resultado.bancoNovo,
                        troco: toNumber(resultado.troco),
                        taxa: toNumber(resultado.taxa_calculada),
                        parcela: toNumber(resultado.parcela),
                        parcelasPagas: resultado.parcelas_pagas,
                        valorEmprestimo: toNumber(resultado.valor_emprestimo),
                        coeficiente: resultado.coeficiente_usado
                    };
                    contrato.troco = contrato.simulacao.troco;
                    contrato.aprovado = true;
                    
                    console.log('🔍 Verificação troco (selecionarTaxa):', {
                        'contrato.simulacao.troco': contrato.simulacao.troco,
                        'contrato.troco': contrato.troco,
                        'formatBRNumber(contrato.troco)': formatBRNumber(contrato.troco)
                    });
                }
                
                console.log(`✅ Contrato ${contrato.contrato} simulado:`, contrato.simulacao.aprovado ? 'APROVADO' : 'REJEITADO');
                
            } catch (error) {
                console.error(`❌ Erro ao simular contrato ${contrato.contrato}:`, error);
                contrato.simulacao = {
                    aprovado: false,
                    motivo: 'Erro na simulação: ' + error.message,
                    banco: 'Nenhum',
                    troco: 0,
                    taxa: contrato.taxa_juros_mensal
                };
                contrato.troco = 0;
                contrato.aprovado = false;
            }
        }
    });
    
    // Salvar dados após simular todos
    salvarDadosEditados();
    
    // Atualizar interface após simulação
    console.log('🔄 Re-renderizando contratos após simulação...');
    renderizarContratos();
    console.log('✅ Contratos re-renderizados após simulação');
    
    console.log('✅ Todos os contratos foram simulados automaticamente');
}

// Função para sincronizar dados Kentro + Extrato no sistema Lunas
async function sincronizarDadosCliente(clientId, kentroId, dadosExtrato) {
    try {
        console.log(`🔄 Iniciando sincronização para cliente ${clientId} com Kentro ID ${kentroId}`);
        
        const response = await fetch('/api/sincronizar-dados-cliente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clientId: clientId,
                kentroId: kentroId,
                dadosExtrato: dadosExtrato
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Dados sincronizados com sucesso:', result.message);
            console.log('📋 Dados mesclados:', result.dadosCliente);
        } else {
            console.error('❌ Erro na sincronização:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Erro ao sincronizar dados:', error);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM carregado, iniciando carregamento de dados...');
    console.log('🔍 URL atual:', window.location.href);
    console.log('🔍 Parâmetros da URL:', window.location.search);
    
    try {
        await carregarDados();
        console.log('✅ Carregamento de dados concluído!');
    } catch (error) {
        console.error('❌ Erro no carregamento de dados:', error);
        console.error('❌ Stack trace:', error.stack);
    }
});
