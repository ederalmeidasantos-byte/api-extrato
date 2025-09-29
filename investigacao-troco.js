// Teste detalhado do cálculo do troco
console.log("🔍 INVESTIGAÇÃO DETALHADA DO TROCO");

// Dados reais de um contrato
const contrato = {
    contrato: "2666838921",
    valor_parcela: 470.00,
    taxa_juros_mensal: 1.85,
    prazo_total: 96,
    parcelas_pagas: 22,
    saldo_devedor: 21638.63
};

console.log("📊 Dados do contrato:");
console.log(`   Contrato: ${contrato.contrato}`);
console.log(`   Parcela: R$ ${contrato.valor_parcela}`);
console.log(`   Taxa: ${contrato.taxa_juros_mensal}%`);
console.log(`   Prazo Total: ${contrato.prazo_total}`);
console.log(`   Parcelas Pagas: ${contrato.parcelas_pagas}`);
console.log(`   Saldo Devedor: R$ ${contrato.saldo_devedor}`);

// Coeficiente do dia 15 para taxa 1.85%
const coeficiente = 0.022974;
console.log(`\n🔢 Coeficiente (dia 15, taxa 1.85%): ${coeficiente}`);

// Cálculo do valor do empréstimo
const valorEmprestimo = contrato.valor_parcela / coeficiente;
console.log(`\n💰 Cálculo do empréstimo:`);
console.log(`   Valor Empréstimo = ${contrato.valor_parcela} ÷ ${coeficiente} = R$ ${valorEmprestimo.toFixed(2)}`);

// Cálculo do troco
const troco = valorEmprestimo - contrato.saldo_devedor;
console.log(`\n🎯 Cálculo do troco:`);
console.log(`   Troco = ${valorEmprestimo.toFixed(2)} - ${contrato.saldo_devedor} = R$ ${troco.toFixed(2)}`);

// Verificação
console.log(`\n✅ Resultado:`);
console.log(`   Troco: R$ ${troco.toFixed(2)}`);
console.log(`   Troco > 0: ${troco > 0}`);
console.log(`   Troco >= 100: ${troco >= 100}`);

// Problema identificado
if (troco < 0) {
    console.log(`\n❌ PROBLEMA IDENTIFICADO:`);
    console.log(`   O saldo devedor (R$ ${contrato.saldo_devedor}) é maior que o valor do empréstimo (R$ ${valorEmprestimo.toFixed(2)})`);
    console.log(`   Isso resulta em troco negativo: R$ ${troco.toFixed(2)}`);
    console.log(`   O contrato não pode ser aprovado com troco negativo!`);
}
