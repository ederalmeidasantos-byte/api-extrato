// roteiro-inss.js
export const procedimentosINSS = [
  { codigo: "001", nome: "Aposentadoria por Idade", descricao: "Aposentadoria por idade com tempo mínimo de contribuição", prazo: "45 dias", documentos: ["RG", "CPF", "Comprovante de Residência", "Carteira de Trabalho"] },
  { codigo: "002", nome: "Aposentadoria por Tempo de Contribuição", descricao: "Aposentadoria por tempo de contribuição", prazo: "30 dias", documentos: ["RG", "CPF", "Carteira de Trabalho", "Comprovantes de Contribuição"] },
  { codigo: "003", nome: "Aposentadoria Especial", descricao: "Aposentadoria especial por exposição a agentes nocivos", prazo: "60 dias", documentos: ["RG", "CPF", "Carteira de Trabalho", "Laudo Técnico", "Comprovantes de Contribuição"] },
  { codigo: "004", nome: "Auxílio-Doença", descricao: "Benefício por incapacidade temporária", prazo: "15 dias", documentos: ["RG", "CPF", "Atestado Médico", "Carteira de Trabalho"] },
  { codigo: "005", nome: "Auxílio-Acidente", descricao: "Benefício por acidente de trabalho", prazo: "20 dias", documentos: ["RG", "CPF", "CAT", "Atestado Médico", "Carteira de Trabalho"] },
  { codigo: "006", nome: "Aposentadoria por Invalidez", descricao: "Aposentadoria por incapacidade permanente", prazo: "45 dias", documentos: ["RG", "CPF", "Laudo Médico", "Carteira de Trabalho"] },
  { codigo: "007", nome: "Pensão por Morte", descricao: "Benefício pago aos dependentes do segurado falecido", prazo: "30 dias", documentos: ["RG", "CPF", "Certidão de Óbito", "Comprovante de Dependentes"] },
  { codigo: "008", nome: "Auxílio-Reclusão", descricao: "Benefício pago aos dependentes do segurado preso", prazo: "20 dias", documentos: ["RG", "CPF", "Certidão de Prisão", "Comprovante de Dependentes"] },
  { codigo: "009", nome: "Salário-Maternidade", descricao: "Benefício pago às seguradas em caso de parto ou adoção", prazo: "10 dias", documentos: ["RG", "CPF", "Carteira de Trabalho", "Certidão de Nascimento"] },
  { codigo: "010", nome: "Auxílio-Funeral", descricao: "Benefício para custeio de funeral", prazo: "5 dias", documentos: ["RG", "CPF", "Certidão de Óbito", "Comprovante de Gastos"] },
  { codigo: "011", nome: "Revisão de Benefício", descricao: "Revisão de benefício já concedido", prazo: "60 dias", documentos: ["RG", "CPF", "Documentos que comprovem erro", "Comprovantes de Contribuição"] },
  { codigo: "012", nome: "Restabelecimento de Benefício", descricao: "Restabelecimento de benefício suspenso", prazo: "30 dias", documentos: ["RG", "CPF", "Documentos que comprovem regularização"] },
  { codigo: "013", nome: "Aposentadoria Rural", descricao: "Aposentadoria para trabalhador rural", prazo: "45 dias", documentos: ["RG", "CPF", "Comprovante de Atividade Rural", "Carteira de Trabalho"] },
  { codigo: "014", nome: "Auxílio-Doença Rural", descricao: "Auxílio-doença para trabalhador rural", prazo: "20 dias", documentos: ["RG", "CPF", "Atestado Médico", "Comprovante de Atividade Rural"] },
  { codigo: "015", nome: "Pensão Rural", descricao: "Pensão por morte para trabalhador rural", prazo: "30 dias", documentos: ["RG", "CPF", "Certidão de Óbito", "Comprovante de Atividade Rural"] },
  { codigo: "016", nome: "Aposentadoria por Idade Rural", descricao: "Aposentadoria por idade para trabalhador rural", prazo: "45 dias", documentos: ["RG", "CPF", "Comprovante de Atividade Rural", "Carteira de Trabalho"] },
  { codigo: "017", nome: "Auxílio-Inclusão", descricao: "Benefício assistencial para pessoa com deficiência", prazo: "90 dias", documentos: ["RG", "CPF", "Laudo Médico", "Comprovante de Renda", "Comprovante de Residência"] },
  { codigo: "018", nome: "BPC - Idoso", descricao: "Benefício de Prestação Continuada para idosos", prazo: "90 dias", documentos: ["RG", "CPF", "Comprovante de Renda", "Comprovante de Residência"] },
  { codigo: "019", nome: "BPC - Deficiente", descricao: "Benefício de Prestação Continuada para deficientes", prazo: "90 dias", documentos: ["RG", "CPF", "Laudo Médico", "Comprovante de Renda", "Comprovante de Residência"] },
  { codigo: "020", nome: "Aposentadoria por Idade Urbana", descricao: "Aposentadoria por idade para trabalhador urbano", prazo: "45 dias", documentos: ["RG", "CPF", "Comprovante de Residência", "Carteira de Trabalho"] }
];

