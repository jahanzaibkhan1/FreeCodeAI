FROM node:20-alpine

LABEL maintainer="Muhammad Jahanzaib <jahanzaibkhan1>"
LABEL description="FreeCodeAI — Free AI coding gateway with auto-fallback"

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

EXPOSE 3377 3378

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3377/health || exit 1

CMD ["node", "src/gateway/server.js"]
