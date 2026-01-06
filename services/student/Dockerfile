# syntax=docker/dockerfile:1
FROM node:20-slim AS base
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/auth-sdk/package.json packages/auth-sdk/package.json
COPY packages/event-bus/package.json packages/event-bus/package.json
COPY services/student/package.json services/student/package.json
RUN npm ci --include=dev --omit=optional --no-audit --no-fund

COPY packages ./packages
COPY services/student ./services/student

# build shared packages so their dist/types exist for TS resolution
RUN npm run -w @madrasti/auth-sdk build
RUN npm run -w @madrasti/event-bus build

WORKDIR /repo/services/student
RUN npm run build

EXPOSE 8082
CMD ["npm","run","start"]
