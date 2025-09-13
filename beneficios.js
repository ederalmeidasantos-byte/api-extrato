// beneficios.js (ESM)
// Tabela de espécies do INSS (código ↔ nome) + mapBeneficio(raw)

const BENEFICIOS = {
  // Aposentadoria por Idade
  "07": "Aposentadoria por idade do trabalhador rural",
  "08": "Aposentadoria por idade do empregador rural",
  "41": "Aposentadoria por idade",
  "52": "Aposentadoria por idade",
  "78": "Aposentadoria por idade (Extinto Plano Básico)",
  "81": "Aposentadoria por idade compulsória (Ex-SASSE)",

  // Aposentadoria por Invalidez
  "04": "Aposentadoria por invalidez do trabalhador rural",
  "06": "Aposentadoria por invalidez do empregador rural",
  "32": "Aposentadoria por invalidez previdenciária",
  "33": "Aposentadoria por invalidez de aeronauta",
  "34": "Aposentadoria por invalidez de ex-combatente marítimo (Lei nº 1.756/52)",
  "51": "Aposentadoria por invalidez (Extinto Plano Básico)",
  "83": "Aposentadoria por invalidez (Ex-SASSE)",

  // Tempo de Contribuição
  "42": "APOSENTADORIA POR TEMPO DE CONTRIBUICAO",
  "43": "Aposentadoria por tempo de contribuição de ex-combatente",
  "44": "Aposentadoria por tempo de contribuição de aeronauta",
  "45": "Aposentadoria por tempo de contribuição de jornalista profissional",
  "46": "Aposentadoria por tempo de contribuição especial",
  "49": "Aposentadoria por tempo de contribuição ordinária",
  "57": "Aposentadoria por tempo de contribuição de professor (Emenda Const.18/81)",
  "72": "Apos. por tempo de contribuição de ex-combatente marítimo (Lei 1.756/52)",
  "82": "Aposentadoria por tempo de contribuição (Ex-SASSE)",

  // Pensão por morte
  "01": "Pensão por morte do trabalhador rural",
  "03": "Pensão por morte do empregador rural",
  "21": "Pensão por morte previdenciária",
  "23": "Pensão por morte de ex-combatente",
  "27": "Pensão por morte de servidor público federal com dupla aposentadoria",
  "28": "Pensão por morte do Regime Geral (Decreto nº 20.465/31)",
  "29": "Pensão por morte de ex-combatente marítimo (Lei nº 1.756/52)",
  "55": "Pensão por morte (Extinto Plano Básico)",
  "84": "Pensão por morte (Ex-SASSE)",

  // Auxílios
  "13": "Auxílio-doença do trabalhador rural",
  "15": "Auxílio-reclusão do trabalhador rural",
  "25": "Auxílio-reclusão",
  "31": "Auxílio-doença previdenciário",
  "36": "Auxílio Acidente",
  "50": "Auxílio-doença (Extinto Plano Básico)",

  // Benefícios Acidentários
  "02": "Pensão por morte por acidente do trabalho do trabalhador rural",
  "05": "Aposentadoria por invalidez por acidente do trabalho do trabalhador rural",
  "10": "Auxílio-doença por acidente do trabalho do trabalhador rural",
  "91": "Auxílio-doença por acidente do trabalho",
  "92": "APOSENTADORIA INVALIDEZ - ACIDENTE DO TRABALHO",
  "93": "Pensão por morte por acidente do trabalho",
  "94": "Auxílio-acidente por acidente do trabalho",
  "95": "Auxílio-suplementar por acidente do trabalho",

  // Benefícios Assistenciais (LOAS e correlatos)
  "11": "Renda mensal vitalícia por invalidez do trabalhador rural (Lei nº 6.179/74)",
  "12": "Renda mensal vitalícia por idade do trabalhador rural (Lei nº 6.179/74)",
  "30": "Renda mensal vitalícia por invalidez (Lei nº 6.179/74)",
  "40": "Renda mensal vitalícia por idade (Lei nº 6.179/74)",
  "85": "Pensão mensal vitalícia do seringueiro (Lei nº 7.986/89)",
  "86": "Pensão mensal vitalícia do dependente do seringueiro (Lei nº 7.986/89)",
  "87": "BENEFICIO DE PRESTACAO CONTINUADA A PESSOA COM DEFICIENCIA",
  "88": "BENEFICIO DE PRESTACAO CONTINUADA A PESSOA IDOSA",

  // Espécies Diversas
  "47": "Abono de permanência em serviço 25%",
  "48": "Abono de permanência em serviço 20%",
  "68": "Pecúlio especial de aposentadoria",
  "79": "Abono de servidor aposentado pela autarquia empregadora (Lei 1.756/52)",
  "80": "Salário-maternidade",

  // Encargos Previdenciários da União / Especiais
  "22": "Pensão por morte estatutária",
  "26": "Pensão especial (Lei nº 593/48)",
  "37": "Aposentadoria de extranumerário da União",
  "38": "Aposentadoria da extinta CAPIN",
  "54": "Pensão especial vitalícia (Lei nº 9.793/99)",
  "56": "Pensão mensal vitalícia por síndrome de talidomida (Lei nº 7.070/82)",
  "58": "Aposentadoria excepcional do anistiado (Lei nº 6.683/79)",
  "59": "Pensão por morte excepcional do anistiado (Lei nº 6.683/79)",
  "60": "Pensão especial mensal vitalícia (Lei 10.923/2004)",
  "76": "Salário-família estatutário da RFFSA (Decreto-lei nº 956/69)",
  "89": "Pensão especial aos dependentes de vítimas fatais por contaminação na hemodiálise",
  "96": "Pensão especial às pessoas atingidas pela hanseníase (Lei nº 11.520/2007)"
};

