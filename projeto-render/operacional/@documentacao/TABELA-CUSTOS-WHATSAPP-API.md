# 📊 Tabela de Custos - API WhatsApp Business

## 💰 Preços Oficiais Meta (Brasil)

| Tipo de Mensagem | Preço (USD) | Preço (BRL)** | Cobrança | Janela de Atendimento |
|------------------|-------------|---------------|----------|----------------------|
| **📢 Marketing** | $0,0625 | **R$ 0,36** | ✅ Sempre cobrado | ❌ Não aplicável |
| **⚙️ Utilidade** | $0,0068 | **R$ 0,039** | 🆓 Grátis na janela / 💸 Pago fora | ✅ 24h após última msg do cliente |
| **🔐 Autenticação** | $0,0068 | **R$ 0,039** | ✅ Sempre cobrado | ❌ Não aplicável |
| **🎧 Serviço** | $0,00 | **R$ 0,00** | 🆓 Sempre gratuito | ✅ Sempre gratuito |

**Cotação atual: USD 1,00 = BRL 5,75 (Out/2024)

## 📋 Detalhamento dos Tipos de Mensagem

### 📢 Marketing
- **Uso**: Promoções, ofertas, campanhas publicitárias
- **Cobrança**: Sempre paga
- **Limitações**: Requer opt-in do usuário

### ⚙️ Utilidade  
- **Uso**: Confirmações, atualizações de status, lembretes
- **Cobrança**: 
  - ✅ **GRÁTIS** - Dentro da janela de 24h
  - 💸 **PAGO** - Fora da janela de 24h
- **Exemplos**: Confirmação de pedido, status de entrega

### 🔐 Autenticação
- **Uso**: Códigos de verificação, autenticação 2FA
- **Cobrança**: Sempre paga
- **Limitações**: Apenas para autenticação

### 🎧 Serviço
- **Uso**: Resposta a dúvidas do cliente
- **Cobrança**: Sempre gratuito
- **Condição**: Cliente deve iniciar a conversa

## 💡 Estratégias para Reduzir Custos

### 🎯 Janela de Atendimento (24h)
- Use mensagens de **Utilidade** dentro das 24h = **GRÁTIS**
- Responda rapidamente às mensagens dos clientes
- Envie atualizações importantes dentro da janela

### 🔄 Otimização de Tipos
| ❌ Evite | ✅ Prefira |
|---------|-----------|
| Marketing fora de campanhas | Utilidade na janela de 24h |
| Múltiplas mensagens separadas | Uma mensagem consolidada |
| Autenticação desnecessária | Serviço para suporte |

## 🏢 Custos Adicionais de Provedores

### Conexão Direta (Meta Cloud API)
- ✅ **Apenas** tarifas oficiais da Meta
- ✅ Controle total
- ⚠️ Requer conhecimento técnico

### Provedores Terceirizados
| Provedor | Taxa Adicional | Observações | Custo Total/Msg (BRL) |
|----------|---------------|-------------|----------------------|
| **Twilio** | +$0,005 por mensagem | + taxas Meta | +R$ 0,029 |
| **360Dialog** | Varia por plano | + taxas Meta | Consultar |
| **WhatsApp Business** | Gratuito até 1000/mês | Limitações de API | R$ 0,00 |

## 📊 Simulador de Custos

### Exemplo: 1000 mensagens/mês

| Cenário | Tipo | Custo USD | Custo BRL** |
|---------|------|-----------|-------------|
| **Campanha Marketing** | Marketing | $62,50 | **R$ 359,38** |
| **Notificações (na janela)** | Utilidade | $0,00 | **R$ 0,00** |
| **Notificações (fora janela)** | Utilidade | $6,80 | **R$ 39,10** |
| **Códigos 2FA** | Autenticação | $6,80 | **R$ 39,10** |
| **Suporte Cliente** | Serviço | $0,00 | **R$ 0,00** |

### 💰 Calculadora de Custos Detalhada

| Volume Mensal | Marketing (BRL) | Utilidade Fora Janela (BRL) | Autenticação (BRL) |
|---------------|-----------------|----------------------------|-------------------|
| **100 msgs** | R$ 35,94 | R$ 3,91 | R$ 3,91 |
| **500 msgs** | R$ 179,69 | R$ 19,55 | R$ 19,55 |
| **1.000 msgs** | R$ 359,38 | R$ 39,10 | R$ 39,10 |
| **5.000 msgs** | R$ 1.796,88 | R$ 195,50 | R$ 195,50 |
| **10.000 msgs** | R$ 3.593,75 | R$ 391,00 | R$ 391,00 |

## ⚡ Dicas de Implementação

### 🎯 Para E-commerce
1. **Confirmação pedido** → Utilidade (dentro 24h) = Grátis
2. **Status entrega** → Utilidade (dentro 24h) = Grátis  
3. **Promoções** → Marketing = Pago
4. **Suporte** → Serviço = Grátis

### 🏦 Para Serviços Financeiros
1. **Código 2FA** → Autenticação = Pago
2. **Extrato enviado** → Utilidade = Grátis na janela
3. **Suporte** → Serviço = Grátis
4. **Ofertas produtos** → Marketing = Pago

## 📅 Atualizações de Preços

- **Última atualização**: Outubro 2024
- **Cotação USD/BRL**: R$ 5,75 (Out/2024)
- **Próxima revisão**: Meta revisa preços anualmente
- **Fonte oficial**: [WhatsApp Business API Pricing](https://developers.facebook.com/docs/whatsapp/pricing)

## 💡 Resumo Executivo em Real (BRL)

### 🎯 Custos por Mensagem
- **Marketing**: R$ 0,36 por mensagem
- **Utilidade** (fora janela): R$ 0,039 por mensagem  
- **Autenticação**: R$ 0,039 por mensagem
- **Serviço**: Gratuito
- **Utilidade** (dentro janela 24h): Gratuito

### 📊 Estimativa Mensal (1000 mensagens)
- **Só Marketing**: R$ 359,38
- **Só Utilidade (fora janela)**: R$ 39,10
- **Só Autenticação**: R$ 39,10
- **Mix E-commerce otimizado**: R$ 50-150 (usando janela 24h)
- **Suporte apenas**: R$ 0,00

---

## ⚠️ Observações Importantes

1. **Preços sujeitos a alteração** pela Meta
2. **Câmbio fluctua** - valores em BRL são aproximados
3. **Provedores podem cobrar taxas adicionais**
4. **Volumes altos podem ter descontos** (consulte Meta)
5. **Teste sempre** em ambiente de desenvolvimento

---

*Documento criado para API Lunas - Mantenha sempre atualizado*
