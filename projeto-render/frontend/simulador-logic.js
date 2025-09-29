let contratos = [];
let cliente = {};
let margens = {};
let contratosAtivos = [];
let contratosNaoAprovados = [];
let codigoExtrato = null; // Para identificar múltiplas simulações

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
    // Usar cálculo correto baseado no calculo (1).js
    const parcelaOriginal = parseFloat(contrato.valor_parcela || 0);
    const prazoRestante = calcularPrazoRestante(contrato.prazo_total || 0, contrato.parcelas_pagas || 0);
    let taxaAtualMes = toNumber(contrato.taxa_juros_mensal || 0);
    
    // Se não tem taxa, estimar pelo valor pago
    if (!(taxaAtualMes > 0) && contrato.valor_liberado && contrato.prazo_total) {
        taxaAtualMes = estimarTaxaPorValorPago(contrato.valor_liberado, contrato.prazo_total, parcelaOriginal);
    }
    
    // Se ainda não tem taxa, usar padrão
    if (!(taxaAtualMes > 0)) {
        taxaAtualMes = 1.85; // Taxa padrão
    }
    
    return pvFromParcela(parcelaOriginal, taxaAtualMes, prazoRestante);
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

function carregarSimulacaoPorId(extratoId) {
    const dadosSalvos = localStorage.getItem(`extratoData_${extratoId}`);
    if (dadosSalvos) {
        try {
            const dados = JSON.parse(dadosSalvos);
            codigoExtrato = dados.codigoExtrato || extratoId;
            contratos = dados.contratos || [];
            cliente = dados.cliente || {};
            margens = dados.margens || {};
            
            // Processar contratos
            contratos.forEach((contrato, index) => {
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
            
            atualizarDadosCliente();
            atualizarMargens();
            renderizarContratos();
            
            // Mostrar seções se há dados
            if (contratos.length > 0) {
                document.getElementById('clienteSection').style.display = 'block';
                document.getElementById('margensSection').style.display = 'block';
                document.getElementById('contratosAtivosSection').style.display = 'block';
                document.getElementById('contratosNaoAprovadosSection').style.display = 'block';
                document.getElementById('resumoSection').style.display = 'block';
            }
            
            // Mostrar link único
            mostrarLinkUnico();
            
        } catch (error) {
            console.error('Erro ao carregar simulação:', error);
            alert('Erro ao carregar simulação específica');
        }
    } else {
        alert('Simulação não encontrada');
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
                    <span class="contrato-info">Contrato ${contrato.contrato} - ${contrato.banco.nome} (${contrato.banco.codigo})</span>
                    <button class="expand-btn" onclick="toggleDetalhes(${contrato.id})">▶</button>
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
                    <span class="contrato-info">Contrato ${contrato.contrato} - ${contrato.banco.nome} (${contrato.banco.codigo})</span>
                    <button class="expand-btn" onclick="toggleDetalhes(${contrato.id})">▶</button>
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
    const btn = event.target;
    
    if (detalhes.classList.contains('expanded')) {
        detalhes.classList.remove('expanded');
        btn.classList.remove('expanded');
        btn.textContent = '▶';
    } else {
        detalhes.classList.add('expanded');
        btn.classList.add('expanded');
        btn.textContent = '▼';
    }
}

function simularContrato(contratoId) {
    const contrato = contratos.find(c => c.id === contratoId);
    if (!contrato) return;

    console.log('🔄 Iniciando simulação local para contrato:', contrato.contrato);

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
            const resultado = calcularParaContrato(contrato, "15");
            
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
                <span class="banco-nome">🏦 Banco: ${banco}</span>
                <div class="banco-valores">
                    <span class="banco-parcela">Parcela: R$ ${formatBRNumber(valores.parcela)}</span>
                    <span class="banco-troco">Troco: R$ ${formatBRNumber(valores.troco)}</span>
                </div>
            </div>
        `)
        .join('');
    
    const resumoContent = `
        <div class="resumo-totals">
            <div class="resumo-bancos">
                ${bancosHtml}
                <div style="margin-top: 1rem; padding: 0.8rem; background: #f8fafc; border-radius: 6px; text-align: center;">
                    <div style="font-weight: 600; color: #1e293b; margin-bottom: 0.5rem;">
                        📊 CONTRATOS: ${contratosAprovados.length} | 💰 TROCO: R$ ${formatBRNumber(totalTroco)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('bancosResumo').innerHTML = resumoContent;
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
    document.getElementById('clienteNome').textContent = cliente.nome || '-';
    document.getElementById('clienteNB').textContent = cliente.nb || '-';
    document.getElementById('clienteEspecie').textContent = formatarEspecie(cliente.especie);
    document.getElementById('clienteOrigem').textContent = cliente.origem || '-';
    document.getElementById('clienteData').textContent = cliente.dataExtrato || '-';
}

function atualizarMargens() {
    document.getElementById('margemDisponivel').textContent = `R$ ${formatBRNumber(margens.disponivel || 0)}`;
    document.getElementById('margemExtrapolada').textContent = `R$ ${formatBRNumber(margens.extrapolada || 0)}`;
    document.getElementById('margemRMC').textContent = `R$ ${formatBRNumber(margens.rmc || 0)}`;
    document.getElementById('margemRCC').textContent = `R$ ${formatBRNumber(margens.rcc || 0)}`;
}

function carregarDados() {
    // Verificar se há código de extrato na URL
    const urlParams = new URLSearchParams(window.location.search);
    const extratoId = urlParams.get('extrato');
    
    if (extratoId) {
        // Carregar simulação específica
        carregarSimulacaoPorId(extratoId);
        return;
    }
    
    const dadosSalvos = localStorage.getItem('extratoData');
    if (dadosSalvos) {
        try {
            const dados = JSON.parse(dadosSalvos);
            contratos = dados.contratos || [];
            cliente = dados.cliente || {};
            margens = dados.margens || {};
            
            // Gerar código único do extrato se não existir
            if (!codigoExtrato) {
                codigoExtrato = `extrato_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            // Adicionar IDs únicos aos contratos se não existirem
            contratos.forEach((contrato, index) => {
                if (!contrato.id) {
                    contrato.id = index + 1;
                }
                if (contrato.selecionado === undefined) {
                    contrato.selecionado = true;
                }
                // Inicializar campos de simulação
                contrato.simulacao = null;
                contrato.troco = 0;
                contrato.aprovado = false;
                contrato.editando = false;
                
                // Garantir que valores estão preenchidos corretamente
                if (!contrato.valor_parcela) {
                    contrato.valor_parcela = parseFloat(contrato.valor_parcela || 0);
                }
                if (!contrato.taxa_juros_mensal) {
                    contrato.taxa_juros_mensal = toNumber(contrato.taxa_juros_mensal || 0);
                }
            });
            
            atualizarDadosCliente();
            atualizarMargens();
            renderizarContratos();
            
            // Mostrar seções se há dados
            if (contratos.length > 0) {
                document.getElementById('clienteSection').style.display = 'block';
                document.getElementById('margensSection').style.display = 'block';
                document.getElementById('contratosAtivosSection').style.display = 'block';
                document.getElementById('contratosNaoAprovadosSection').style.display = 'block';
                document.getElementById('resumoSection').style.display = 'block';
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    }
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
    renderizarContratos();
    
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
        localStorage.removeItem('extratoData');
        contratos = [];
        contratosAtivos = [];
        contratosNaoAprovados = [];
        cliente = {};
        margens = {};
        
        // Ocultar seções
        document.getElementById('clienteSection').style.display = 'none';
        document.getElementById('margensSection').style.display = 'none';
        document.getElementById('contratosAtivosSection').style.display = 'none';
        document.getElementById('contratosNaoAprovadosSection').style.display = 'none';
        document.getElementById('resumoSection').style.display = 'none';
        
        // Limpar renderização
        renderizarContratos();
        
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
function calcularParaContrato(contrato, diaAverbacao = "15") {
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

    // Bancos de simulação
    const bancosParaSimular = bancosPermitidosPorEspecie(contrato.especie);
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
function abrirDigitar() {
    alert('Função de digitar será implementada em breve!');
}

function abrirUploadExtrato() {
    // Redirecionar para a página principal onde está o upload
    window.location.href = '/';
}

// Função para simular todos os contratos automaticamente
function simularTodosContratos() {
    console.log('🔄 Simulando todos os contratos automaticamente...');
    
    contratos.forEach(contrato => {
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
                const resultado = calcularParaContrato(contrato, "15");
                
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
    
    console.log('✅ Todos os contratos foram simulados automaticamente');
}

// Inicialização
carregarDados();
