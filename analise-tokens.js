// ================== ANÁLISE DE CONSUMO DE TOKENS ==================

console.log("=== ANÁLISE DE CONSUMO DE TOKENS - CHATGPT VENDEDOR ===\n");

// ================== Configurações Atuais ==================
const configuracao = {
  modelo: "gpt-3.5-turbo-0125",
  maxTokens: 800,
  temperatura: 0.5
};

// ================== Preços da OpenAI (Janeiro 2025) ==================
const precos = {
  "gpt-3.5-turbo-0125": {
    entrada: 0.0005, // por 1K tokens
    saida: 0.0015   // por 1K tokens
  },
  "gpt-4o-mini": {
    entrada: 0.00015, // por 1K tokens
    saida: 0.0006    // por 1K tokens
  }
};

// ================== Estimativas de Tokens por Mensagem ==================

// Prompt do sistema (aproximado)
const promptSistema = `Voce e um profissional da Lunas Digital especializado em portabilidade de consignado. Seja humanizado, natural e profissional. Nao use emojis. Seja educado e respeitoso.`;

// Prompt do usuário (exemplo típico)
const promptUsuario = `Voce e um VENDEDOR profissional de portabilidade de consignado da Lunas Digital.

DADOS DO CLIENTE:
- Nome: Antonio
- CPF: 46104631649
- Mensagem: "qual as parcelas?"

PROPOSTAS DISPONIVEIS (4 propostas):
PROPOSTA 1:
- Parcela atual: R$ 350
- Nova parcela: R$ 280
- Economia: R$ 70/mes
- Troco: R$ 1.200
- Banco atual: Santander
- Banco novo: Banco do Brasil
- Prazo: 84 meses
- Taxa: 1.45% a.m.

PROPOSTA 2:
- Parcela atual: R$ 420
- Nova parcela: R$ 380
- Economia: R$ 40/mes
- Troco: R$ 800
- Banco atual: Itau
- Banco novo: Caixa
- Prazo: 72 meses
- Taxa: 1.35% a.m.

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

// Resposta típica do ChatGPT
const respostaTipica = `Antonio, suas propostas de portabilidade de consignado são:

PROPOSTA 1:
- Parcela atual: R$ 350
- Nova parcela: R$ 280
- Economia: R$ 70/mês
- Troco: R$ 1.200
- Banco atual: Santander → Banco do Brasil
- Prazo: 84 meses
- Taxa: 1.45% a.m.

PROPOSTA 2:
- Parcela atual: R$ 420
- Nova parcela: R$ 380
- Economia: R$ 40/mês
- Troco: R$ 800
- Banco atual: Itaú → Caixa
- Prazo: 72 meses
- Taxa: 1.35% a.m.

Você tem uma economia mensal significativa com essas propostas. Sua proposta mais vantajosa é a primeira, com economia de R$ 70 por mês e troco de R$ 1.200.

Posso te ajudar a iniciar o processo de portabilidade?`;

// ================== Cálculo de Tokens ==================

// Função para estimar tokens (aproximação: 1 token ≈ 4 caracteres)
function estimarTokens(texto) {
  return Math.ceil(texto.length / 4);
}

const tokensSistema = estimarTokens(promptSistema);
const tokensUsuario = estimarTokens(promptUsuario);
const tokensResposta = estimarTokens(respostaTipica);
const tokensTotal = tokensSistema + tokensUsuario + tokensResposta;

// ================== Cálculo de Custos ==================
const precoModelo = precos[configuracao.modelo];
const custoEntrada = ((tokensSistema + tokensUsuario) / 1000) * precoModelo.entrada;
const custoSaida = (tokensResposta / 1000) * precoModelo.saida;
const custoTotal = custoEntrada + custoSaida;

// ================== Projeções ==================
const mensagensPorDia = [10, 50, 100, 500, 1000];
const diasPorMes = 30;

console.log("📊 CONFIGURAÇÃO ATUAL:");
console.log(`Modelo: ${configuracao.modelo}`);
console.log(`Max Tokens: ${configuracao.maxTokens}`);
console.log(`Temperatura: ${configuracao.temperatura}\n`);

console.log("🔢 TOKENS POR MENSAGEM:");
console.log(`Prompt Sistema: ${tokensSistema} tokens`);
console.log(`Prompt Usuário: ${tokensUsuario} tokens`);
console.log(`Resposta ChatGPT: ${tokensResposta} tokens`);
console.log(`TOTAL POR MENSAGEM: ${tokensTotal} tokens\n`);

console.log("💰 CUSTO POR MENSAGEM:");
console.log(`Entrada (${tokensSistema + tokensUsuario} tokens): $${custoEntrada.toFixed(6)}`);
console.log(`Saída (${tokensResposta} tokens): $${custoSaida.toFixed(6)}`);
console.log(`TOTAL POR MENSAGEM: $${custoTotal.toFixed(6)}\n`);

console.log("📈 PROJEÇÕES MENSAIS:");
console.log("Mensagens/Dia | Custo/Mês | Tokens/Mês");
console.log("-------------|-----------|-----------");

mensagensPorDia.forEach(msgs => {
  const custoMes = custoTotal * msgs * diasPorMes;
  const tokensMes = tokensTotal * msgs * diasPorMes;
  console.log(`${msgs.toString().padStart(13)} | $${custoMes.toFixed(2).padStart(9)} | ${tokensMes.toLocaleString().padStart(10)}`);
});

console.log("\n💡 OTIMIZAÇÕES POSSÍVEIS:");
console.log("1. Reduzir max_tokens de 800 para 500 (-37.5% custo)");
console.log("2. Usar gpt-4o-mini (-70% custo entrada, -60% custo saída)");
console.log("3. Implementar cache de respostas similares");
console.log("4. Reduzir tamanho do prompt do sistema");

// ================== Comparação com gpt-4o-mini ==================
const custo4oMini = ((tokensSistema + tokensUsuario) / 1000) * precos["gpt-4o-mini"].entrada + 
                   (tokensResposta / 1000) * precos["gpt-4o-mini"].saida;

console.log("\n🔄 COMPARAÇÃO DE MODELOS:");
console.log(`gpt-3.5-turbo-0125: $${custoTotal.toFixed(6)} por mensagem`);
console.log(`gpt-4o-mini: $${custo4oMini.toFixed(6)} por mensagem`);
console.log(`Economia com gpt-4o-mini: ${((custoTotal - custo4oMini) / custoTotal * 100).toFixed(1)}%`);

console.log("\n✅ CONCLUSÃO:");
console.log(`Cada mensagem consome aproximadamente ${tokensTotal} tokens`);
console.log(`Custo por mensagem: $${custoTotal.toFixed(6)}`);
console.log(`Para 100 mensagens/dia: $${(custoTotal * 100 * 30).toFixed(2)}/mês`);
console.log(`Para 1000 mensagens/dia: $${(custoTotal * 1000 * 30).toFixed(2)}/mês`);
