# Build context: repository root (see docker-compose.yml).
# Produces a single image: Fastify API + MCP + built SPA via WEB_ROOT.

# --- Frontend (Vite) ---
FROM node:22-bookworm-slim AS web-build
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json postcss.config.js tailwind.config.js ./
COPY src ./src
RUN npm run build

# --- API (TypeScript) ---
FROM node:22-bookworm-slim AS api-build
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# --- Runtime ---
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000
ENV WEB_ROOT=/app/web

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=api-build /app/dist ./dist
COPY --from=web-build /web/dist ./web

EXPOSE 4000
CMD ["node", "dist/index.js"]
