# Dockerfile para API Lunas
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache git

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p var/data/clientes var/data/extratos var/data/logs

# Definir permissões
RUN chmod +x deploy-webhook.sh

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["node", "server.js"]