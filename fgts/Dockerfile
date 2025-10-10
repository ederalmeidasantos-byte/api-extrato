FROM node:18-alpine

WORKDIR /app/fgts

# Copiar arquivos
COPY . .

# Instalar dependências
RUN npm install

# Expor porta
EXPOSE 3005

# Comando para iniciar
CMD ["node", "server.js"]