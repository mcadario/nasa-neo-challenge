# NeoWs Dashboard — Next.js + shadcn/ui

Frontend per il proxy FastAPI NASA NeoWs.

## Setup

```bash
npm install
npm run dev
```

Apri http://localhost:3000 — verrà reindirizzato automaticamente su `/feed`.

## Requisiti

Il server FastAPI deve girare su `http://localhost:8000`.
Se usi una porta diversa, modifica `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:TUAPORTA
```

## Pagine

| Route | Endpoint FastAPI | Descrizione |
|-------|-----------------|-------------|
| `/feed` | `GET /feed/?sdate=&edate=` | NEO per range di date (max 7 giorni) |
| `/lookup` | `GET /lookup/{id}` | Dettaglio singolo asteroide per SPK ID |
| `/browse` | `GET /browse/` | Tutti i NEO del database NASA |

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components (inline, no CLI needed)
- lucide-react icons
- date-fns
