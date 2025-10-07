// ================== ANÁLISE DE IMPACTO DO JSON NO CONSUMO DE TOKENS ==================

console.log("=== ANÁLISE: IMPACTO DO JSON NO CONSUMO DE TOKENS ===\n");

// ================== Exemplo de JSON Real do Cliente ==================
const jsonClienteCompleto = {
  "nome": "Antonio Silva Santos",
  "cpf": "46104631649",
  "propostas": [
    {
      "idoportunidade": "36337",
      "status": "digitando",
      "dados": {
        "cliente": {
          "bancoAtual": "Banco do Brasil",
          "bancoNovo": "Caixa Econômica Federal",
          "parcelaAtual": 350.50,
          "novaParcela": 280.75,
          "troco": 1200.00,
          "prazo": 84,
          "taxa": 1.45,
          "saldoDevedor": 25000.00,
          "rendaMensal": 5000.00,
          "margemDisponivel": 1500.00
        }
      }
    },
    {
      "idoportunidade": "36338",
      "status": "etapa1",
      "dados": {
        "cliente": {
          "bancoAtual": "Itaú Unibanco",
          "bancoNovo": "Santander",
          "parcelaAtual": 420.30,
          "novaParcela": 380.15,
          "troco": 800.50,
          "prazo": 72,
          "taxa": 1.35,
          "saldoDevedor": 30000.00,
          "rendaMensal": 6000.00,
          "margemDisponivel": 1800.00
        }
      }
    },
    {
      "idoportunidade": "36339",
      "status": "etapa2",
      "dados": {
        "cliente": {
          "bancoAtual": "Bradesco",
          "bancoNovo": "Nubank",
          "parcelaAtual": 300.00,
          "novaParcela": 250.00,
          "troco": 1500.00,
          "prazo": 96,
          "taxa": 1.25,
          "saldoDevedor": 20000.00,
          "rendaMensal": 4000.00,
          "margemDisponivel": 1200.00
        }
      }
    }
  ],
  "contratos": [],
  "contratosRMC": [],
  "contratosRCC": [
    {
      "banco": {
        "nome": "Caixa Econômica Federal",
        "codigo": "104"
      },
      "valor_liberado": 1500.00,
      "situacao": "ativo"
    }
  ],
  "dadosCompletos": {
    "nome": "Antonio Silva Santos",
    "cpf": "46104631649",
    "telefone": "11999999999",
    "email": "antonio@email.com",
    "endereco": {
      "logradouro": "Rua das Flores, 123",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01234567"
    },
    "renda": {
      "mensal": 5000.00,
      "comprovada": true
    },
    "beneficio": {
      "tipo": "INSS",
      "valor": 2500.00,
      "numero": "1234567890"
    }
  }
};

// ================== Prompt Atual (COM JSON) ==================
const promptComJson = `Voce e um VENDEDOR profissional de portabilidade de consignado da Lunas Digital.

DADOS DO CLIENTE:
- Nome: Antonio
- CPF: 46104631649
- Mensagem: "qual as parcelas?"

PROPOSTAS DISPONIVEIS (3 propostas):
PROPOSTA 1:
- Parcela atual: R$ 350,50
- Nova parcela: R$ 280,75
- Economia: R$ 69,75/mes
- Troco: R$ 1.200,00
- Banco atual: Banco do Brasil
- Banco novo: Caixa Economica Federal
- Prazo: 84 meses
- Taxa: 1,45% a.m.

PROPOSTA 2:
- Parcela atual: R$ 420,30
- Nova parcela: R$ 380,15
- Economia: R$ 40,15/mes
- Troco: R$ 800,50
- Banco atual: Itau Unibanco
- Banco novo: Santander
- Prazo: 72 meses
- Taxa: 1,35% a.m.

PROPOSTA 3:
- Parcela atual: R$ 300,00
- Nova parcela: R$ 250,00
- Economia: R$ 50,00/mes
- Troco: R$ 1.500,00
- Banco atual: Bradesco
- Banco novo: Nubank
- Prazo: 96 meses
- Taxa: 1,25% a.m.

DADOS COMPLETOS DO CLIENTE (JSON):
${JSON.stringify(jsonClienteCompleto, null, 2)}

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

// ================== Prompt Otimizado (SEM JSON) ==================
const promptSemJson = `Voce e um VENDEDOR profissional de portabilidade de consignado da Lunas Digital.

DADOS DO CLIENTE:
- Nome: Antonio
- CPF: 46104631649
- Mensagem: "qual as parcelas?"

