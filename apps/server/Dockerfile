FROM node:22-alpine

WORKDIR /app

# Instala as dependências dos workspaces antes de copiar o código:
# alterações em src/ não invalidam esta camada.
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --omit=dev

COPY apps/server ./apps/server
COPY packages/shared ./packages/shared

# O .env NÃO entra na imagem: o Compose injeta as variáveis em runtime.
EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "@pokerirl/server"]
