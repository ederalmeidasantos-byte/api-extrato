import fs from 'fs';

// Testar PDF da Kentro direto
const pdfKentro = './extrato_7713_KENTRO_DIRETO_FINAL.pdf';
const pdfSistema = './extrato_7713_CORRIGIDO_FINAL.pdf';

console.log('=== COMPARAÇÃO DE PDFs ===');

if (fs.existsSync(pdfKentro)) {
  const statsKentro = fs.statSync(pdfKentro);
  const bufferKentro = fs.readFileSync(pdfKentro);
  console.log('PDF Kentro:');
  console.log('- Tamanho:', statsKentro.size, 'bytes');
  console.log('- Cabeçalho:', bufferKentro.toString('ascii', 0, 8));
  console.log('- Primeiros 200 chars:', bufferKentro.toString('ascii', 0, 200));
}

if (fs.existsSync(pdfSistema)) {
  const statsSistema = fs.statSync(pdfSistema);
  const bufferSistema = fs.readFileSync(pdfSistema);
  console.log('\nPDF Sistema:');
  console.log('- Tamanho:', statsSistema.size, 'bytes');
  console.log('- Cabeçalho:', bufferSistema.toString('ascii', 0, 8));
  console.log('- Primeiros 200 chars:', bufferSistema.toString('ascii', 0, 200));
}
