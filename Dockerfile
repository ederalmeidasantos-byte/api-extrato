FROM node:20-alpine

# Instalar dependências do sistema para PDF
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Configurar diretório de trabalho
WORKDIR /usr/src/app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --production

# Copiar código fonte
COPY . .

# Criar diretórios necessários
RUN mkdir -p var/data/extratos var/data/clientes var/data/propostas var/data/uploads

# Expor porta
EXPOSE 3002

# Comando de inicialização
CMD ["node", "server.js"]