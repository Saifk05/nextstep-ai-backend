# ---------- Install all dependencies ----------
FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


# ---------- Build NestJS ----------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build


# ---------- Production image ----------
FROM node:22-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]