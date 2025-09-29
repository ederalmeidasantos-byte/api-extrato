// ===== JAVASCRIPT OTIMIZADO PARA PAINEL FGTS =====

// Variáveis globais otimizadas
let socket;
let resultados = [];
let isProcessing = false;

// Elementos DOM (cache)
const elements = {
    totalCPFs: null,
    processedCPFs: null,
    successCPFs: null,
    pendingCPFs: null,
    countSuccess: null,
    countPending: null,
    countNoAuth: null,
    countDiscarded: null,
    countScheduled: null,
    valorTotalSuccess: null,
    progressBar: null,
    progressText: null,
    successTable: null,
    pendingTable: null,
    noAuthTable: null,
    discardedTable: null,
    scheduledTable: null,
    logs: null,
    btnPause: null,
    btnResume: null,
    btnCancel: null,
    btnAtualizar: null
};

// Inicialização otimizada
function init() {
    cacheElements();
    setupSocket();
    setupEventListeners();
    carregarDadosIniciais();
}

// Cache de elementos DOM para melhor performance
function cacheElements() {
    elements.totalCPFs = document.getElementById('totalCPFs');
    elements.processedCPFs = document.getElementById('processedCPFs');
    elements.successCPFs = document.getElementById('successCPFs');
    elements.pendingCPFs = document.getElementById('pendingCPFs');
    elements.countSuccess = document.getElementById('countSuccess');
    elements.countPending = document.getElementById('countPending');
    elements.countNoAuth = document.getElementById('countNoAuth');
    elements.countDiscarded = document.getElementById('countDiscarded');
    elements.countScheduled = document.getElementById('countScheduled');
    elements.valorTotalSuccess = document.getElementById('valorTotalSuccess');
    elements.progressBar = document.getElementById('progressBar');
    elements.progressText = document.getElementById('progressText');
    elements.successTable = document.getElementById('successTable');
    elements.pendingTable = document.getElementById('pendingTable');
    elements.noAuthTable = document.getElementById('noAuthTable');
    elements.discardedTable = document.getElementById('discardedTable');
    elements.scheduledTable = document.getElementById('scheduledTable');
    elements.logs = document.getElementById('logs');
    elements.btnPause = document.getElementById('btnPause');
    elements.btnResume = document.getElementById('btnResume');
    elements.btnCancel = document.getElementById('btnCancel');
    elements.btnAtualizar = document.getElementById('btnAtualizar');
}

// Setup Socket.IO otimizado
function setupSocket() {
    socket = io();
    
    // Eventos essenciais apenas
    socket.on('connect', () => {
        adicionarLog('🔌 Conectado ao servidor', 'info');
    });
    
    socket.on('disconnect', () => {
        adicionarLog('❌ Desconectado do servidor', 'error');
    });
    
    socket.on('log', (data) => {
        adicionarLog(data.message, data.type || 'info');
    });
    
    socket.on('resultado', (data) => {
        adicionarResultado(data);
    });
    
    socket.on('progress', (data) => {
        atualizarProgresso(data);
    });
    
    socket.on('totalCPFs', (total) => {
        if (elements.totalCPFs) {
            elements.totalCPFs.textContent = total;
        }
        habilitarControles(true);
    });
    
    socket.on('contadoresTempoReal', (contadores) => {
        atualizarContadores(contadores);
    });
}

