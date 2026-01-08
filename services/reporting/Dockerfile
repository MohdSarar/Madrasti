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

WORKDIR /repo/services/reporting
# Tests are not needed for the runtime image; removing them avoids TS rootDir issues
RUN rm -rf test && npm run build

EXPOSE 8088
CMD ["npm","run","start"]
