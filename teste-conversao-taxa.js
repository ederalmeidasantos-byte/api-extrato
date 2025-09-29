// Teste da conversão de taxa
console.log("🔢 TESTE DE CONVERSÃO DE TAXA");

function toNumber(v) {
    if (v == null) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    let s = v.toString().replace(/[R$\s%]/g, "").trim();
    if (s === "") return 0;
    const hasDot = s.includes(".");
    const hasComma = s.includes(",");
    if (hasDot && hasComma) {
        if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
        else s = s.replace(/,/g, "");
    } else if (hasComma) s = s.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
}

// Teste com a taxa do contrato
const taxaOriginal = "1,78";
const taxaConvertida = toNumber(taxaOriginal);
const taxaParseFloat = parseFloat(taxaOriginal);

console.log("📊 Comparação de conversão:");
console.log(`   Taxa Original: "${taxaOriginal}"`);
console.log(`   toNumber(): ${taxaConvertida}`);
console.log(`   parseFloat(): ${taxaParseFloat}`);

console.log(`\n✅ Resultado:`);
console.log(`   toNumber() converte corretamente: ${taxaConvertida}%`);
console.log(`   parseFloat() converte incorretamente: ${taxaParseFloat}%`);

// Teste com outros formatos
const testes = ["1,78", "1.78", "1,85", "2,12"];
console.log(`\n🧪 Testes com diferentes formatos:`);
testes.forEach(taxa => {
    console.log(`   "${taxa}" -> toNumber(): ${toNumber(taxa)}%`);
});
