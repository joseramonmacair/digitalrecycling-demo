"""
API: Digital Recycling Price Intelligence
FastAPI backend que orquesta todos los scrapers bajo demanda
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import asyncio
import time

# Importar scrapers
from scrapers.scraper_bparts import scrape_bparts
from scrapers.scraper_ovoko import scrape_ovoko
from scrapers.scraper_eco_verde_opisto import scrape_ecooparts, scrape_recambioverde, scrape_opisto

app = FastAPI(
    title="Digital Recycling — Price Intelligence API",
    description="Consulta precios de recambios en múltiples marketplaces por referencia OEM",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ajustar en producción
    allow_methods=["GET"],
    allow_headers=["*"],
)

SCRAPERS = {
    "bparts":        scrape_bparts,
    "ovoko":         scrape_ovoko,
    "ecooparts":     scrape_ecooparts,
    "recambioverde": scrape_recambioverde,
    "opisto":        scrape_opisto,
}


class SourceResult(BaseModel):
    source: str
    available: bool
    listings: list[dict] = []
    price_min: Optional[float] = None
    price_avg: Optional[float] = None
    price_max: Optional[float] = None
    count: int = 0
    error: Optional[str] = None
    elapsed_ms: int = 0


class SearchResponse(BaseModel):
    oem: str
    sources: list[SourceResult]
    total_listings: int
    global_price_min: Optional[float]
    global_price_avg: Optional[float]
    global_price_max: Optional[float]
    elapsed_ms: int


@app.get("/search", response_model=SearchResponse)
async def search_by_oem(
    oem: str = Query(..., description="Referencia OEM del recambio", example="036100098AX"),
    sources: Optional[str] = Query(None, description="Fuentes separadas por coma. Default: todas"),
):
    """
    Busca un recambio por referencia OEM en todos los marketplaces configurados.
    Lanza todas las búsquedas en paralelo y devuelve resultados normalizados.
    """
    oem = oem.strip().upper()
    if not oem:
        raise HTTPException(status_code=400, detail="OEM reference required")

    # Filtrar fuentes si se especifica
    active_scrapers = SCRAPERS
    if sources:
        requested = [s.strip().lower() for s in sources.split(",")]
        active_scrapers = {k: v for k, v in SCRAPERS.items() if k in requested}
        if not active_scrapers:
            raise HTTPException(status_code=400, detail=f"No valid sources: {sources}")

    start = time.time()

    async def run_scraper(name: str, fn):
        t0 = time.time()
        try:
            listings = await fn(oem)
            elapsed = int((time.time() - t0) * 1000)
            if not listings:
                return SourceResult(source=name, available=False, elapsed_ms=elapsed)
            prices = [l.price for l in listings if l.price]
            return SourceResult(
                source=name,
                available=True,
                listings=[vars(l) for l in listings],
                price_min=min(prices) if prices else None,
                price_avg=round(sum(prices) / len(prices), 2) if prices else None,
                price_max=max(prices) if prices else None,
                count=len(listings),
                elapsed_ms=elapsed,
            )
        except Exception as e:
            elapsed = int((time.time() - t0) * 1000)
            return SourceResult(source=name, available=False, error=str(e), elapsed_ms=elapsed)

    # Ejecutar en paralelo
    tasks = [run_scraper(name, fn) for name, fn in active_scrapers.items()]
    results: list[SourceResult] = await asyncio.gather(*tasks)

    # Agregar stats globales
    all_prices = [
        price
        for r in results if r.available
        for l in r.listings
        if (price := l.get("price"))
    ]

    total_elapsed = int((time.time() - start) * 1000)

    return SearchResponse(
        oem=oem,
        sources=results,
        total_listings=sum(r.count for r in results),
        global_price_min=min(all_prices) if all_prices else None,
        global_price_avg=round(sum(all_prices) / len(all_prices), 2) if all_prices else None,
        global_price_max=max(all_prices) if all_prices else None,
        elapsed_ms=total_elapsed,
    )


@app.get("/sources")
async def list_sources():
    """Lista las fuentes disponibles"""
    return {"sources": list(SCRAPERS.keys())}


@app.get("/health")
async def health():
    return {"status": "ok"}
