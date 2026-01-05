# syntax=docker/dockerfile:1

FROM node:20-slim AS base
WORKDIR /app

# ----------------------------
# Dependencies (dev)
# ----------------------------
FROM base AS deps-dev
ENV NODE_ENV=development
COPY package.json ./
RUN npm install --include=dev --omit=optional --no-audit --no-fund

# ----------------------------
# Dev runtime (hot reload)
# ----------------------------
FROM deps-dev AS dev
COPY . .
EXPOSE 8081
CMD ["npm", "run", "dev"]

# ----------------------------
# Build (TS -> dist)
# ----------------------------
FROM deps-dev AS build
COPY . .
RUN npm run build

# ----------------------------
# Dependencies (prod)
# ----------------------------
FROM base AS deps
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# ----------------------------
# Prod runtime
# ----------------------------
FROM deps AS prod
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src
EXPOSE 8081
CMD ["npm", "run", "start"]
