import fs from 'fs';

console.log("🔧 CORRIGINDO ARQUIVO .env");
console.log("===========================");

try {
  // Ler o arquivo .env
  const envContent = fs.readFileSync('.env', 'utf8');
  console.log("📖 Arquivo .env lido com sucesso");
  
  // Corrigir a linha problemática
  const correctedContent = envContent.replace(
    'FGTS_PASS_3=ty#lN6z1',
    'FGTS_PASS_3="ty#lN6z1"'
  );
  
  // Salvar o arquivo corrigido
  fs.writeFileSync('.env', correctedContent);
  console.log("✅ Arquivo .env corrigido com sucesso!");
  
  // Verificar se a correção funcionou
  const newContent = fs.readFileSync('.env', 'utf8');
  const lines = newContent.split('\n');
  const passLine = lines.find(line => line.startsWith('FGTS_PASS_3='));
  
  console.log("🔍 Linha corrigida:");
  console.log(passLine);
  
  if (passLine && passLine.includes('"ty#lN6z1"')) {
    console.log("🎉 CORREÇÃO BEM-SUCEDIDA!");
  } else {
    console.log("❌ Correção falhou");
  }
  
} catch (error) {
  console.error("❌ Erro ao corrigir .env:", error.message);
}









