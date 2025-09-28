# 🧪 Teste Menu FGTS - Versão Independente

Esta é uma versão de teste independente do sistema de menu FGTS, criada para testar funcionalidades sem modificar os arquivos principais do projeto.

## 🚀 Como Usar

### 1. Instalar Dependências
```bash
cd teste-menu
npm install
```

### 2. Executar Servidor de Teste
```bash
npm start
```

### 3. Acessar Interface
- **Página Principal:** http://localhost:3001/teste-menu
- **Página Completa:** http://localhost:3001/teste-completo
- **API Status:** http://localhost:3001/api/status

## 📁 Estrutura dos Arquivos

```
teste-menu/
├── servidor-teste.js      # Servidor Express independente
├── index-teste.html       # Interface principal de teste
├── menu-teste.js          # JavaScript do menu (versão teste)
├── package.json           # Dependências do projeto
└── README.md             # Este arquivo
```

## 🎯 Funcionalidades Testáveis

### ✅ Menu de Configurações
- Botão ⚙️ para abrir/fechar sidebar
- Configurações de horário comercial
- Configurações de performance
- Botões de teste integrados

### ✅ APIs de Teste
- `/api/status` - Status do servidor
- `/api/config` - Configurações atuais
- `/api/cache` - Estado do cache
- `/api/teste-socket` - Teste Socket.IO

### ✅ Socket.IO
- Conexão em tempo real
- Emissão de eventos de teste
- Logs em tempo real

## 🔧 Vantagens desta Versão

1. **Independente:** Não modifica arquivos principais
2. **Isolada:** Porta 3001 (diferente do projeto principal)
3. **Testável:** APIs mockadas para testes
4. **Segura:** Pode ser deletada sem problemas
5. **Flexível:** Fácil de modificar e testar

## 🗑️ Limpeza

Para remover completamente:
```bash
cd ..
rm -rf teste-menu
```

## 📝 Notas

- Esta versão usa porta **3001** para não conflitar com o projeto principal (porta 3000)
- Todas as funcionalidades são simuladas/mockadas
- Ideal para testar interface e lógica do menu
- Não afeta o projeto principal em nenhum momento

