// Teste da formatação de taxa
console.log("🔢 TESTE DA FORMATAÇÃO DE TAXA");

function formatTaxa(value) {
    if (value == null || value === '') return '0,00';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) : value;
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

// Testes com diferentes valores
const testes = [
    "1,78",    // String brasileira
    "1.78",    // String americana
    1.78,      // Número decimal
    1,         // Número inteiro
    "1",       // String inteira
    "",        // String vazia
    null,      // Null
    undefined  // Undefined
];

console.log("📊 Testes de formatação:");
testes.forEach(valor => {
    const formatado = formatTaxa(valor);
    console.log(`   formatTaxa(${JSON.stringify(valor)}): "${formatado}"`);
});

// Teste específico com o valor do contrato
console.log(`\n🎯 Teste específico:`);
console.log(`   Contrato taxa "1,78" -> formatTaxa(): "${formatTaxa("1,78")}"`);
console.log(`   Contrato taxa 1.78 -> formatTaxa(): "${formatTaxa(1.78)}"`);
console.log(`   Contrato taxa 1 -> formatTaxa(): "${formatTaxa(1)}"`);

// Verificar se resolve o problema
console.log(`\n✅ Resultado esperado:`);
console.log(`   Campo deve mostrar: "1,78" (não "1" ou "1.78")`);
console.log(`   formatTaxa("1,78"): "${formatTaxa("1,78")}"`);
console.log(`   formatTaxa(1.78): "${formatTaxa(1.78)}"`);
console.log(`   formatTaxa(1): "${formatTaxa(1)}"`);