// Event listeners otimizados
function setupEventListeners() {
    // Upload de arquivo
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    
    if (fileInput && fileLabel) {
        fileLabel.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // Botões de controle
    const btnIniciar = document.getElementById('btnIniciar');
    const btnLimpar = document.getElementById('btnLimpar');
    const btnAtualizarDelay = document.getElementById('btnAtualizarDelay');
    
    if (btnIniciar) btnIniciar.addEventListener('click', iniciarProcessamento);
    if (btnLimpar) btnLimpar.addEventListener('click', limparTudo);
    if (btnAtualizarDelay) btnAtualizarDelay.addEventListener('click', atualizarDelay);
    
    // Controles de processamento
    if (elements.btnPause) elements.btnPause.addEventListener('click', pausarProcessamento);
    if (elements.btnResume) elements.btnResume.addEventListener('click', retomarProcessamento);
    if (elements.btnCancel) elements.btnCancel.addEventListener('click', cancelarProcessamento);
    if (elements.btnAtualizar) elements.btnAtualizar.addEventListener('click', atualizarFrontend);
}

// Carregar dados iniciais
async function carregarDadosIniciais() {
    try {
        await carregarListasDoCache();
        await carregarContadoresTempoReal();
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
    }
}

// Upload de arquivo otimizado
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        adicionarLog('📤 Enviando arquivo...', 'info');
        const response = await fetch('/fgts/run', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            adicionarLog('✅ Arquivo processado com sucesso', 'success');
        } else {
            adicionarLog(`❌ Erro: ${data.message}`, 'error');
        }
    } catch (error) {
        adicionarLog(`❌ Erro no upload: ${error.message}`, 'error');
    }
}

// Iniciar processamento
async function iniciarProcessamento() {
    try {
        const response = await fetch('/fgts/iniciar', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            adicionarLog('🚀 Processamento iniciado', 'success');
            habilitarControles(true);
        } else {
            adicionarLog(`❌ Erro: ${data.message}`, 'error');
        }
    } catch (error) {
        adicionarLog(`❌ Erro: ${error.message}`, 'error');
    }
}

// Pausar processamento
async function pausarProcessamento() {
    try {
        const response = await fetch('/fgts/pause', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            adicionarLog('⏸️ Processamento pausado', 'warning');
            isProcessing = false;
        }
    } catch (error) {
        adicionarLog(`❌ Erro: ${error.message}`, 'error');
    }
}

// Retomar processamento
async function retomarProcessamento() {
    try {
        const response = await fetch('/fgts/resume', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            adicionarLog('▶️ Processamento retomado', 'success');
            isProcessing = true;
        }
    } catch (error) {
        adicionarLog(`❌ Erro: ${error.message}`, 'error');
    }
}

// Cancelar processamento
async function cancelarProcessamento() {
    try {
        const response = await fetch('/fgts/cancelar', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            adicionarLog('🛑 Processamento cancelado', 'warning');
            isProcessing = false;
            habilitarControles(false);
        }
    } catch (error) {
        adicionarLog(`❌ Erro: ${error.message}`, 'error');
    }
}

// Atualizar delay
async function atualizarDelay() {
    const delayInput = document.getElementById('delayInput');
    const delay = delayInput ? delayInput.value : 1000;
    
    try {
        const response = await fetch('/fgts/delay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delay: parseInt(delay) })
        });
        
        const data = await response.json();
        if (data.success) {
            adicionarLog(`⏱️ Delay atualizado para ${delay}ms`, 'info');
        }
    } catch (error) {
        adicionarLog(`❌ Erro: ${error.message}`, 'error');
    }
}

// Atualizar frontend
async function atualizarFrontend() {
    try {
        const response = await fetch('/fgts/atualizar-frontend', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            adicionarLog('🔄 Frontend atualizado', 'info');
        }
    } catch (error) {
        adicionarLog(`❌ Erro: ${error.message}`, 'error');
    }
}

// Limpar tudo
async function limparTudo() {
    if (!confirm('Tem certeza que deseja limpar todos os dados?')) return;
    
    try {
        const response = await fetch('/fgts/limpar', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            adicionarLog('🧹 Dados limpos', 'info');
            limparTabelas();
            resetarContadores();
        }
    } catch (error) {
        adicionarLog(`❌ Erro: ${error.message}`, 'error');
    }
}

