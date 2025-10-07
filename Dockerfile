# Dockerfile para API Lunas Digital
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p var/data/uploads var/data/extratos var/data/clientes var/data/propostas

# Expor porta
EXPOSE 3002

# Comando de inicialização
CMD ["node", "server.js"]