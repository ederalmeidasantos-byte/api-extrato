# 🏛️ Simulador INSS - Lunas Digital

Sistema inteligente de simulação de contratos consignados INSS com processamento de PDF via IA.

## 🚀 Funcionalidades

- **📄 Upload de PDF**: Extração automática de dados de extratos INSS
- **🧮 Simulação Inteligente**: Cálculo de troco em todos os bancos
- **📊 Roteiros Bancários**: Consulta de regras e exceções
- **🤖 IA GPT**: Processamento inteligente de documentos
- **💻 Interface Responsiva**: Design System Lunas Digital

## 🛠️ Tecnologias

- **Backend**: Node.js + Express
- **Frontend**: HTML5 + CSS3 + JavaScript
- **IA**: OpenAI GPT-4o/GPT-4o-mini
- **Upload**: Multer
- **Deploy**: Render.com

## 📁 Estrutura do Projeto

```
projeto-render/
├── backend/              # API e lógica
│   ├── server.js         # Servidor principal
│   ├── extrair-pdf.js    # Processamento PDF com GPT
│   ├── calculo.js        # Lógica de simulação
│   ├── roteiro-bancos.js # Regras bancárias
│   └── coeficientes_96.json
├── frontend/             # Interface web
│   ├── index.html        # Página inicial
│   ├── simulador.html    # Simulador
│   └── roteiros-bancos.html
├── uploads/              # PDFs temporários
├── package.json
├── render.yaml
├── Dockerfile
└── README.md
```

## 🚀 Deploy no Render

### 1. Preparação
```bash
# Clone o repositório
git clone <seu-repositorio>
cd projeto-render

# Instale dependências
npm install
```

### 2. Configuração no Render
1. Conecte seu repositório GitHub
2. Configure as variáveis de ambiente:
   - `OPENAI_API_KEY`: Sua chave da API OpenAI
   - `NODE_ENV`: production

### 3. Deploy Automático
O deploy acontece automaticamente a cada push para a branch `main`.

## 🔧 Configuração Local

### Pré-requisitos
- Node.js 18+
- Chave da API OpenAI

### Instalação
```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
export OPENAI_API_KEY=sua_chave_aqui

# Executar localmente
npm start
```

### Acesso
- **Local**: http://localhost:3000
- **Render**: https://simulador-inss.onrender.com

## 📋 APIs Disponíveis

### Upload de PDF
```http
POST /api/upload-pdf
Content-Type: multipart/form-data

pdf: arquivo.pdf
```

### Simulação de Troco
```http
POST /api/simular-troco
Content-Type: application/json

{
  "contratos": [...],
  "especie": "32",
  "diaAverbacao": "15"
}
```

### Roteiros Bancos
```http
GET /api/roteiros-bancos
```

### Health Check
```http
GET /api/health
```

## 🎯 Como Usar

1. **Upload**: Faça upload do extrato INSS em PDF
2. **Extração**: O sistema extrai automaticamente os dados
3. **Simulação**: Simule troco em todos os bancos
4. **Análise**: Consulte os resultados e exporte

## 🔒 Segurança

- Validação de tipos de arquivo (apenas PDF)
- Limite de tamanho (10MB)
- Limpeza automática de arquivos temporários
- Validação de entrada em todas as APIs

## 📊 Monitoramento

- Health check endpoint
- Logs detalhados
- Métricas de performance
- Tratamento de erros

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🆘 Suporte

Para suporte, entre em contato:
- Email: suporte@lunasdigital.com
- GitHub Issues: [Abrir Issue](https://github.com/lunas-digital/simulador-inss/issues)

---

Desenvolvido com ❤️ por [Lunas Digital](https://lunasdigital.com)
