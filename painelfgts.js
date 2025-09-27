// painelfgts.js
const socket = io();

// Elementos do DOM
const logs = document.getElementById('logs');
const fileNameSpan = document.getElementById('fileName');
const totalCPFsSpan = document.getElementById('totalCPFs');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const tables = {
  success: document.querySelector('#tableSuccess tbody'),
  pending: document.querySelector('#tablePending tbody'),
  no_auth: document.querySelector('#tableNoAuth tbody'),
  ready: document.querySelector('#tableReadyCSV tbody')
};

const counts = {
  success: document.getElementById('countSuccess'),
  pending: document.getElementById('countPending'),
  noAuth: document.getElementById('countNoAuth'),
  ready: document.getElementById('countReadyCSV')
};

// Variáveis de controle
let pendentes = [], naoAutorizados = [], readyForCSV = [];
let totals = { success: 0, pending: 0, noAuth: 0, ready: 0 };
let totalToProcess = 0, processedCount = 0;

// Funções auxiliares
function atualizarContadores() {
  counts.success.textContent = totals.success;
  counts.pending.textContent = totals.pending;
  counts.noAuth.textContent = totals.noAuth;
  counts.ready.textContent = totals.ready;
}

function setProgress(pct, processed = 0, total = 0){
  progressBar.style.width = pct + '%';
  progressText.textContent = `${pct}% (${processed}/${total})`;
}

// Socket.IO events
socket.on('totalCPFs', total => {
  totalCPFsSpan.textContent = total;
  totalToProcess = total;
  processedCount = 0;
  setProgress(0,0,totalToProcess);
  logs.textContent += `📄 Total de CPFs lidos: ${total}\n`;
  logs.scrollTop = logs.scrollHeight;
});

socket.on('progress', pct => {
  if(totalToProcess){
    processedCount = Math.round((pct/100)*totalToProcess);
    setProgress(pct, processedCount, totalToProcess);
  }
});

socket.on('resultadoCPF', data => {
  const tr = document.createElement('tr');
  let valorExibido = data.valorLiberado || '-';
  tr.innerHTML = `<td>${data.cpf}</td><td>${data.id||''}</td><td>${valorExibido}</td><td>${data.provider||'-'}</td>`;
  tr.className = data.status==='no_auth'?'no_auth':data.status==='ready_for_manual'?'ready_for_manual':'success';

  switch(data.status){
    case 'success':
      tables.success.appendChild(tr); totals.success++; break;
    case 'pending':
      tables.pending.appendChild(tr); totals.pending++; pendentes.push(data); break;
    case 'no_auth':
      tables.no_auth.appendChild(tr); totals.noAuth++; naoAutorizados.push(data); break;
    case 'ready_for_manual':
      tables.ready.appendChild(tr); totals.ready++; readyForCSV.push(data); break;
  }

  processedCount++;
  const pct = totalToProcess ? Math.round((processedCount/totalToProcess)*100) : 0;
  setProgress(pct, processedCount, totalToProcess);
  atualizarContadores();
  logs.textContent += `[CPF ${data.cpf}] Status: ${data.status} | Valor: ${valorExibido}\n`;
  logs.scrollTop = logs.scrollHeight;
});

// Eventos do input de arquivo
document.getElementById('csvfile').addEventListener('change', e => {
  fileNameSpan.textContent = e.target.files.length ? e.target.files[0].name : "Nenhum arquivo selecionado";
});

// Botão iniciar
document.getElementById('runBtn').addEventListener('click', async ()=> {
  const f = document.getElementById('csvfile').files[0];
  if(!f) return alert("Escolha um CSV");

  const fd = new FormData();
  fd.append('csvfile', f);

  try {
    const res = await fetch('/fgts/run',{ method:'POST', body:fd });
    const json = await res.json();
    logs.textContent += '[CLIENT] ' + (json.message||JSON.stringify(json)) + '\n';
    logs.scrollTop = logs.scrollHeight;
  } catch(err){ alert("Erro ao enviar CSV: "+err.message); }
});

// Botão limpar
document.getElementById('btnLimpar').addEventListener('click', ()=> {
  if(!confirm("Deseja limpar todas as listas e logs?")) return;
  Object.values(tables).forEach(t => t.innerHTML='');
  logs.textContent='';
  pendentes=[]; naoAutorizados=[]; readyForCSV=[];
  totals={ success:0,pending:0,noAuth:0,ready:0 };
  totalToProcess=0; processedCount=0;
  setProgress(0,0,0);
  atualizarContadores();
});

// Botão exportar CSV
document.getElementById('btnExportCSV').addEventListener('click', ()=> {
  if(!readyForCSV.length){ alert("Não há dados prontos para CSV"); return; }
  const header=["CPF","ID","Valor","Provider"];
  const csvContent=[header.join(',')].concat(readyForCSV.map(r=>[r.cpf,r.id,r.valorLiberado,r.provider].join(','))).join('\n');
  const blob = new Blob([csvContent],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url;
  a.download=`prontos_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Botão pausar
document.getElementById('btnPause').addEventListener('click', async ()=> {
  await fetch('/fgts/pause', { method:'POST' });
  logs.textContent += '⏸️ Processamento pausado pelo usuário\n';
  logs.scrollTop = logs.scrollHeight;
});

// Botão retomar
document.getElementById('btnResume').addEventListener('click', async ()=> {
  await fetch('/fgts/resume', { method:'POST' });
  logs.textContent += '▶️ Processamento retomado pelo usuário\n';
  logs.scrollTop = logs.scrollHeight;
});
