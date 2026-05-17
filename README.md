# NASA NEO Challenge

Applicazione full-stack per consultare i Near Earth Objects usando le API NASA NeoWs.

Il progetto è composto da:

- un backend **FastAPI** che fa da proxy verso le API NASA;
- un frontend **Next.js** per visualizzare feed, browse e lookup degli asteroidi;
- una cache **Redis** per ridurre le chiamate ripetute verso NASA;
- uno stream endpoint per aggiornare la progress bar durante il caricamento di range lunghi.

---

## Struttura delle cartelle

```txt
nasa-neo-challenge/
├─ proxy/
│  ├─ main.py              # Backend FastAPI
│  └─ requirements.txt     # Dipendenze Python del backend
│
├─ neo-dashboard/
│  ├─ app/                 # Pagine Next.js
│  │  ├─ feed/             # Pagina Feed NEO
│  │  ├─ browse/           # Pagina Browse
│  │  └─ lookup/           # Pagina Lookup per singolo asteroide
│  ├─ components/          # Componenti UI riutilizzabili
│  ├─ lib/                 # Client API, tipi TypeScript e utility
│  ├─ public/              # Asset statici
│  ├─ package.json
│  └─ next.config.mjs
│
├─ .github/
│  └─ workflows/
│     └─ deploy-frontend.yml
│
└─ README.md
```

---

## Scelte fatte

### Backend come proxy

Il frontend non chiama direttamente le API NASA. Tutte le richieste passano dal backend FastAPI.

Questa scelta permette di:

- non esporre la `NASA_API_KEY` nel browser;
- centralizzare la logica di caching;
- gestire meglio CORS e variabili d’ambiente;
- avere endpoint più semplici da usare dal frontend.

---

### Cache Redis

Il backend usa Redis per salvare le risposte ottenute dalle API NASA.

Per il feed, i range di date vengono divisi in chunk da massimo 7 giorni.

Esempio:

```txt
2026-05-09 - 2026-05-15
2026-05-16 - 2026-05-22
2026-05-23 - 2026-05-29
```

Ogni chunk viene salvato in Redis con una chiave del tipo:

```txt
f_YYYY-MM-DD_YYYY-MM-DD
```

Esempio:

```txt
f_2026-05-09_2026-05-15
```

Questo permette di riutilizzare chunk già scaricati anche quando l’utente fa ricerche su range più grandi.

Il caching è attivo anche per funzioni lookup e browse:
```txt
b_0 //formato chiave browse (0 indica la pagina)
l_000000 //formato chiave lookup (000000 indica l'ID)
```

---

### Streaming per la progress bar

Per i range lunghi, il backend espone un endpoint streaming:

```txt
GET /feed/stream/
```

Questo endpoint restituisce dati in formato NDJSON, cioè una sequenza di oggetti JSON separati da newline.

Esempio:

```json
{"type":"progress","current":1,"total":4,"key":"f_2026-05-09_2026-05-15","source":"cache"}
{"type":"progress","current":2,"total":4,"key":"f_2026-05-16_2026-05-22","source":"nasa"}
{"type":"done","data":{"near_earth_objects":{},"element_count":0}}
```

Il frontend legge lo stream chunk per chunk e aggiorna la progress bar in tempo reale.

È anche possibile interrompere una ricerca in corso dal frontend. I chunk già completati restano comunque salvati in cache.

---

### Deploy separato frontend/backend

Il progetto è pensato per essere deployato separando frontend e backend:

```txt
Frontend: GitHub Pages
Backend: Railway 
Redis: db redis per caching
```

---

## Requisiti

### Backend

- Python 3.10+
- Redis
- NASA API key

Dipendenze Python principali:

```txt
fastapi
uvicorn[standard]
requests
python-dotenv
redis
```

Queste dipendenze vanno inserite in:

```txt
proxy/requirements.txt
```

---

### Frontend

- Node.js 20+
- npm

Le dipendenze frontend sono definite in:

```txt
neo-dashboard/package.json
```

---

## Variabili d’ambiente

### Backend

Il backend legge le variabili d’ambiente usando `python-dotenv`.

In locale, creare un file `.env` nella root del progetto:

```env
NASA_API_KEY=
REDIS_HOST=
REDIS_PORT=
REDIS_USR=
REDIS_PWD=
```

Per la produzione con GitHub Pages nel file ```proxy\main.py``` per CORS è stato inserito il dominio ```https://mcadario.github.io```; ```http://localhost:3000``` invece per il testing in locale.

NOTA: per CORS bisogna indicare solo l’origin, quindi protocollo + dominio. Non bisogna includere il path `/nasa-neo-challenge`.

---

### Frontend

In locale, creare:

```txt
neo-dashboard/.env.local
```

con:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

In produzione, questa variabile deve puntare all’URL pubblico del backend:

