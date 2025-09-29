// Teste de cálculo do troco
console.log("🧪 TESTE DE CÁLCULO DO TROCO");

// Dados de teste
const parcela = 470.00;
const taxa = 1.85;
const dia = "15";
const saldoDevedor = 15000.00;

// Coeficiente do dia 15 para taxa 1.85%
const coeficiente = 0.022974;

// Cálculo
const valorEmprestimo = parcela / coeficiente;
const troco = valorEmprestimo - saldoDevedor;

console.log(`📊 Dados do teste:`);
console.log(`   Parcela: R$ ${parcela.toFixed(2)}`);
console.log(`   Taxa: ${taxa}%`);
console.log(`   Dia: ${dia}`);
console.log(`   Coeficiente: ${coeficiente}`);
console.log(`   Saldo Devedor: R$ ${saldoDevedor.toFixed(2)}`);
console.log(`   Valor Empréstimo: R$ ${valorEmprestimo.toFixed(2)}`);
console.log(`   Troco: R$ ${troco.toFixed(2)}`);

// Verificação
console.log(`\n✅ Resultado esperado:`);
console.log(`   Empréstimo = ${parcela} ÷ ${coeficiente} = R$ ${valorEmprestimo.toFixed(2)}`);
console.log(`   Troco = ${valorEmprestimo.toFixed(2)} - ${saldoDevedor.toFixed(2)} = R$ ${troco.toFixed(2)}`);
