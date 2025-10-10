# 📱 Guia de Uso - Integração WhatsApp CRM

## 🚀 Início Rápido

### 1. **Acessar a Página Principal**
```
http://72.60.159.149:3001/operacional/configuracoes-status-whatsapp-corrigido.html
```

### 2. **Configurar Integração**
```
http://72.60.159.149:3001/operacional/configuracoes-whatsapp-integracao.html
```

## 📋 Passo a Passo

### **Passo 1: Configurar Kentro API**

1. **Acesse a página de configuração**
2. **Preencha os campos:**
   - **URL da API**: `https://api.kentro.com.br/v1/whatsapp`
   - **Token de Acesso**: Seu token da Kentro
   - **Instância WhatsApp**: ID da sua instância
3. **Marque "Ativar integração Kentro"**
4. **Clique em "Salvar Configuração"**

### **Passo 2: Testar Conexão**

1. **Clique em "Testar Conexão"**
2. **Aguarde o resultado** (2-3 segundos)
3. **Se sucesso**: Status muda para "Conectado"
4. **Se erro**: Verifique URL e Token

### **Passo 3: Configurar Status**

1. **Volte para a página principal**
2. **Clique no botão verde WhatsApp** de qualquer status
3. **Configure a mensagem:**
   - **Integração**: Kentro
   - **Tipo**: Template ou Normal
   - **Se Template**: Escolha um template aprovado
   - **Se Normal**: Digite sua mensagem
4. **Veja o preview** em tempo real
5. **Clique em "Salvar Configuração"**

### **Passo 4: Testar Envio**

1. **Na página de configuração**
2. **Clique em "Testar Envio"**
3. **Aguarde o resultado** (3-5 segundos)
4. **Verifique os logs** de envio

## 🎯 Configurações por Status

### **Status do Formulário**

#### **Etapa 1 - Dados**
- **Template Recomendado**: Status Atualizado
- **Mensagem**: "Olá {nome}! Você está preenchendo os dados pessoais. Continue o formulário."

#### **Etapa 2 - Endereço**
- **Template Recomendado**: Status Atualizado
- **Mensagem**: "Olá {nome}! Você está preenchendo o endereço. Continue o formulário."

#### **Etapa 3 - Benefício**
- **Template Recomendado**: Status Atualizado
- **Mensagem**: "Olá {nome}! Você está preenchendo os dados do benefício. Continue o formulário."

#### **Etapa 4 - Bancário**
- **Template Recomendado**: Status Atualizado
- **Mensagem**: "Olá {nome}! Você está preenchendo os dados bancários. Continue o formulário."

#### **Cliente Finalizou**
- **Template Recomendado**: Status Atualizado
- **Mensagem**: "Olá {nome}! Obrigado por finalizar o formulário. Sua proposta será analisada."

### **Status da Proposta**

#### **Na Fila**
- **Template Recomendado**: Proposta Pendente
- **Mensagem**: "Olá {nome}! Sua proposta está na fila para processamento."

#### **Em Digitação**
- **Template Recomendado**: Status Atualizado
- **Mensagem**: "Olá {nome}! Sua proposta está sendo digitada pela nossa equipe."

#### **Finalizada**
- **Template Recomendado**: Aprovação de Proposta
- **Mensagem**: "Parabéns {nome}! Sua proposta foi aprovada no valor de {valor}."

#### **Pendente**
- **Template Recomendado**: Proposta Pendente
- **Mensagem**: "Olá {nome}! Sua proposta está pendente de análise."

## 🔧 Variáveis Disponíveis

### **Variáveis Globais**
- `{nome}` - Nome do cliente
- `{etapa}` - Etapa atual
- `{valor}` - Valor da proposta
- `{banco}` - Banco da proposta
- `{telefone}` - Telefone do cliente
- `{cpf}` - CPF do cliente

### **Como Usar Variáveis**
1. **Digite `{`** no campo de mensagem
2. **Escolha a variável** da lista
3. **Clique na variável** para inserir
4. **Veja o preview** atualizado

## 📊 Monitoramento

### **Estatísticas**
- **Mensagens Enviadas**: Total de mensagens
- **Taxa de Sucesso**: Percentual de sucesso
- **Integrações Ativas**: Quantas estão conectadas
- **Templates Aprovados**: Quantos templates estão aprovados

### **Logs de Envio**
- **SUCCESS**: Mensagem enviada com sucesso
- **ERROR**: Erro no envio
- **WARNING**: Aviso (template não encontrado, etc.)
- **INFO**: Informações gerais

### **Como Ver Logs**
1. **Acesse a página de configuração**
2. **Role até "Logs de Envio"**
3. **Veja o histórico** em tempo real
4. **Use "Limpar Logs"** para limpar

## 🚨 Solução de Problemas

### **Erro: "URL e Token são obrigatórios"**
- **Solução**: Preencha os campos URL e Token na configuração

### **Erro: "Falha na autenticação"**
- **Solução**: Verifique se o token está correto

### **Erro: "Template não encontrado"**
- **Solução**: Use um template aprovado ou mensagem normal

### **Erro: "Falha na conexão"**
- **Solução**: Verifique a URL da API e conectividade

### **Modal não abre**
- **Solução**: Verifique se há erros no console do navegador

### **Preview não atualiza**
- **Solução**: Recarregue a página e tente novamente

## 📞 Suporte

### **Links Úteis**
- **Página Principal**: `http://72.60.159.149:3001/operacional/configuracoes-status-whatsapp-corrigido.html`
- **Configuração**: `http://72.60.159.149:3001/operacional/configuracoes-whatsapp-integracao.html`

### **Para Desenvolvedores**
- **Console do Navegador**: F12 para ver erros
- **Network Tab**: Para ver requisições da API
- **LocalStorage**: Para ver configurações salvas

### **Contato**
- **Projeto**: Sistema CRM Lunas Digital
- **Desenvolvedor**: Assistente AI
- **Data**: Janeiro 2025

---

## 📝 Notas Importantes

1. **Sempre teste** antes de usar em produção
2. **Mantenha backups** das configurações
3. **Monitore os logs** regularmente
4. **Atualize os templates** quando necessário
5. **Verifique a conectividade** periodicamente
