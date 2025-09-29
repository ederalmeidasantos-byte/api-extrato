// Teste da formatação do troco no título
console.log("🔍 TESTE DA FORMATAÇÃO DO TROCO NO TÍTULO");

function formatBRNumber(n) {
    return Number(n).toLocaleString("pt-BR", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

// Teste com diferentes valores de troco
const trocos = [
    2.90,      // Valor pequeno
    290,       // Valor médio  
    2900,      // Valor grande
    2900.50,   // Valor grande com centavos
    29000,     // Valor muito grande
    290000.99  // Valor gigante
];

console.log("📊 Teste com diferentes valores de troco:");
trocos.forEach(troco => {
    const formatado = formatBRNumber(troco);
    console.log(`   Troco ${troco} -> "R$ ${formatado}"`);
});

// Verificar se o problema é com o valor 2.90 especificamente
console.log(`\n🎯 Teste específico com 2.90:`);
const troco = 2.90;
console.log(`   Valor: ${troco}`);
console.log(`   formatBRNumber: "R$ ${formatBRNumber(troco)}"`);
console.log(`   toString: "${troco.toString()}"`);
console.log(`   toFixed(2): "${troco.toFixed(2)}"`);

// Verificar diferentes formas de exibir
console.log(`\n🔍 Diferentes formas de exibir:`);
console.log(`   Formato brasileiro: "R$ ${formatBRNumber(2.90)}"`);
console.log(`   Formato americano: "R$ ${Number(2.90).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`);
console.log(`   Formato simples: "R$ ${2.90}"`);
console.log(`   Formato toFixed: "R$ ${(2.90).toFixed(2)}"`);

// Verificar se o problema é com vírgula vs ponto
console.log(`\n💡 Análise do formato:`);
console.log(`   Brasileiro (correto): ponto para milhares, vírgula para decimal`);
console.log(`   Americano (incorreto): vírgula para milhares, ponto para decimal`);
console.log(`   Exemplo BR: R$ 1.234,56`);
console.log(`   Exemplo US: R$ 1,234.56`);
