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
        feed: f_YYYY-MM-DD_YYYY-MM-DD, geenrata solo se le date sono impostate
        lookup: l_0000000, 000000 è l'id asteroide
        browse: b_0, 0 rappresenta il numero di pagina
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
    chunks = []
    chunk_size = 7
    current = date.fromisoformat(start)
    end_date = date.fromisoformat(end)

    while current <= end_date:
        chunk_end = min(current + timedelta(days=chunk_size - 1), end_date)
        chunks.append((current.isoformat(), chunk_end.isoformat()))
        current += timedelta(days=chunk_size)

    return chunks


def neows_feed(start_date:str = None, end_date:str = None):
    """ formato data YYYY-MM-DD per start_date e end_date """

    chunks:list = chunk_date_range(start_date,end_date)
    merged = {}

    for s,e in chunks: # s: start_date, e: end_date
        url = NEOWS_URL_BASE + FEED_ADDON
        key = None
        if (s and e): # se date di ricerca sono presenti
            url += f"start_date={s}&end_date={e}"
            key = f"f_{s}_{e}"
        
        #  se l'utente non ha inserito alcuna data di ricerca, il ? dopo feed nella costante FEED_ADDON
        #  non causa problematiche nella chiamata API, la cache non verrà sfruttata  

        url += "&"+API_KEY_ADDON

        if key: # se la key non è None, allora è stata impostata con le date corrette
            cache_response = get_from_cache(key)
            if cache_response:
                merged.update(cache_response.get("near_earth_objects", {}))
                continue
        
        # key non è presente nella cache
        data_feed = json.loads(r.get(url).content)
        set_in_cache(key, data_feed)
        merged.update(data_feed.get("near_earth_objects", {}))

    return {"near_earth_objects": merged, "element_count": sum(len(v) for v in merged.values())}
    

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
