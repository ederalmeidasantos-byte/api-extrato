// bancos.js
export const bancos = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "004", nome: "BNB - Banco do Nordeste" },
  { codigo: "012", nome: "Banco Inbursa" },
  { codigo: "025", nome: "Banco Alfa" },
  { codigo: "033", nome: "Santander" },
  { codigo: "041", nome: "Banrisul" },
  { codigo: "070", nome: "Picpay" },
  { codigo: "104", nome: "Caixa" },
  { codigo: "121", nome: "Agibank" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "254", nome: "Parana" },
  { codigo: "260", nome: "Nu Bank" },
  { codigo: "326", nome: "Parati" },
  { codigo: "329", nome: "QI Sociedade de Crédito" },
  { codigo: "341", nome: "Itaú" },
  { codigo: "389", nome: "Mercantil do Brasil" },
  { codigo: "422", nome: "Safra" },
  { codigo: "623", nome: "PAN" },
  { codigo: "626", nome: "C6" },
  { codigo: "643", nome: "Banco Pine" },
  { codigo: "707", nome: "Daycoval" },
  { codigo: "752", nome: "BNP Paribas" },
  { codigo: "754", nome: "Sicoob" },
  { codigo: "905", nome: "Banco Alfa" },
  { codigo: "935", nome: "Facta" },
  { codigo: "908", nome: "PARATI" },
  { codigo: "077", nome: "INTER" },
  { codigo: "330", nome: "BARI" },
  { codigo: "029", nome: "Itau consignado"},
  { codigo: "925", nome: "BRB"},
  { codigo: "081", nome: "PAGBANK"}


  
];

/**
 * Localiza banco por nome ou código
 * - Se passar código, busca por código
 * - Se passar nome, tenta achar pelo nome (normalizado)
 */
export function encontrarBanco(valor) {
  if (!valor) return { codigo: null, nome: null };

  let s = String(valor).trim();

  // Normalizar código para 3 dígitos
  if (/^\d+$/.test(s)) {
    s = s.padStart(3, "0"); // 🔹 Agora "33" vira "033"
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