// chaves auxiliares para nomes genéricos mais comuns → código "padrão"
const DEFAULT_BY_GROUP = [
  { key: "aposentadoria por idade", codigo: "41" },
  { key: "aposentadoria por invalidez", codigo: "32" },
  { key: "aposentadoria por tempo de contribuicao", codigo: "42" },
  { key: "pensao por morte", codigo: "21" },
  { key: "auxilio-doenca", codigo: "31" },
  { key: "auxilio acidente", codigo: "36" },
  { key: "amparo assistencial ao idoso", codigo: "88" },
  { key: "amparo assistencial a pessoa com deficiencia", codigo: "87" },
];

function normalize(s) {
  if (!s) return "";
  return s
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s%\-\.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * mapBeneficio(raw) → { codigo, nome }
 * - raw pode ser código (ex.: "33") ou texto (ex.: "Aposentadoria por invalidez previdenciária")
 */
export function mapBeneficio(raw) {
  if (!raw) return { codigo: null, nome: null };

  const rawStr = String(raw).trim();

  // 1) Se veio código, mapeia direto
  const m = rawStr.match(/\d{1,3}/);
  if (m) {
    const codigo = m[0].padStart(2, "0");
    const nome = BENEFICIOS[codigo] || null;
    if (nome) return { codigo, nome };
  }

  // 2) Tenta por nome/sinônimo
  const norm = normalize(rawStr);

  // 2.1) tenta grupos padrão
  for (const g of DEFAULT_BY_GROUP) {
    if (norm.includes(g.key)) {
      const nome = BENEFICIOS[g.codigo] || null;
      return { codigo: g.codigo, nome };
    }
  }

  // 2.2) aproximação simples: acha o primeiro cujo nome "esteja contido" no texto
  for (const [codigo, nome] of Object.entries(BENEFICIOS)) {
    if (norm.includes(normalize(nome))) {
      return { codigo, nome };
    }
  }

  // 2.3) falhou → nulls
  return { codigo: null, nome: null };
}

export { BENEFICIOS };
