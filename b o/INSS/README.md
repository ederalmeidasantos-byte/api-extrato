# 🏦 Simulador INSS - Sistema Completo

## 📋 Visão Geral

Sistema completo de simulação de empréstimos consignados para aposentados do INSS, incluindo:
- **Simulador interativo** com interface moderna e responsiva
- **Upload e processamento de extratos** via IA (GPT)
- **Página de detalhes da proposta** para clientes
- **Sistema de cache** para otimização de performance

## 🚀 Funcionalidades Principais

### 1. Simulador INSS (`simulador.html`)
- Interface moderna com design responsivo
- Upload de extratos PDF com processamento via IA
- Simulação automática de contratos
- Resumo fixo no rodapé (estilo carrinho de compras)
- Integração com Feather Icons

### 2. Processamento de Extratos (`extrair-pdf.js`)
- Upload de PDFs via multer
- Extração de dados via OpenAI GPT
- Cache inteligente com TTL configurável
- Salvamento automático em JSON

### 3. Página de Proposta (`detalhesdaproposta.html`)
- Interface otimizada para mobile (95% dos usuários)
- Modal de confirmação personalizado
- Separação visual entre contrato atual e novo
- Sistema de seleção de contratos

## 📁 Estrutura de Arquivos

```
INSS/
├── simulador.html              # Simulador principal
├── simulador-producao.html     # Versão sem botão de teste
├── simulador-logic.js          # Lógica do simulador
├── detalhesdaproposta.html     # Página de proposta do cliente
├── calculo.js                  # Cálculos de empréstimo
├── coeficientes_96.json        # Coeficientes para 96 meses
├── simulacao_inss.csv          # Dados de teste
├── dados-teste-simulador.json  # Dados de exemplo
└── README.md                   # Esta documentação
```

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Node.js, Express.js
- **Upload**: Multer
- **IA**: OpenAI GPT-4
- **Ícones**: Feather Icons
- **Cache**: Sistema customizado com TTL

## 🎨 Design System

### Cores Principais
- **Azul Principal**: `#3b82f6` → `#1d4ed8` (gradiente)
- **Azul Claro**: `#60a5fa` → `#1d4ed8`
- **Fundo**: `#ffffff`
- **Texto**: `#1e293b`

### Componentes
- **Botões**: Gradiente azul com hover effects
- **Cards**: Sombra sutil com bordas arredondadas
- **Modais**: Overlay com animações suaves
- **Formulários**: Inputs estilizados com validação

## 📱 Responsividade

### Mobile First (95% dos usuários)
- Layout otimizado para telas pequenas
- Botões com tamanho mínimo de 44px
- Navegação touch-friendly
- Textos legíveis sem zoom

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔧 Configuração

### 1. Dependências
```bash
npm install express multer openai p-queue
```

### 2. Variáveis de Ambiente
```env
OPENAI_API_KEY=sua_chave_aqui
```

### 3. Estrutura de Diretórios
```
var/
└── data/
    ├── extratos/          # PDFs e JSONs processados
    └── cache/            # Cache do sistema
```

## 🚀 Rotas da API

### Simulador
- `GET /simular` - Simulador principal
- `GET /simularteste` - Simulador com dados de teste
- `POST /extrairpdf` - Upload e processamento de PDF

### Proposta
- `GET /detalhesdaproposta/:id` - Página de proposta do cliente

### API
- `GET /api/extratos/:id` - Buscar extrato por ID

## 📊 Fluxo de Dados

### 1. Upload de Extrato
```
PDF → Multer → OpenAI GPT → JSON → Cache → Frontend
```

### 2. Simulação
```
JSON → Cálculos → Contratos → Interface → Proposta
```

### 3. Proposta
```
Contratos → Seleção → Modal → Confirmação → Sucesso
```

## 🎯 Funcionalidades Detalhadas

### Simulador
- ✅ Upload de PDF com validação
- ✅ Processamento via IA
- ✅ Simulação automática
- ✅ Interface responsiva
- ✅ Cache inteligente
- ✅ Resumo fixo no rodapé

### Proposta
- ✅ Design mobile-first
- ✅ Modal de confirmação
- ✅ Separação visual de contratos
- ✅ Seleção múltipla
- ✅ Validação de dados

### Sistema
- ✅ Cache com TTL
- ✅ Logs detalhados
- ✅ Tratamento de erros
- ✅ Backup automático

## 🔍 Debugging

### Logs do Sistema
```javascript
console.log('📄 PDF upload salvo em', pdfPath);
console.log('✅ JSON salvo em', jsonPath);
console.log('🚀 Iniciando extração de upload:', fileId);
```

### Verificação de Cache
```bash
# Verificar arquivos processados
ls var/data/extratos/

# Verificar cache
ls var/data/cache/
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Upload não funciona**
   - Verificar se multer está configurado
   - Verificar permissões de escrita
   - Verificar tamanho do arquivo

2. **Dados não carregam**
   - Verificar se JSON foi salvo
   - Verificar rota da API
   - Verificar cache do navegador

3. **Simulação não aparece**
   - Verificar se contratos existem
   - Verificar função de renderização
   - Verificar dados do cliente

## 📈 Performance

### Otimizações Implementadas
- Cache inteligente com TTL
- Lazy loading de componentes
- Compressão de imagens
- Minificação de CSS/JS
- CDN para ícones

### Métricas
- **Tempo de carregamento**: < 2s
- **Tamanho do bundle**: < 500KB
- **Cache hit rate**: > 90%

## 🔒 Segurança

### Medidas Implementadas
- Validação de tipos de arquivo
- Limite de tamanho de upload
- Sanitização de dados
- Rate limiting
- Logs de auditoria

## 📝 Changelog

### v1.0.0 (2025-01-01)
- ✅ Simulador completo
- ✅ Upload de extratos
- ✅ Página de proposta
- ✅ Sistema de cache
- ✅ Design responsivo
- ✅ Integração com IA

## 👥 Contribuição

### Como Contribuir
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

### Padrões de Código
- Use ESLint para JavaScript
- Use Prettier para formatação
- Documente funções complexas
- Teste em diferentes dispositivos

## 📞 Suporte

Para suporte técnico ou dúvidas:
- **Email**: suporte@lunasdigital.com
- **Documentação**: Este README
- **Issues**: GitHub Issues

## 📄 Licença

Este projeto é propriedade da Lunas Digital e está protegido por direitos autorais.

---

**Desenvolvido com ❤️ pela equipe Lunas Digital**