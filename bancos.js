// bancos.js
export const bancoMap = {
  "ITAÚ": "Itaú",
  "ITAÚ CONSIGNADO": "Itaú CONSIGNADO",
  "C6": "C6",
  "FACTA": "Facta",
  "QI SOCIEDADE": "Sociedade",
  "BRASIL": "Banco do Brasil",
  "AGIBANK": "Agibank",
  "PINE": "Pine",
  "BMG": "BMG",
  "OLE": "Olé",
  "DAYCOVAL": "Daycoval",
  "SAFRA": "Safra",
  "PAN": "Pan",
  "BRADESCO": "Bradesco",
  "SANTANDER": "Santander",
  "CAIXA": "Caixa",
  "BANRISUL": "Banrisul",
  "BV": "BV"
};

export function mapBanco(nomeBruto = "") {
  const b = nomeBruto.toUpperCase();
  const key = Object.keys(bancoMap).find(k => b.includes(k));
  return key ? bancoMap[key] : nomeBruto.split(" ")[0];
}
