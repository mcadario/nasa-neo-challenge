from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests as r
import os
import json
from dotenv import load_dotenv
import redis
import json
import logging
from datetime import date, timedelta

ENV_PATH = "../.env"
load_dotenv(dotenv_path=ENV_PATH)

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST"),
    port=os.getenv("REDIS_PORT"),
    password=os.getenv("REDIS_PWD"),
    username=os.getenv("REDIS_USR"),
    decode_responses=True
)

NEOWS_URL_BASE = "https://api.nasa.gov/neo/rest/v1/"
FEED_ADDON = "feed?"
LOOKUP_ADDON = "neo/"
BROWSE_ADDON = "browse"
NEOWS_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
API_KEY_ADDON = f"api_key={NEOWS_API_KEY}"
CACHE_TTL = 86400 # impostato ad 1 giorno per developing

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

#caching helpers
""" formato key:
        feed: f_YYYY-MM-DD, generata solo se le date sono impostate
        lookup: l_0000000, 000000 è l'id asteroide
        browse: b_0, 0 rappresenta il numero di pagina

per ottimizzare il caching si potrebbe creare una cache per ogni
"""

def get_from_cache(key: str) -> dict | None:
    value = redis_client.get(key)
    if value is None:
        return None
    logger.info("Cache HIT per key '%s'", key)
    return json.loads(value)

def set_in_cache(key: str, data: dict) -> None:
    redis_client.setex(key, CACHE_TTL, json.dumps(data))
    logger.info("Cache SET per key '%s'", key)

#-----------------------------------------------------------

#helper per dividere date in intervalli da 7 giorni
# output: [["2026-01-01","2026-01-07"], ["2026-01-08","2026-01-14"], ["2026-01-15","2026-01-20"]]

def chunk_date_range(start: str, end: str) -> list[tuple[str, str]]:
    """ spezza un range in chunk da max 7 giorni """
    chunks = []
    chunk_size = 7
    current = date.fromisoformat(start)
    end_date = date.fromisoformat(end)

    while current <= end_date:
        chunk_end = min(current + timedelta(days=chunk_size - 1), end_date)
        chunks.append((current.isoformat(), chunk_end.isoformat()))
        current += timedelta(days=chunk_size)

    return chunks


def get_cached_days(start: str, end: str) -> dict[str, list]:
    """ controlla giorno per giorno quali sono già in cache e li ritorna """
    cached = {}
    current = date.fromisoformat(start)
    end_date = date.fromisoformat(end)

    while current <= end_date:
        day_str = current.isoformat()
        data = get_from_cache(f"f_{day_str}")
        if data is not None:
            cached[day_str] = data
        current += timedelta(days=1)

    return cached


def get_missing_chunks(start: str, end: str, cached_days: dict) -> list[tuple[str, str]]:
    """ trova i giorni mancanti nella cache e li raggruppa in chunk da max 7 (cerca sempre di massimizzare le dimensioni dei chunk, cosi da minimizzare le richieste api),
        rispettando i gap (giorni già cachati in mezzo al range) 
        
        le richieste nasa vengono comunque mandate in chunk e non a giorni singoli
        
        un risparmio vero di chiamate API avviene solo se si lavora su intervalli grandi, in modo che più settimane possano essere
        cached. infatti, da come si intende dal sito nasa, il consumo delle chiamate non dipende dalla "dimensione" ma solo dal numero
        
        """
    missing = []
    current = date.fromisoformat(start)
    end_date = date.fromisoformat(end)

    while current <= end_date:
        if current.isoformat() not in cached_days:
            missing.append(current)
        current += timedelta(days=1)

    if not missing:
        return []

    # raggruppa solo giorni consecutivi in chunk da max 7
    chunks = []
    group_start = missing[0]
    prev = missing[0]

    for day in missing[1:]:
        if (day - prev).days > 1:  # gap → chiudi il gruppo corrente
            chunks += chunk_date_range(group_start.isoformat(), prev.isoformat())
            group_start = day
        prev = day

    chunks += chunk_date_range(group_start.isoformat(), prev.isoformat())
    return chunks


def neows_feed(start_date: str = None, end_date: str = None):
    """ formato data YYYY-MM-DD per start_date e end_date """

    #  se l'utente non ha inserito alcuna data di ricerca, il ? dopo feed nella costante FEED_ADDON
    #  non causa problematiche nella chiamata API
    if not (start_date and end_date):
        url = NEOWS_URL_BASE + FEED_ADDON + "&" + API_KEY_ADDON
        return json.loads(r.get(url).content)

    # controlla quali giorni sono già in cache
    cached_days = get_cached_days(start_date, end_date)

    # trova i chunk di giorni mancanti (rispetta i gap)
    missing_chunks = get_missing_chunks(start_date, end_date, cached_days)

    # fetch da NASA solo i chunk mancanti
    for chunk_start, chunk_end in missing_chunks:
        url = NEOWS_URL_BASE + FEED_ADDON
        url += f"start_date={chunk_start}&end_date={chunk_end}&{API_KEY_ADDON}"
        data_feed = json.loads(r.get(url).content)

        # salva ogni giorno singolarmente in cache
        for day, asteroids in data_feed.get("near_earth_objects", {}).items():
            set_in_cache(f"f_{day}", asteroids)
            cached_days[day] = asteroids  # aggiorna il dict locale

    #  merge di tutti i giorni nel range richiesto, ordinati per data
    merged = dict(sorted(cached_days.items()))
    return {
        "near_earth_objects": merged,
        "element_count": sum(len(v) for v in merged.values())
    }
    

def neows_lookup(asteroid_id:int = None):
    if not asteroid_id: return {"error":"INSERT ASTEROID_ID"}
    key = f"l_{asteroid_id}"
    url = NEOWS_URL_BASE + LOOKUP_ADDON + str(asteroid_id) + "?" + API_KEY_ADDON

    cache_response = get_from_cache(key)
    if cache_response: return cache_response

    data_lookup = json.loads(r.get(url).content)
    set_in_cache(key, data_lookup)
    
    return data_lookup

def neows_browse(page:int = 0): #https://api.nasa.gov/neo/rest/v1/neo/browse?api_key=API_KEY&page=0
    url = NEOWS_URL_BASE + LOOKUP_ADDON + BROWSE_ADDON + "?" + API_KEY_ADDON + f"&page={page}" 
    print(f"\t\t\tPAGE >>>>>>>>>>>>>>> {page}")
    key = f"b_{page}"

    cache_response = get_from_cache(key)
    if cache_response: return cache_response

    data_browse = json.loads(r.get(url).content)
    set_in_cache(key, data_browse)

    return data_browse

########### ENDPOINTS ###########
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "it works =), your key is "+NEOWS_API_KEY}

@app.get("/feed/") # example: http://localhost:8000/feed/?sdate=2026-01-01&edate=2026-01-07
async def feed(sdate: str = None, edate: str = None):
    return neows_feed(sdate, edate)

@app.get("/lookup/{a_id}") # example: http://localhost:8000/lookup/3542519
async def lookup(a_id: int = None):
    return neows_lookup(a_id)

@app.get("/browse/") # example: http://localhost:8000/browse/?page=1
async def browse(page: int = 10):
    return neows_browse(page)
