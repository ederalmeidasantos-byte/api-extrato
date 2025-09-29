let contratos = [];
let cliente = {};
let margens = {};
let contratosAtivos = [];
let contratosNaoAprovados = [];
let codigoExtrato = null; // Para identificar múltiplas simulações

function formatBRNumber(n) {
    return Number(n).toLocaleString("pt-BR", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
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

function calcularPrazoRestante(prazoTotal, parcelasPagas) {
    return Math.max(0, prazoTotal - parcelasPagas);
}

function calcularSaldoDevedor(contrato) {
    // Cálculo básico: Valor do contrato - (parcelas pagas * valor parcela)
    const valorContrato = parseFloat(contrato.valor_liberado || 0);
    const parcelasPagas = parseFloat(contrato.parcelas_pagas || 0);
    const valorParcela = parseFloat(contrato.valor_parcela || 0);
    
    return Math.max(0, valorContrato - (parcelasPagas * valorParcela));
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
        btn.innerHTML = contrato.editando ? '🔒 Bloquear' : '✏️ Editar';
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
                    contrato.taxa_juros_mensal = parseFloat(contrato.taxa_juros_mensal || 0);
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
                </div>
                <div class="contrato-actions">
                    <span class="troco-value">💰 R$ ${formatBRNumber(contrato.troco || 0)}</span>
                    <button class="btn btn-primary" onclick="simularContrato(${contrato.id})">
                        🔄 Simular
                    </button>
                </div>
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
                                ${contrato.editando ? '🔒 Bloquear' : '✏️ Editar'}
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
                            <input type="text" class="detail-input" value="${contrato.taxa_juros_mensal || ''}" 
                                   ${contrato.editando ? '' : 'disabled'}
                                   onchange="atualizarContrato(${contrato.id}, 'taxa_juros_mensal', this.value)"
                                   onfocus="this.select()"
                                   placeholder="Ex: 1,85">
                        </div>
                    </div>
                    
                    <div class="detail-group">
                        <div class="detail-group-title">🧮 CÁLCULOS AUTOMÁTICOS</div>
                        <div class="detail-item">
                            <span class="detail-label">CET Mensal</span>
                            <span class="detail-value">${contrato.cet_mensal || '-'}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">CET Anual</span>
                            <span class="detail-value">${contrato.cet_anual || '-'}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Taxa Anual</span>
                            <span class="detail-value">${contrato.taxa_juros_anual || '-'}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">IOF</span>
                            <span class="detail-value">R$ ${formatBRNumber(contrato.iof || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Valor Pago</span>
                            <span class="detail-value">R$ ${formatBRNumber(contrato.valor_pago || 0)}</span>
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
                                <span class="simulacao-value">R$ ${formatBRNumber(contrato.simulacao.parcela || 0)}</span>
                            </div>
                            <div class="simulacao-item">
                                <span class="simulacao-label">Troco</span>
                                <span class="simulacao-value">R$ ${formatBRNumber(contrato.simulacao.troco || 0)}</span>
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

    // Simular automaticamente taxa e saldo se estiverem em branco
    if (!contrato.taxa_juros_mensal || contrato.taxa_juros_mensal === 0) {
        contrato.taxa_juros_mensal = 1.85; // Taxa padrão
    }
    if (!contrato.saldo_devedor || contrato.saldo_devedor === 0) {
        contrato.saldo_devedor = calcularSaldoDevedor(contrato);
    }

    // Simular loading
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading"></span> Simulando...';
    btn.disabled = true;

    // Preparar dados para simulação
    const contratoSimulacao = {
        contrato: contrato.contrato,
        bancoCodigo: contrato.banco.codigo,
        taxa: contrato.taxa_juros_mensal,
        saldo: contrato.saldo_devedor,
        parcela: contrato.valor_parcela,
        prazo: contrato.prazo_total,
        pagas: contrato.parcelas_pagas
    };

    // Simular com API
    fetch('/api/simular-troco', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contratos: [contratoSimulacao],
            especie: cliente.especie,
            diaAverbacao: "15"
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Resposta da API:', data);
        
        if (data.status === 'success' && data.dados && data.dados.contratos && data.dados.contratos.length > 0) {
            const resultado = data.dados.contratos[0].simulacao[0];
            contrato.simulacao = resultado;
            contrato.troco = resultado.troco || 0;
            
            // Se aprovado, mover para ativos
            if (resultado.aprovado) {
                contrato.aprovado = true;
            }
            
            // Salvar dados com código do extrato
            salvarDadosEditados(contratoId);
            
            renderizarContratos();
        } else {
            console.error('Erro na resposta:', data);
            alert('Erro na simulação: ' + (data.message || 'Resposta inválida da API'));
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('Erro de conexão na simulação: ' + error.message);
    })
    .finally(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
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
            // Remove pontos e substitui vírgula por ponto
            const valorLimpo = valor.toString().replace(/\./g, '').replace(',', '.');
            valorNumerico = parseFloat(valorLimpo) || 0;
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

    document.getElementById('totalTroco').textContent = `R$ ${formatBRNumber(totalTroco)}`;
    
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
            <div class="resumo-total">R$ ${formatBRNumber(totalTroco)}</div>
            <div class="resumo-bancos">
                ${bancosHtml}
                <div style="margin-top: 1rem; padding: 0.8rem; background: #f8fafc; border-radius: 6px; text-align: center;">
                    <div style="font-weight: 600; color: #1e293b; margin-bottom: 0.5rem;">
                        📊 TOTAL DE CONTRATOS: ${contratosAprovados.length} | 💰 TOTAL DE TROCO: R$ ${formatBRNumber(totalTroco)}
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
        c.troco = 0;
        c.aprovado = false;
        c.selecionado = true;
    });
    renderizarContratos();
}

function atualizarDadosCliente() {
    document.getElementById('clienteNome').textContent = cliente.nome || '-';
    document.getElementById('clienteNB').textContent = cliente.nb || '-';
    document.getElementById('clienteEspecie').textContent = cliente.especie || '-';
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
                    contrato.taxa_juros_mensal = parseFloat(contrato.taxa_juros_mensal || 0);
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
        contrato.taxa_juros_mensal = parseFloat(contrato.taxa_juros_mensal || 0);
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

// Inicialização
carregarDados();
