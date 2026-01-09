# Madrasti Frontend (Partie 1)

Stack imposée:
- Next.js 14 App Router
- Tailwind + shadcn/ui
- TanStack Query, Zustand
- Axios + refresh token interceptor
- socket.io-client + sonner

## Démarrer en local

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

## Tests

```bash
npm run test
npm run test:e2e
```

## Docker

```bash
docker build -t madrasti-frontend ./frontend
docker run --rm -p 3000:3000 --env-file ./frontend/.env.local madrasti-frontend
```
