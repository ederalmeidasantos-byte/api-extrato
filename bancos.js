// bancos.js
export const bancos = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "004", nome: "BNB - Banco do Nordeste" },
  { codigo: "012", nome: "Banco Inbursa" },
  { codigo: "025", nome: "Banco Alfa" },
  { codigo: "033", nome: "Santander" },
  { codigo: "041", nome: "Banrisul" },
  { codigo: "070", nome: "Picpay" },
  { codigo: "104", nome: "Caixa Econômica Federal" },
  { codigo: "121", nome: "Agibank" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "254", nome: "Paraná Banco" },
  { codigo: "260", nome: "Nu CFI" },
  { codigo: "326", nome: "Parati – Crédito" },
  { codigo: "329", nome: "QI Sociedade de Crédito" },
  { codigo: "341", nome: "Itaú" },
  { codigo: "389", nome: "Banco Mercantil do Brasil" },
  { codigo: "422", nome: "Safra" },
  { codigo: "623", nome: "Banco PAN" },
  { codigo: "626", nome: "C6 / C6 Consignado / BANCO C6 CONSIGNADO S A" },
  { codigo: "643", nome: "Banco Pine" },
  { codigo: "707", nome: "Daycoval" },
  { codigo: "752", nome: "BNP Paribas" },
  { codigo: "754", nome: "Sicoob" },
  { codigo: "905", nome: "Banco Alfa" },
  { codigo: "935", nome: "Facta" },
  { codigo: "908", nome: "PARATICFI S A / PARATI CFI S A" },
  { codigo: "029", nome: "Itau"}
];

/**
 * Localiza banco por nome ou código
 * - Se passar código, busca por código
 * - Se passar nome, tenta achar pelo nome (normalizado)
 */
export function encontrarBanco(valor) {
  if (!valor) return { codigo: null, nome: null };

  const s = String(valor).trim();

  // Caso seja código numérico
  if (/^\d+$/.test(s)) {
    const achado = bancos.find(b => b.codigo === s);
    return achado || { codigo: s, nome: null };
  }

  // Caso seja nome -> normalizar acentuação e comparar
  const normalizado = s.toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/S\.A|SA|S A/g, "")
    .trim();

  const achado = bancos.find(b =>
    normalizado.includes(
      b.nome.toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/S\.A|SA|S A/g, "")
        .trim()
    )
  );

  return achado || { codigo: null, nome: s };
}