// Carregar listas do cache (otimizado)
async function carregarListasDoCache() {
    try {
        const response = await fetch('/fgts/listas');
        const data = await response.json();
        
        if (data.success && data.listas) {
            const listas = data.listas;
            
            // Carregar dados sem incrementar contadores
            carregarDadosTabela(listas.sucessos, 'success');
            carregarDadosTabela(listas.pendentes, 'pending');
            carregarDadosTabela(listas.naoAutorizados, 'no_auth');
            carregarDadosTabela(listas.descartados, 'descartado');
            carregarDadosTabela(listas.agendados, 'agendado');
            
            // Definir contadores corretos
            if (elements.countSuccess) elements.countSuccess.textContent = listas.sucessos.length;
            if (elements.countPending) elements.countPending.textContent = listas.pendentes.length;
            if (elements.countNoAuth) elements.countNoAuth.textContent = listas.naoAutorizados.length;
            if (elements.countDiscarded) elements.countDiscarded.textContent = listas.descartados.length;
            
            adicionarLog(`📋 Dados carregados: ${listas.sucessos.length} sucessos, ${listas.pendentes.length} pendentes`, 'info');
        }
    } catch (error) {
        console.error('Erro ao carregar listas:', error);
    }
}

// Carregar dados da tabela (otimizado)
function carregarDadosTabela(dados, tipo) {
    if (!dados || !Array.isArray(dados)) return;
    
    const tabela = getTabelaPorTipo(tipo);
    if (!tabela) return;
    
    // Usar DocumentFragment para melhor performance
    const fragment = document.createDocumentFragment();
    
    dados.forEach(item => {
        const row = criarLinhaTabela(item, tipo);
        if (row) fragment.appendChild(row);
    });
    
    tabela.appendChild(fragment);
}

// Obter tabela por tipo
function getTabelaPorTipo(tipo) {
    switch (tipo) {
        case 'success': return elements.successTable;
        case 'pending': return elements.pendingTable;
        case 'no_auth': return elements.noAuthTable;
        case 'descartado': return elements.discardedTable;
        case 'agendado': return elements.scheduledTable;
        default: return null;
    }
}

// Criar linha da tabela (otimizado)
function criarLinhaTabela(item, tipo) {
    const row = document.createElement('tr');
    const valorFormatado = parseFloat(item.valor || 0).toFixed(2);
    
    if (tipo === 'success') {
        row.innerHTML = `
            <td class="col-linha">${item.linha || '?'}</td>
            <td class="col-cpf">${item.cpf}</td>
            <td class="col-id">${item.id || 'N/A'}</td>
            <td class="col-valor">R$ ${valorFormatado.replace('.', ',')}</td>
            <td class="col-provider">${item.provider || 'N/A'}</td>
            <td class="col-status"><span class="status-badge status-success">Sucesso</span></td>
        `;
    } else {
        const statusText = getStatusText(tipo);
        const statusClass = getStatusClass(tipo);
        
        row.innerHTML = `
            <td class="col-linha">${item.linha || '?'}</td>
            <td class="col-cpf">${item.cpf}</td>
            <td class="col-id">${item.id || 'N/A'}</td>
            <td class="col-status"><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td class="col-provider">${item.provider || 'N/A'}</td>
        `;
    }
    
    return row;
}

// Obter texto do status
function getStatusText(tipo) {
    const statusMap = {
        'pending': 'Pendente',
        'no_auth': 'Não Autorizado',
        'descartado': 'Descartado',
        'agendado': 'Agendado'
    };
    return statusMap[tipo] || tipo;
}

// Obter classe do status
function getStatusClass(tipo) {
    const classMap = {
        'pending': 'status-pending',
        'no_auth': 'status-no-auth',
        'descartado': 'status-discarded',
        'agendado': 'status-pending'
    };
    return classMap[tipo] || 'status-pending';
}

// Carregar contadores em tempo real
async function carregarContadoresTempoReal() {
    try {
        const response = await fetch('/fgts/contadores-tempo-real');
        const data = await response.json();
        
        if (data.success && data.contadores) {
            atualizarContadores(data.contadores);
        }
    } catch (error) {
        console.error('Erro ao carregar contadores:', error);
    }
}

