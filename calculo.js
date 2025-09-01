import fs from "fs";

export async function extrairPDF(filePath, fileId) {
  // simulação de leitura do extrato
  const extrato = {
    fileId,
    dataContrato: new Date().toLocaleDateString("pt-BR"),
    contratos: [
      { banco: "Banco A", parcela: 450.2, prazo: 48 },
      { banco: "Banco B", parcela: 322.5, prazo: 36 }
    ]
  };

  // salva json com nome = fileId
  const outputPath = `extratos/${fileId}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(extrato, null, 2));

  // agenda exclusão em 24h
  setTimeout(() => {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
      console.log(`Arquivo ${outputPath} excluído após 24h`);
    }
  }, 24 * 60 * 60 * 1000);

  return extrato;
}
