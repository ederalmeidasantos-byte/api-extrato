import "dotenv/config";
import axios from "axios";
import qs from "qs";

console.log("🔍 DEBUG: Verificando como a senha está sendo enviada");
console.log("=====================================================");

// Carregar credenciais do .env
const CREDENTIALS = [];
for (let i = 1; process.env[`FGTS_USER_${i}`]; i++) {
  CREDENTIALS.push({
    username: process.env[`FGTS_USER_${i}`],
    password: process.env[`FGTS_PASS_${i}`],
  });
}

console.log(`📋 Credenciais encontradas: ${CREDENTIALS.length}`);

// Encontrar a credencial srcor1@hotmail.com
const credSrcor = CREDENTIALS.find(cred => cred.username === 'srcor1@hotmail.com');

if (!credSrcor) {
  console.log("❌ Credencial srcor1@hotmail.com não encontrada");
  process.exit(1);
}

console.log(`\n🔍 DEBUGGING CREDENCIAL: ${credSrcor.username}`);
console.log("=".repeat(50));

// Mostrar senha original do .env
console.log(`📝 Senha original do .env: "${credSrcor.password}"`);
console.log(`📏 Tamanho da senha: ${credSrcor.password.length} caracteres`);

// Mostrar caracteres especiais
console.log(`🔤 Caracteres da senha:`);
for (let i = 0; i < credSrcor.password.length; i++) {
  const char = credSrcor.password[i];
  const code = char.charCodeAt(0);
  console.log(`  ${i + 1}: '${char}' (código: ${code})`);
}

// Preparar dados de autenticação
const dadosAuth = {
  grant_type: "password",
  username: credSrcor.username,
  password: credSrcor.password,
  audience: "https://bff.v8sistema.com",
  scope: "offline_access",
  client_id: "DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn",
};

console.log(`\n📦 Dados de autenticação preparados:`);
console.log(JSON.stringify(dadosAuth, null, 2));

// Converter para form data
const data = qs.stringify(dadosAuth);
console.log(`\n📤 Dados convertidos para form-data:`);
console.log(`"${data}"`);

// Mostrar como seria decodificado
console.log(`\n🔍 Dados decodificados:`);
const decoded = qs.parse(data);
console.log(JSON.stringify(decoded, null, 2));

// Testar autenticação
console.log(`\n🧪 TESTANDO AUTENTICAÇÃO:`);
console.log("=".repeat(30));

try {
  const headers = { 
    "Content-Type": "application/x-www-form-urlencoded"
  };
  
  console.log("📤 Enviando requisição...");
  console.log("🔗 URL: https://auth.v8sistema.com/oauth/token");
  console.log("📋 Headers:", headers);
  console.log("📦 Body:", data);
  
  const res = await axios.post("https://auth.v8sistema.com/oauth/token", data, { 
    headers,
    timeout: 30000
  });

  console.log("✅ SUCESSO!");
  console.log("📥 Status:", res.status);
  console.log("📥 Response:", res.data);

} catch (err) {
  console.log("❌ ERRO!");
  console.log("📥 Status:", err.response?.status);
  console.log("📥 Data:", err.response?.data);
  console.log("📥 Headers:", err.response?.headers);
}









