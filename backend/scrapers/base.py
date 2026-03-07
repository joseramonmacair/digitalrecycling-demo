"""
scrapers/base.py
Clase base y utilidades compartidas para todos los scrapers.
"""
import re
import httpx
from bs4 import BeautifulSoup
from dataclasses import dataclass, field
from typing import Optional, Tuple


# ── Headers comunes para parecer un navegador real ────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
}


@dataclass
class PartListing:
    """Resultado normalizado de un listing de pieza."""
    source: str
    title: str
    price: Optional[float]
    price_raw: str = ""
    currency: str = "EUR"
    condition: str = "Usado"
    warranty: Optional[str] = None
    url: str = ""
    image_url: Optional[str] = None
    reference: Optional[str] = None
    seller: Optional[str] = None
    year_range: Optional[str] = None
    extra: dict = field(default_factory=dict)


@dataclass
class ScraperResult:
    """Resultado agregado de un scraper para una búsqueda."""
    source: str
    listings: list = field(default_factory=list)
    error: Optional[str] = None

    @property
    def price_min(self) -> Optional[float]:
        prices = [l.price for l in self.listings if l.price]
        return min(prices, default=None)

    @property
    def price_max(self) -> Optional[float]:
        prices = [l.price for l in self.listings if l.price]
        return max(prices, default=None)

    @property
    def price_avg(self) -> Optional[float]:
        prices = [l.price for l in self.listings if l.price]
        return round(sum(prices) / len(prices), 2) if prices else None


def parse_price(text: str) -> Optional[float]:
    """Extrae un precio numérico de un string como '85,50 €' o '€ 120.00'."""
    if not text:
        return None
    cleaned = re.sub(r"[€$£\s*]", "", text.strip())
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    try:
        value = float(re.search(r"\d+\.?\d*", cleaned).group())
        return value if 0.01 < value < 99999 else None
    except (AttributeError, ValueError):
        return None


async def fetch(url: str, client: httpx.AsyncClient, extra_headers: dict = None) -> Optional[BeautifulSoup]:
    """Función standalone — hace un GET y devuelve BeautifulSoup o None."""
    headers = {**HEADERS, **(extra_headers or {})}
    try:
        r = await client.get(url, headers=headers, timeout=12, follow_redirects=True)
        r.raise_for_status()
        return BeautifulSoup(r.text, "lxml")
    except Exception:
        return None


class BaseScraper:
    """Clase base para los scrapers — encapsula httpx y lógica común."""
    name: str = "base"
    base_url: str = ""

    async def fetch(self, url: str, extra_headers: dict = None) -> Tuple[Optional[str], Optional[str]]:
        """Hace GET y devuelve (html, error). html es None si falla."""
        headers = {**HEADERS, **(extra_headers or {})}
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(url, headers=headers, timeout=15, follow_redirects=True)
                r.raise_for_status()
                return r.text, None
        except httpx.HTTPStatusError as e:
            return None, f"HTTP {e.response.status_code}"
        except Exception as e:
            return None, str(e)

    async def scrape(self, query: str) -> ScraperResult:
        raise NotImplementedError
