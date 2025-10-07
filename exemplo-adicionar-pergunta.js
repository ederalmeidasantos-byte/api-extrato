// ================== EXEMPLO: COMO ADICIONAR PERGUNTA ==================

console.log("=== EXEMPLO: ADICIONANDO NOVA PERGUNTA AO FAQ ===\n");

// ================== ANTES: Código atual ==================
console.log("📝 ANTES - Código atual no arquivo sistema-faq-inteligente.js:");
console.log(`
carregarBaseConhecimento() {
  return {
    // Perguntas sobre parcelas
    parcelas: {
      perguntas: [
        "qual a parcela",
        "quanto e a parcela",
        "valor da parcela",
        "parcela atual",
        "nova parcela",
        "quanto vou pagar",
        "valor mensal"
      ],
      resposta: (dadosCliente) => {
        // ... código da resposta
      }
    }
  };
}
`);

// ================== DEPOIS: Código com nova pergunta ==================
console.log("✅ DEPOIS - Adicionando nova pergunta:");
console.log(`
carregarBaseConhecimento() {
  return {
    // Perguntas sobre parcelas
    parcelas: {
      perguntas: [
        "qual a parcela",
        "quanto e a parcela",
        "valor da parcela",
        "parcela atual",
        "nova parcela",
        "quanto vou pagar",
        "valor mensal",
        // NOVA PERGUNTA ADICIONADA:
        "quanto custa por mes",
        "valor da prestacao"
      ],
      resposta: (dadosCliente) => {
        // ... código da resposta (mesmo)
      }
    }
  };
}
`);

// ================== EXEMPLO COMPLETO: Nova categoria ==================
console.log("🆕 EXEMPLO: Adicionando nova categoria 'documentos':");
console.log(`
carregarBaseConhecimento() {
  return {
    // ... categorias existentes ...
    
    // NOVA CATEGORIA ADICIONADA:
    documentos: {
      perguntas: [
        "quais documentos",
        "preciso de documentos",
        "documentos necessarios",
        "o que levar",
        "lista de documentos"
      ],
      resposta: (dadosCliente) => {
        return \`Para a portabilidade, você precisará dos seguintes documentos:

DOCUMENTOS OBRIGATÓRIOS:
- RG ou CNH (válidos)
- CPF
- Comprovante de residência (atualizado)
- Extrato do empréstimo atual
- Comprovante de renda

DOCUMENTOS ADICIONAIS:
- Comprovante de benefício INSS
- Extrato bancário (3 meses)
- Comprovante de vínculo empregatício

Todos os documentos devem estar legíveis e atualizados.\`;
      }
    }
  };
}
`);

// ================== PASSOS PARA APLICAR ==================
console.log("\n🚀 PASSOS PARA APLICAR A MUDANÇA:");
console.log("1. Abrir arquivo: chatgpt-vendedor/sistema-faq-inteligente.js");
console.log("2. Localizar função carregarBaseConhecimento() (linha ~13)");
console.log("3. Adicionar nova pergunta no array perguntas");
console.log("4. Salvar o arquivo");
console.log("5. Fazer commit: git add . && git commit -m 'Add nova pergunta'");
console.log("6. Fazer push: git push");
console.log("7. Deploy: ssh root@lunasdigital.com.br 'cd /root/api-lunas/API\\ Lunas && git pull && pm2 restart api-extrato'");

// ================== TESTE DA NOVA PERGUNTA ==================
console.log("\n🧪 TESTE: Simulando nova pergunta 'quanto custa por mes':");
console.log("Mensagem: 'quanto custa por mes'");
console.log("Sistema: Analisa mensagem...");
console.log("Sistema: Encontra palavra 'custa' na categoria 'parcelas'");
console.log("Sistema: Confiança: 90%");
console.log("Sistema: Resposta FAQ (0 tokens)");
console.log("Resposta: Suas propostas de portabilidade: [dados reais]");

console.log("\n✅ NOVA PERGUNTA ADICIONADA COM SUCESSO!");