/**
 * Localiza procedimento INSS por nome, código ou descrição
 * - Se passar código, busca por código
 * - Se passar nome, tenta achar pelo nome (normalizado)
 * - Se passar descrição, busca por palavras-chave
 */
export function encontrarProcedimento(valor) {
  if (!valor) return { codigo: null, nome: null, descricao: null, prazo: null, documentos: [] };

  let s = String(valor).trim();

  // Normalizar código para 3 dígitos
  if (/^\d+$/.test(s)) {
    s = s.padStart(3, "0"); // "1" vira "001"
    const achado = procedimentosINSS.find(p => p.codigo === s);
    return achado || { codigo: s, nome: null, descricao: null, prazo: null, documentos: [] };
  }

  // Caso seja nome ou descrição -> normalizar acentuação e comparar
  const normalizado = s.toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/BPC|AUXILIO|APOSENTADORIA/g, "")
    .trim();

  const achado = procedimentosINSS.find(p => {
    const nomeNormalizado = p.nome.toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/BPC|AUXILIO|APOSENTADORIA/g, "")
      .trim();
    
    const descricaoNormalizada = p.descricao.toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/BPC|AUXILIO|APOSENTADORIA/g, "")
      .trim();

    return normalizado.includes(nomeNormalizado) || 
           normalizado.includes(descricaoNormalizada) ||
           nomeNormalizado.includes(normalizado) ||
           descricaoNormalizada.includes(normalizado);
  });

  return achado || { codigo: null, nome: s, descricao: null, prazo: null, documentos: [] };
}

/**
 * Busca procedimentos por categoria
 */
export function buscarPorCategoria(categoria) {
  const categorias = {
    'aposentadoria': ['001', '002', '003', '006', '013', '016', '020'],
    'auxilio': ['004', '005', '014', '017'],
    'pensao': ['007', '008', '015'],
    'bpc': ['017', '018', '019'],
    'rural': ['013', '014', '015', '016'],
    'revisao': ['011', '012']
  };

  const codigos = categorias[categoria.toLowerCase()] || [];
  return procedimentosINSS.filter(p => codigos.includes(p.codigo));
}

/**
 * Lista todos os procedimentos disponíveis
 */
export function listarTodosProcedimentos() {
  return procedimentosINSS;
}

/**
 * Gera relatório de procedimento
 */
export function gerarRelatorioProcedimento(codigo) {
  const procedimento = encontrarProcedimento(codigo);
  
  if (!procedimento.codigo) {
    return "Procedimento não encontrado";
  }

  return `
=== ROTEIRO OPERACIONAL INSS ===
Código: ${procedimento.codigo}
Nome: ${procedimento.nome}
Descrição: ${procedimento.descricao}
Prazo de Análise: ${procedimento.prazo}

DOCUMENTOS NECESSÁRIOS:
${procedimento.documentos.map((doc, index) => `${index + 1}. ${doc}`).join('\n')}

OBSERVAÇÕES:
- Todos os documentos devem estar em bom estado de conservação
- Cópias devem ser legíveis e autenticadas quando necessário
- Prazo de análise pode variar conforme complexidade do caso
- Consulte sempre a legislação vigente
  `;
}