// Atualizar contadores (otimizado)
function atualizarContadores(contadores) {
    if (elements.totalCPFs) elements.totalCPFs.textContent = contadores.totalCPFs || 0;
    if (elements.processedCPFs) elements.processedCPFs.textContent = contadores.processados || 0;
    if (elements.successCPFs) elements.successCPFs.textContent = contadores.sucessos || 0;
    if (elements.pendingCPFs) elements.pendingCPFs.textContent = contadores.pendentes || 0;
    if (elements.countSuccess) elements.countSuccess.textContent = contadores.sucessos || 0;
    if (elements.countPending) elements.countPending.textContent = contadores.pendentes || 0;
    if (elements.countNoAuth) elements.countNoAuth.textContent = contadores.naoAutorizados || 0;
    if (elements.countDiscarded) elements.countDiscarded.textContent = contadores.descartados || 0;
    
    // Atualizar progresso
    if (contadores.totalCPFs > 0) {
        const pct = Math.round((contadores.processados / contadores.totalCPFs) * 100);
        atualizarProgresso({ percentual: pct, processados: contadores.processados, total: contadores.totalCPFs });
    }
}

// Atualizar progresso (otimizado)
function atualizarProgresso(data) {
    if (elements.progressBar && data.percentual !== undefined) {
        elements.progressBar.style.width = `${data.percentual}%`;
    }
    
    if (elements.progressText && data.processados !== undefined && data.total !== undefined) {
        elements.progressText.textContent = `${data.percentual || 0}% - ${data.processados}/${data.total} CPFs processados`;
    }
}

// Adicionar resultado (otimizado)
function adicionarResultado(data) {
    const tabela = getTabelaPorTipo(data.status);
    if (!tabela) return;
    
    const row = criarLinhaTabela(data, data.status);
    if (row) {
        tabela.appendChild(row);
        atualizarContador(data.status);
    }
}

// Atualizar contador individual
function atualizarContador(tipo) {
    const contador = elements[`count${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`];
    if (contador) {
        const current = parseInt(contador.textContent) || 0;
        contador.textContent = current + 1;
    }
}

// Habilitar/desabilitar controles
function habilitarControles(habilitar) {
    if (elements.btnPause) elements.btnPause.disabled = !habilitar;
    if (elements.btnResume) elements.btnResume.disabled = !habilitar;
    if (elements.btnCancel) elements.btnCancel.disabled = !habilitar;
}

// Cache para otimizar performance dos logs
let logCount = 0;
const MAX_LOGS = 50; // Reduzido para melhor performance

// Adicionar log (otimizado)
function adicionarLog(mensagem, tipo = 'info') {
    if (!elements.logs) return;
    
    // Usar requestAnimationFrame para melhor performance
    requestAnimationFrame(() => {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${tipo}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${mensagem}`;
        
        elements.logs.appendChild(logEntry);
        logCount++;
        
        // Limitar logs de forma mais eficiente
        if (logCount > MAX_LOGS) {
            const firstLog = elements.logs.querySelector('.log-entry');
            if (firstLog) {
                firstLog.remove();
                logCount--;
            }
        }
        
        // Scroll apenas se necessário
        if (elements.logs.scrollTop + elements.logs.clientHeight >= elements.logs.scrollHeight - 10) {
            elements.logs.scrollTop = elements.logs.scrollHeight;
        }
    });
}

// Limpar tabelas
function limparTabelas() {
    const tabelas = [elements.successTable, elements.pendingTable, elements.noAuthTable, elements.discardedTable, elements.scheduledTable];
    tabelas.forEach(tabela => {
        if (tabela) {
            const tbody = tabela.querySelector('tbody');
            if (tbody) tbody.innerHTML = '';
        }
    });
}

// Resetar contadores
function resetarContadores() {
    const contadores = [elements.countSuccess, elements.countPending, elements.countNoAuth, elements.countDiscarded, elements.countScheduled];
    contadores.forEach(contador => {
        if (contador) contador.textContent = '0';
    });
    
    if (elements.totalCPFs) elements.totalCPFs.textContent = '0';
    if (elements.processedCPFs) elements.processedCPFs.textContent = '0';
    if (elements.successCPFs) elements.successCPFs.textContent = '0';
    if (elements.pendingCPFs) elements.pendingCPFs.textContent = '0';
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
