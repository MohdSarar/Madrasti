FROM node:20-slim AS base

WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/auth-sdk/package.json packages/auth-sdk/package.json
COPY packages/event-bus/package.json packages/event-bus/package.json
COPY packages/security-sdk/package.json packages/security-sdk/package.json
COPY services/auth/package.json services/auth/package.json

RUN npm ci --include=dev --omit=optional --no-audit --no-fund

COPY packages ./packages
COPY services/auth ./services/auth

RUN npm run -w @madrasti/auth-sdk build
RUN npm run -w @madrasti/event-bus build
RUN npm run -w @madrasti/security-sdk build

WORKDIR /repo/services/auth

RUN npm run build

EXPOSE 8081

CMD ["npm","run","start"]