"""
CIO4YOU Price Intelligence API
FastAPI backend — scrapers en paralelo para 6 marketplaces
"""
import asyncio
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from scrapers.elchoque import ElChoqueScraper
from scrapers.ovoko import OvokoScraper
from scrapers.bparts import BPartsScraper
from scrapers.recambioverde import RecambioVerdeScraper
from scrapers.opisto import OpistoScraper
from scrapers.ecooparts import EcoopartsScraper
from scrapers.base import PartListing, ScraperResult

app = FastAPI(
    title="CIO4YOU Price Intelligence API",
    description="Comparador de precios de recambios en tiempo real",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instanciar scrapers
SCRAPERS = [
    ElChoqueScraper(),
    OvokoScraper(),
    BPartsScraper(),
    RecambioVerdeScraper(),
    OpistoScraper(),
    EcoopartsScraper(),
]


class SearchResponse(BaseModel):
    query: str
    total: int
    results: List[dict]
    sources: List[dict]


@app.get("/")
async def root():
    return {"status": "ok", "service": "CIO4YOU Price Intelligence API v1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., description="Término de búsqueda o referencia OEM"),
    sources: Optional[str] = Query(None, description="Fuentes separadas por coma (ej: elchoque,ovoko)"),
):
    """
    Busca en paralelo en todos los marketplaces configurados.
    - Modo OEM: si q parece un código (dígitos/letras sin espacios)
    - Modo texto: búsqueda por nombre de pieza
    """
    # Filtrar scrapers si se especifican fuentes
    active_scrapers = SCRAPERS
    if sources:
        selected = set(sources.lower().split(","))
        active_scrapers = [s for s in SCRAPERS if s.name in selected]

    # Ejecutar todos en paralelo
    tasks = [scraper.scrape(q) for scraper in active_scrapers]
    results: List[ScraperResult] = await asyncio.gather(*tasks, return_exceptions=True)

    all_listings = []
    source_summary = []

    for i, result in enumerate(results):
        scraper_name = active_scrapers[i].name
        if isinstance(result, Exception):
            source_summary.append({
                "source": scraper_name,
                "count": 0,
                "error": str(result),
                "status": "error",
            })
            continue

        source_summary.append({
            "source": result.source,
            "count": len(result.listings),
            "error": result.error,
            "status": "ok" if not result.error else "partial",
        })

        for listing in result.listings:
            all_listings.append({
                "title": listing.title,
                "price": listing.price,
                "price_raw": listing.price_raw,
                "url": listing.url,
                "source": listing.source,
                "image_url": listing.image_url,
                "reference": listing.reference,
            })

    # Ordenar por precio (sin precio al final)
    all_listings.sort(key=lambda x: x["price"] if x["price"] else 9999)

    return SearchResponse(
        query=q,
        total=len(all_listings),
        results=all_listings,
        sources=source_summary,
    )


@app.get("/sources")
async def list_sources():
    """Lista las fuentes disponibles"""
    return {
        "sources": [
            {"name": s.name, "url": s.base_url} for s in SCRAPERS
        ]
    }
