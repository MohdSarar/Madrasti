# syntax=docker/dockerfile:1
FROM node:20-slim AS base
WORKDIR /repo

# Install deps (monorepo)
COPY package.json package-lock.json ./
COPY services/security/package.json services/security/package.json
RUN npm ci --include=dev --omit=optional --no-audit --no-fund

# Copy source
COPY services/security ./services/security

WORKDIR /repo/services/security
RUN npm run build

EXPOSE 8085
CMD ["npm","run","start"]
