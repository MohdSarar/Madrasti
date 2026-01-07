# syntax=docker/dockerfile:1
FROM node:20-slim AS base
WORKDIR /repo

# Install deps (monorepo)
COPY package.json package-lock.json ./
COPY packages/auth-sdk/package.json packages/auth-sdk/package.json
COPY packages/event-bus/package.json packages/event-bus/package.json
COPY services/auth/package.json services/auth/package.json
RUN npm ci --include=dev --omit=optional --no-audit --no-fund

# Copy source
COPY packages ./packages
COPY services/auth ./services/auth

WORKDIR /repo/services/auth
RUN npm run build

EXPOSE 8081
CMD ["npm","run","start"]
