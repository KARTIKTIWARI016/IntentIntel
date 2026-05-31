# IntentIntel — single image used by both the web and worker services.
# Debian slim so the better-sqlite3 native addon builds cleanly.
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production
# Build toolchain for native modules (better-sqlite3) + openssl for Prisma.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---- deps + build ----
FROM base AS build
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production
# Bring the full app (incl. node_modules so `npm start` and the tsx worker both run).
COPY --from=build /app ./
EXPOSE 3000
# The compose file overrides this for the worker service.
CMD ["npm", "run", "start"]
