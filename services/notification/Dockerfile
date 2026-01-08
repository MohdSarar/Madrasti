# syntax=docker/dockerfile:1
FROM node:20-slim
WORKDIR /repo

# Install deps at monorepo root (workspace-aware)
COPY package.json package-lock.json ./
COPY packages ./packages
COPY services ./services
RUN npm ci --include=dev --omit=optional --no-audit --no-fund

# Build shared workspaces used by services
RUN npm run -w @madrasti/auth-sdk build \
 && npm run -w @madrasti/event-bus build \
 && npm run -w @madrasti/security-sdk build

WORKDIR /repo/services/notification
# tests are not needed in image; removing avoids TS6059 when tsconfig includes test/**/*.ts
RUN rm -rf test && npm run build

EXPOSE 8089
CMD ["npm","run","start"]
