# syntax=docker/dockerfile:1
FROM node:20-slim AS base
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/auth-sdk/package.json packages/auth-sdk/package.json
COPY services/user-profile/package.json services/user-profile/package.json
RUN npm ci --include=dev --omit=optional --no-audit --no-fund

COPY packages ./packages
COPY services/user-profile ./services/user-profile

# build shared packages so their dist/types exist for TS resolution
RUN npm run -w @madrasti/auth-sdk build
RUN npm run -w @madrasti/event-bus build

WORKDIR /repo/services/user-profile
RUN npm run build

EXPOSE 8084
CMD ["npm","run","start"]
