import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const perfisPath = path.join(__dirname, 'perfis-chatgpt.json');
let perfisData = { perfis: {}, configuracoes: {} };

function carregarPerfis() {
  try {
    const data = fs.readFileSync(perfisPath, 'utf8');
    perfisData = JSON.parse(data);
    console.log("[PERFIS] Configurações de perfis carregadas com sucesso");
  } catch (error) {
    console.error("[PERFIS] Erro ao carregar perfis:", error.message);
    perfisData = { perfis: {}, configuracoes: {} };
  }
}

// Carregar perfis na inicialização
carregarPerfis();

function detectarPerfil(dadosCliente) {
  try {
    // Verificar se tem propostas
    if (!dadosCliente.propostas || dadosCliente.propostas.length === 0) {
      return 'vendedor'; // Sem propostas = perfil vendedor
    }

    // Analisar status das propostas
    const statusPropostas = dadosCliente.propostas.map(p => p.status);
    console.log("[PERFIS] Status das propostas:", statusPropostas);

    // Verificar se alguma proposta está em andamento (recepcionista)
    const statusRecepcionista = perfisData.perfis.recepcionista.status_alvo;
    const temPropostaEmAndamento = statusPropostas.some(status => 
      statusRecepcionista.includes(status)
    );

    if (temPropostaEmAndamento) {
      console.log("[PERFIS] Perfil detectado: RECEPCIONISTA");
      return 'recepcionista';
    }

    // Se não tem propostas em andamento, usar vendedor
    console.log("[PERFIS] Perfil detectado: VENDEDOR");
    return 'vendedor';

  } catch (error) {
    console.error("[PERFIS] Erro ao detectar perfil:", error.message);
    return perfisData.configuracoes.perfil_padrao || 'vendedor';
  }
}

function obterConfiguracaoPerfil(perfil) {
  return perfisData.perfis[perfil] || perfisData.perfis.vendedor;
}

function construirPromptPerfil(perfil, dadosCliente, mensagem) {
  const config = obterConfiguracaoPerfil(perfil);
  
  if (perfil === 'vendedor') {
    return construirPromptVendedor(dadosCliente, mensagem, config);
  } else if (perfil === 'recepcionista') {
    return construirPromptRecepcionista(dadosCliente, mensagem, config);
  }
  
  return construirPromptVendedor(dadosCliente, mensagem, config);
}

function construirPromptVendedor(dadosCliente, mensagem, config) {
  const propostasDetalhadas = dadosCliente.propostas && dadosCliente.propostas.length > 0
    ? dadosCliente.propostas.map((p, i) => {
        const bancoAtual = p.dados?.cliente?.bancoAtual || 'N/A';
        const bancoNovo = p.dados?.cliente?.bancoNovo || 'N/A';
        const parcelaAtual = p.dados?.cliente?.parcelaAtual || 0;
        const novaParcela = p.dados?.cliente?.novaParcela || 0;
        const troco = p.dados?.cliente?.troco || 0;
        const prazo = p.dados?.cliente?.prazo || 'N/A';
        const taxa = p.dados?.cliente?.taxa || 'N/A';
        const economiaMensal = parcelaAtual - novaParcela;

        return `
PROPOSTA ${i + 1}:
- Parcela atual: R$ ${parcelaAtual.toLocaleString('pt-BR')}
- Nova parcela: R$ ${novaParcela.toLocaleString('pt-BR')}
- Economia: R$ ${economiaMensal.toLocaleString('pt-BR')}/mes
- Troco: R$ ${troco.toLocaleString('pt-BR')}
- Banco atual: ${bancoAtual}
- Banco novo: ${bancoNovo}
- Prazo: ${prazo} meses
- Taxa: ${taxa}% a.m.
`;
      }).join('\n')
    : 'Cliente sem propostas ativas no momento.';

  return `Voce e um VENDEDOR profissional de portabilidade de consignado da Lunas Digital.

DADOS DO CLIENTE:
- Nome: ${dadosCliente.nome ? dadosCliente.nome.split(' ')[0] : 'Cliente'}
- CPF: ${dadosCliente.cpf || 'N/A'}
- Mensagem: "${mensagem}"

PROPOSTAS DISPONIVEIS (${dadosCliente.propostas?.length || 0} propostas):
${propostasDetalhadas}

INSTRUCOES COMO VENDEDOR:
1. Seja persuasivo mas respeitoso
2. Foque nos beneficios financeiros das propostas
3. Apresente dados especificos e numeros reais
4. Crie senso de urgencia sem pressionar demais
5. Use linguagem comercial profissional
6. Termine sempre com call to action
7. Seja direto e objetivo
8. Seja humanizado e natural - NAO use emojis
9. Foque em FECHAR a venda
10. Use linguagem de vendas: "voce tem", "sua proposta", "seu beneficio"

FORMATO DA RESPOSTA:
Responda de forma persuasiva e comercial, focando em fechar a venda.`;
}

function construirPromptRecepcionista(dadosCliente, mensagem, config) {
  const propostasDetalhadas = dadosCliente.propostas && dadosCliente.propostas.length > 0
    ? dadosCliente.propostas.map((p, i) => {
        const status = p.status || 'N/A';
        const bancoAtual = p.dados?.cliente?.bancoAtual || 'N/A';
        const bancoNovo = p.dados?.cliente?.bancoNovo || 'N/A';
        const parcelaAtual = p.dados?.cliente?.parcelaAtual || 0;
        const novaParcela = p.dados?.cliente?.novaParcela || 0;
        const troco = p.dados?.cliente?.troco || 0;
        const prazo = p.dados?.cliente?.prazo || 'N/A';
        const taxa = p.dados?.cliente?.taxa || 'N/A';

        return `
PROPOSTA ${i + 1} (Status: ${status}):
- Parcela atual: R$ ${parcelaAtual.toLocaleString('pt-BR')}
- Nova parcela: R$ ${novaParcela.toLocaleString('pt-BR')}
- Troco: R$ ${troco.toLocaleString('pt-BR')}
- Banco atual: ${bancoAtual}
- Banco novo: ${bancoNovo}
- Prazo: ${prazo} meses
- Taxa: ${taxa}% a.m.
`;
      }).join('\n')
    : 'Cliente sem propostas ativas no momento.';

  return `Voce e um RECEPCIONISTA de atendimento da Lunas Digital, especializado em suporte para propostas em andamento.

DADOS DO CLIENTE:
- Nome: ${dadosCliente.nome ? dadosCliente.nome.split(' ')[0] : 'Cliente'}
- CPF: ${dadosCliente.cpf || 'N/A'}
- Mensagem: "${mensagem}"

PROPOSTAS EM ANDAMENTO (${dadosCliente.propostas?.length || 0} propostas):
${propostasDetalhadas}

INSTRUCOES COMO RECEPCIONISTA:
1. Seja educativa e prestativa
2. Explique o processo em andamento
3. Tire duvidas sobre status e prazos
4. Use linguagem de atendimento profissional
5. Seja paciente e detalhista
6. Ofereca ajuda adicional quando necessario
7. Explique cada etapa do processo
8. Seja humanizado e natural - NAO use emojis
9. Foque em ESCLARECER e dar suporte
10. Use linguagem de atendimento: "posso te ajudar", "vou verificar", "deixe me explicar"

FORMATO DA RESPOSTA:
Responda de forma educativa e prestativa, focando em esclarecer duvidas e dar suporte.`;
}

export const sistemaPerfis = {
  carregarPerfis,
  detectarPerfil,
  obterConfiguracaoPerfil,
  construirPromptPerfil,
  perfisData
};
