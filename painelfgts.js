// panel.js
// 🔹 Painel FGTS - Atualiza logs, progress e tabelas
const logs = document.getElementById('logs');
const totalCPFsSpan = document.getElementById('totalCPFs');

const tables = {
  success: document.querySelector('#tableSuccess tbody'),
  pending: document.querySelector('#tablePending tbody'),
  noAuth: document.querySelector('#tableNoAuth tbody'),
  ready: document.querySelector('#tableReadyCSV tbody')
};

const counts = {
  success: document.getElementById('countSuccess'),
  pending: document.getElementById('countPending'),
  noAuth: document.getElementById('countNoAuth'),
  ready: document.getElementById('countReadyCSV')
};

let totals = { success: 0, pending: 0, noAuth: 0, ready: 0 };
let totalToProcess = 0, processedCount = 0;

const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

// 🔹 Funções auxiliares
function setProgress(pct, processed, total){
  progressBar.style.width = pct + '%';
  progressText.textContent = `${pct}% (${processed}/${total})`;
}

function atualizarContadores() {
  counts.success.textContent = totals.success;
  counts.pending.textContent = totals.pending;
  counts.noAuth.textContent = totals.noAuth;
  counts.ready.textContent = totals.ready;
}

function adicionarResultado(data){
  if(data && data.status==='progress'){
    processedCount = data.processed || processedCount;
    totalToProcess = data.total || totalToProcess;
    const pct = Math.round((processedCount/totalToProcess)*100);
    setProgress(pct, processedCount, totalToProcess);
    return;
  }

  const tr = document.createElement('tr');
  let valorExibido='-';
  if(data.status==='success') valorExibido=data.valorLiberado||'-';
  else if(data.status==='pending') valorExibido=data.motivo||'Aguardando retorno';
  else if(data.status==='no_auth') valorExibido=data.valorLiberado||'-';
  else if(data.status==='ready_for_manual') valorExibido=data.valorLiberado||'-';
  
  tr.innerHTML = `<td>${data.cpf}</td><td>${data.telefone||data.id||''}</td><td>${valorExibido}</td><td>${data.provider||'-'}</td>`;
  tr.className = data.status==='ready_for_manual'?'ready_for_manual':data.status;

  switch(data.status){
    case 'success':
      tables.success.appendChild(tr); 
      totals.success++;
      break;
    case 'pending':
      tables.pending.appendChild(tr); 
      totals.pending++;
      break;
    case 'no_auth':
      tables.noAuth.appendChild(tr); 
      totals.noAuth++;
      break;
    case 'ready_for_manual':
      tables.ready.appendChild(tr); 
      totals.ready++;
      break;
  }

  processedCount++;
  if(totalToProcess){
    const pct = Math.round((processedCount/totalToProcess)*100);
    setProgress(pct, processedCount, totalToProcess);
  }

  atualizarContadores();
}

// 🔹 Socket.IO
const socket = io();

// Logs
socket.on('log', msg => {
  logs.textContent += msg + '\n';
  logs.scrollTop = logs.scrollHeight;
});

// Resultado individual
socket.on('resultadoCPF', data => {
  adicionarResultado(data);
});

// Total de CPFs
socket.on('totalCPFs', total => {
  totalCPFsSpan.textContent = total;
  totalToProcess = total;
  processedCount = 0;
  setProgress(0,0,totalToProcess);
  logs.textContent += `📄 Total de CPFs lidos: ${total}\n`;
  logs.scrollTop = logs.scrollHeight;
});

// Progresso geral
socket.on('progress', data => {
  if(data && typeof data.done !== 'undefined' && typeof data.total !== 'undefined'){
    processedCount = data.done;
    totalToProcess = data.total;
    const pct = Math.round((processedCount/totalToProcess)*100);
    setProgress(pct, processedCount, totalToProcess);
  }
});
