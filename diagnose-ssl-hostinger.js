#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

// Configurações da API Hostinger
const HOSTINGER_API_BASE = 'https://developers.hostinger.com';
const API_TOKEN = 'YOUR_HOSTINGER_API_TOKEN'; // Substitua pelo token real

// Configuração do cliente axios
const hostingerClient = axios.create({
  baseURL: HOSTINGER_API_BASE,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function getVirtualMachines() {
  try {
    console.log('🔍 Buscando VPS disponíveis...');
    const response = await hostingerClient.get('/api/vps/v1/virtual-machines');
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao buscar VPS:', error.response?.data || error.message);
    throw error;
  }
}

async function getDockerProjects(vmId) {
  try {
    console.log(`🐳 Buscando projetos Docker no VPS ${vmId}...`);
    const response = await hostingerClient.get(`/api/vps/v1/virtual-machines/${vmId}/docker`);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao buscar projetos Docker:', error.response?.data || error.message);
    throw error;
  }
}

async function getProjectLogs(vmId, projectName) {
  try {
    console.log(`📋 Buscando logs do projeto ${projectName}...`);
    const response = await hostingerClient.get(`/api/vps/v1/virtual-machines/${vmId}/docker/${projectName}/logs`);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao buscar logs:', error.response?.data || error.message);
    throw error;
  }
}

async function restartDockerProject(vmId, projectName) {
  try {
    console.log(`🔄 Reiniciando projeto Docker ${projectName}...`);
    const response = await hostingerClient.post(`/api/vps/v1/virtual-machines/${vmId}/docker/${projectName}/restart`);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao reiniciar projeto Docker:', error.response?.data || error.message);
    throw error;
  }
}

async function diagnoseSSLIssue() {
  try {
    console.log('🚀 Iniciando diagnóstico SSL...\n');

    // 1. Buscar VPS disponíveis
    const vms = await getVirtualMachines();
    console.log(`✅ Encontrados ${vms.length} VPS:`);
    vms.forEach(vm => {
      console.log(`   - ID: ${vm.id}, Hostname: ${vm.hostname}, Estado: ${vm.state}`);
    });

    // Assumir que o primeiro VPS é o correto
    const targetVM = vms[0];
    if (!targetVM) {
      throw new Error('Nenhum VPS encontrado');
    }

    console.log(`\n🎯 Usando VPS: ${targetVM.hostname} (ID: ${targetVM.id})\n`);

    // 2. Buscar projetos Docker
    const projects = await getDockerProjects(targetVM.id);
    console.log(`✅ Encontrados ${projects.length} projetos Docker:`);
    projects.forEach(project => {
      console.log(`   - Nome: ${project.name}, Estado: ${project.state}, Status: ${project.status}`);
    });

    // 3. Encontrar projeto do INSS
    const inssProject = projects.find(p => 
      p.name.includes('inss') || 
      p.name.includes('simulador') ||
      p.containers.some(c => c.name.includes('inss'))
    );

    if (!inssProject) {
      console.log('⚠️  Projeto INSS não encontrado automaticamente');
      console.log('📋 Projetos disponíveis:');
      projects.forEach(p => console.log(`   - ${p.name}`));
      return;
    }

    console.log(`\n🎯 Projeto INSS encontrado: ${inssProject.name}\n`);

    // 4. Verificar logs para identificar problemas SSL
    console.log('📋 Analisando logs para problemas SSL...');
    const logs = await getProjectLogs(targetVM.id, inssProject.name);
    
    let sslIssues = [];
    logs.forEach(logGroup => {
      console.log(`\n🔸 Serviço: ${logGroup.service}`);
      logGroup.entries.forEach(entry => {
        const line = entry.line.toLowerCase();
        if (line.includes('ssl') || line.includes('tls') || line.includes('certificate') || 
            line.includes('https') || line.includes('443') || line.includes('protocol')) {
          console.log(`   ⚠️  ${entry.timestamp}: ${entry.line}`);
          sslIssues.push({ service: logGroup.service, timestamp: entry.timestamp, line: entry.line });
        } else {
          console.log(`   ${entry.timestamp}: ${entry.line}`);
        }
      });
    });

    if (sslIssues.length > 0) {
      console.log(`\n🚨 Encontrados ${sslIssues.length} problemas SSL:`);
      sslIssues.forEach(issue => {
        console.log(`   - ${issue.service}: ${issue.line}`);
      });
    } else {
      console.log('\n✅ Nenhum problema SSL óbvio encontrado nos logs');
    }

    // 5. Verificar configuração dos containers
    console.log('\n📋 Verificando configuração dos containers:');
    inssProject.containers.forEach(container => {
      console.log(`\n🔸 Container: ${container.name}`);
      console.log(`   - Estado: ${container.state}`);
      console.log(`   - Status: ${container.status}`);
      console.log(`   - Portas: ${JSON.stringify(container.ports, null, 2)}`);
      
      if (container.ports) {
        const httpsPort = container.ports.find(p => p.host_port === 443);
        if (httpsPort) {
          console.log(`   ⚠️  Container está usando porta 443 diretamente!`);
        }
      }
    });

    // 6. Reiniciar projeto se necessário
    if (sslIssues.length > 0 || inssProject.state !== 'running') {
      console.log('\n🔄 Reiniciando projeto para corrigir problemas...');
      const restartResult = await restartDockerProject(targetVM.id, inssProject.name);
      console.log(`✅ Projeto reiniciado. Action ID: ${restartResult.id}`);
      
      // Aguardar e verificar logs após restart
      console.log('\n⏳ Aguardando 30 segundos para estabilização...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      console.log('\n📋 Logs após o restart:');
      const logsAfter = await getProjectLogs(targetVM.id, inssProject.name);
      logsAfter.forEach(logGroup => {
        console.log(`\n🔸 Serviço: ${logGroup.service}`);
        logGroup.entries.slice(-3).forEach(entry => {
          console.log(`   ${entry.timestamp}: ${entry.line}`);
        });
      });
    }

    console.log('\n✅ Diagnóstico SSL concluído!');
    console.log('🌐 Teste o acesso: https://inss.lunasdigital.com.br/inss/simulador.html?extrato=7708');

  } catch (error) {
    console.error('\n❌ Erro durante o diagnóstico SSL:', error.message);
    if (error.response?.data) {
      console.error('📋 Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  diagnoseSSLIssue();
}

module.exports = {
  diagnoseSSLIssue,
  getVirtualMachines,
  getDockerProjects,
  getProjectLogs,
  restartDockerProject
};