```env
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

Nota: le variabili che iniziano con `NEXT_PUBLIC_` sono incluse nel bundle JavaScript del frontend e sono quindi visibili nel browser. Non usarle mai per dati segreti.

#### Nota sulle variabili .env
Quando hostato su railway, i valori delle variabili non sono presi dal .env ma andranno settate correttamente direttamente alla creazione del ws quando richieste da Railway.

---

## Come far girare il progetto in locale

### 1. Avviare Redis

Per il mio caso il server redis non è in locale, ma hostato e dunque sempre attivo. Non va infatti avviato localmente, basta settare correttamente la variabile REDIS_HOST nel .env.

---

### 2. Avviare il backend FastAPI

Dalla root della repo:

```bash
cd proxy
```
Creare un ambinte virtuale con conda, mamba, venv, uv, ...
Installare le dipendenze:

```bash
pip install -r requirements.txt
```

Avviare FastAPI:

```bash
uvicorn main:app --reload
```

Il backend sarà disponibile su:

```txt
http://localhost:8000
```

Documentazione interattiva FastAPI:

```txt
http://localhost:8000/docs
```

---

### 3. Avviare il frontend Next.js

In un altro terminale, dalla root della repo:

```bash
cd neo-dashboard
```

Installare le dipendenze:

```bash
npm install
```

Avviare il frontend:

```bash
npm run dev
```

Il frontend sarà disponibile su:

```txt
http://localhost:3000
```

### 4. Avviare contemporaneamente

Nel file ```package.json``` è presente uno script start:all che avvia sia backend che frontend in locale.

```bash
npm run start:all
```

---

## Endpoint FastAPI implementati

### `GET /`

Health check base.

Esempio:

```txt
GET /
```

Risposta esempio:

```json
{
  "message": "it works =), your key is ..."
}
```

---

### `GET /feed/`

Restituisce il feed NEO per un range di date.

Query params:

| Parametro | Tipo | Descrizione |
|---|---|---|
| `sdate` | string | Data iniziale in formato `YYYY-MM-DD` |
| `edate` | string | Data finale in formato `YYYY-MM-DD` |

Esempio:

```txt
GET /feed/?sdate=2026-05-09&edate=2026-05-15
```

Risposta esempio:

```json
{
  "near_earth_objects": {
    "2026-05-09": []
  },
  "element_count": 0
}
```

Note:

- se i chunk sono già presenti in Redis, vengono letti dalla cache;
- se i chunk non sono presenti, il backend li scarica da NASA e li salva in Redis;
- il risultato finale viene aggregato e ordinato per data.

---

### `GET /feed/stream/`

Versione streaming del feed. Viene usata dal frontend per aggiornare la progress bar durante il caricamento.

Query params:

| Parametro | Tipo | Descrizione |
|---|---|---|
| `sdate` | string | Data iniziale in formato `YYYY-MM-DD` |
| `edate` | string | Data finale in formato `YYYY-MM-DD` |

Esempio:

```txt
GET /feed/stream/?sdate=2026-05-09&edate=2026-12-18
```

Risposta NDJSON esempio:

```json
{"type":"progress","current":1,"total":32,"key":"f_2026-05-09_2026-05-15","source":"cache"}
{"type":"progress","current":2,"total":32,"key":"f_2026-05-16_2026-05-22","source":"nasa"}
{"type":"done","data":{"near_earth_objects":{},"element_count":0}}
```

Campi principali:

| Campo | Descrizione |
|---|---|
| `type` | Tipo del messaggio: `progress` oppure `done` |
| `current` | Numero del chunk completato |
| `total` | Numero totale di chunk |
| `key` | Chiave Redis del chunk |
| `source` | Origine del chunk: `cache` oppure `nasa` |
| `chunk_start` | Data iniziale del chunk |
| `chunk_end` | Data finale del chunk |
| `data` | Risultato finale aggregato, presente nel messaggio `done` |

---

### `GET /lookup/{a_id}`

Restituisce i dettagli di un asteroide tramite il suo ID.

Path params:

| Parametro | Tipo | Descrizione |
|---|---|---|
| `a_id` | integer | ID dell’asteroide |

Esempio:

```txt
GET /lookup/3542519
```

L’endpoint usa cache Redis con chiave:

```txt
l_3542519
```

---

### `GET /browse/`

Restituisce una pagina di asteroidi dal browse NASA NeoWs.

Query params:

| Parametro | Tipo | Default | Descrizione |
|---|---|---|---|
| `page` | integer | `10` | Numero della pagina |

Esempio:

```txt
GET /browse/?page=0
```

L’endpoint usa cache Redis con chiave:

```txt
b_0 //page=0
b_1 //page=1
...
```

NOTA: il browse cambia raramente, dunque è sufficente che la cache del browse si resetti solamente ogni 1 giorno (864000 seondi, vedi file ```proxy/main.py:30``` costante CACHE_TTL (cache time to live))

---

## Deploy

### Backend

Il backend è deployato su railway

```txt
Root Directory: proxy
```

Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Variabili d’ambiente da configurare nel servizio backend:

```env
NASA_API_KEY=
REDIS_HOST=
REDIS_PORT=
REDIS_USR=
REDIS_PWD=
```

La `NASA_API_KEY` deve stare solo nei secrets del backend.

---

### Frontend su GitHub Pages

Il frontend viene esportato come sito statico tramite Next.js.

Nel file `next.config.mjs` viene usato:

```js
output: "export"
```

Il workflow GitHub Actions deve:

1. entrare nella cartella `neo-dashboard`;
2. installare le dipendenze;
3. eseguire `npm run build`;
4. pubblicare la cartella `neo-dashboard/out`.

La variabile (in .env.local):

```env
NEXT_PUBLIC_API_URL
```

deve puntare all’URL pubblico del backend.

Esempio:

```env
NEXT_PUBLIC_API_URL=https://nasa-neo-challenge-production.up.railway.app
```

---

## Sicurezza

- La NASA API key non è mai esposta nel frontend.
- Il frontend chiama solo il backend.
- Il backend legge la API key dalle variabili d’ambiente.
- Redis viene usato solo lato backend.
- Le variabili `NEXT_PUBLIC_*` sono pubbliche e visibili nel bundle frontend.

---

## Funzionalità principali

- Ricerca feed NEO per range di date.
- Progress bar in tempo reale durante il fetch.
- Possibilità di interrompere una ricerca in corso.
- Cache Redis per feed, lookup e browse.
- Lookup dettagliato per singolo asteroide.
- Browse paginato degli asteroidi.
- Filtri e ordinamenti lato frontend.
- Deploy frontend statico su GitHub Pages.
- Deploy backend separato su hosting reale.