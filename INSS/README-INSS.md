# Sistema INSS - Simulador e APIs

Sistema independente para processamento de extratos INSS, simulação de contratos e geração de propostas.

## 🚀 Início Rápido

### 1. Instalar dependências
```bash
cd INSS
npm install
```

### 2. Configurar variáveis de ambiente
Criar arquivo `.env` na raiz do projeto:
```env
OPENAI_API_KEY=sua_chave_aqui
INSS_PORT=3003
```

### 3. Iniciar o servidor
```bash
# Desenvolvimento
npm run dev

# Produção com PM2
npm run pm2

# Ou usar o script de deploy
./deploy-inss.sh
```

## 📁 Estrutura do Sistema

```
INSS/
├── server-inss.js          # Servidor principal
├── package.json            # Dependências
├── ecosystem-inss.config.cjs # Configuração PM2
├── nginx-inss.conf         # Configuração Nginx
├── simulador.html          # Interface do simulador
├── simulador-logic.js      # Lógica JavaScript
├── detalhesdaproposta.html # Página de detalhes
├── digitar-proposta.html   # Formulário de digitação
├── extrair_pdf.js          # Extração de PDFs
├── calculo.js              # Cálculos de simulação
├── bancos.js               # Dados dos bancos
├── beneficios.js           # Dados dos benefícios
└── uploads/                # PDFs temporários
```

## 🌐 URLs Disponíveis

### Interface
- **Simulador**: `/inss/simulador.html`
- **Detalhes da Proposta**: `/inss/detalhesdaproposta.html`
- **Formulário**: `/inss/digitar-proposta.html`

### APIs
- **POST** `/api/processar-extrato` - Upload e processamento de PDF
- **GET** `/api/calcular/:fileId` - Calcular simulação
- **GET** `/extrato/:fileId/raw` - Obter extrato processado
- **POST** `/extrair` - Extrair dados (compatibilidade)

## 🔧 Configuração

### Porta
O sistema INSS roda na porta **3003** por padrão.

### Nginx
Incluir o arquivo `nginx-inss.conf` na configuração principal do Nginx.

### PM2
```bash
pm2 start ecosystem-inss.config.cjs
pm2 status inss-sistema
pm2 logs inss-sistema
```

## 🧪 Testes

### Teste Local
```bash
node teste-inss-local.js
```

### Teste Manual
1. Acesse `http://localhost:3003/inss/simulador.html`
2. Faça upload de um PDF de extrato
3. Verifique se a simulação é calculada corretamente

## 📋 Funcionalidades

### ✅ Simulador
- Upload de extratos PDF
- Extração automática de dados
- Cálculo de simulações
- Interface responsiva
- Suporte a contingência

### ✅ APIs
- Processamento de PDFs
- Cálculos de margem
- Simulação de contratos
- Geração de propostas

### ✅ Compatibilidade
- Sistema independente
- Não interfere com outros sistemas
- Configuração isolada

## 🚨 Troubleshooting

### Servidor não inicia
```bash
# Verificar se a porta está livre
netstat -tulpn | grep 3003

# Verificar logs
pm2 logs inss-sistema
```

### APIs não respondem
```bash
# Verificar se o Nginx está configurado
nginx -t

# Reiniciar Nginx
systemctl restart nginx
```

### Simulador não carrega
- Verificar se o arquivo `simulador-logic.js` está acessível
- Verificar console do navegador para erros
- Verificar se a porta 3003 está aberta

## 📞 Suporte

Para problemas específicos do sistema INSS, verificar:
1. Logs do PM2: `pm2 logs inss-sistema`
2. Logs do Nginx: `/var/log/nginx/error.log`
3. Console do navegador para erros JavaScript