PROPOSTAS DISPONIVEIS (3 propostas):
PROPOSTA 1:
- Parcela atual: R$ 350,50
- Nova parcela: R$ 280,75
- Economia: R$ 69,75/mes
- Troco: R$ 1.200,00
- Banco atual: Banco do Brasil
- Banco novo: Caixa Economica Federal
- Prazo: 84 meses
- Taxa: 1,45% a.m.

PROPOSTA 2:
- Parcela atual: R$ 420,30
- Nova parcela: R$ 380,15
- Economia: R$ 40,15/mes
- Troco: R$ 800,50
- Banco atual: Itau Unibanco
- Banco novo: Santander
- Prazo: 72 meses
- Taxa: 1,35% a.m.

PROPOSTA 3:
- Parcela atual: R$ 300,00
- Nova parcela: R$ 250,00
- Economia: R$ 50,00/mes
- Troco: R$ 1.500,00
- Banco atual: Bradesco
- Banco novo: Nubank
- Prazo: 96 meses
- Taxa: 1,25% a.m.

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

// ================== Cálculo de Tokens ==================
function estimarTokens(texto) {
  return Math.ceil(texto.length / 4);
}

const tokensComJson = estimarTokens(promptComJson);
const tokensSemJson = estimarTokens(promptSemJson);
const tokensJson = estimarTokens(JSON.stringify(jsonClienteCompleto, null, 2));
const diferencaTokens = tokensComJson - tokensSemJson;

// ================== Cálculo de Custos ==================
const precoEntrada = 0.0005; // por 1K tokens
const custoComJson = (tokensComJson / 1000) * precoEntrada;
const custoSemJson = (tokensSemJson / 1000) * precoEntrada;
const custoJson = (tokensJson / 1000) * precoEntrada;

console.log("📊 ANÁLISE DE TOKENS:");
console.log(`Prompt COM JSON: ${tokensComJson} tokens`);
console.log(`Prompt SEM JSON: ${tokensSemJson} tokens`);
console.log(`JSON sozinho: ${tokensJson} tokens`);
console.log(`DIFERENÇA: ${diferencaTokens} tokens (${((diferencaTokens/tokensSemJson)*100).toFixed(1)}% a mais)\n`);

console.log("💰 ANÁLISE DE CUSTOS:");
console.log(`Custo COM JSON: $${custoComJson.toFixed(6)} por mensagem`);
console.log(`Custo SEM JSON: $${custoSemJson.toFixed(6)} por mensagem`);
console.log(`Custo do JSON: $${custoJson.toFixed(6)} por mensagem`);
console.log(`ECONOMIA SEM JSON: $${(custoComJson - custoSemJson).toFixed(6)} por mensagem (${(((custoComJson - custoSemJson)/custoComJson)*100).toFixed(1)}%)\n`);

console.log("📈 IMPACTO EM ESCALA:");
console.log("Mensagens/Dia | Economia/Mês | Tokens Economizados/Mês");
console.log("-------------|--------------|-------------------------");

[10, 50, 100, 500, 1000].forEach(msgs => {
  const economiaMes = (custoComJson - custoSemJson) * msgs * 30;
  const tokensEconomizados = diferencaTokens * msgs * 30;
  console.log(`${msgs.toString().padStart(13)} | $${economiaMes.toFixed(2).padStart(12)} | ${tokensEconomizados.toLocaleString().padStart(23)}`);
});

console.log("\n🔍 ANÁLISE DO JSON:");
console.log(`Tamanho do JSON: ${JSON.stringify(jsonClienteCompleto, null, 2).length} caracteres`);
console.log(`Tokens do JSON: ${tokensJson} tokens`);
console.log(`Percentual do prompt: ${((tokensJson/tokensComJson)*100).toFixed(1)}%`);

console.log("\n💡 RECOMENDAÇÕES:");
console.log("1. REMOVER o JSON completo do prompt");
console.log("2. Manter apenas os dados essenciais das propostas");
console.log("3. Usar dados estruturados em vez de JSON");
console.log("4. Implementar cache de respostas similares");
console.log("5. Reduzir max_tokens para 500");

console.log("\n✅ CONCLUSÃO:");
console.log(`O JSON consome ${tokensJson} tokens (${((tokensJson/tokensComJson)*100).toFixed(1)}% do prompt)`);
console.log(`Removendo o JSON, você economiza ${((diferencaTokens/tokensComJson)*100).toFixed(1)}% em tokens`);
console.log(`Para 1000 mensagens/dia: economia de $${((custoComJson - custoSemJson) * 1000 * 30).toFixed(2)}/mês`);
