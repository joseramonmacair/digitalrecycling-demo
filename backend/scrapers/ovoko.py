"""
Scraper Ovoko - ovoko.es
Protegido por Cloudflare - usa curl_cffi para impersonar Chrome TLS fingerprint
URL:   https://ovoko.es/buscar?q=QUERY
Card:  div.products__items
Title: span.products__text__header
"""
Scraper Ovoko - ovoko.es
Protegido por Cloudflare - usa ScraperAPI con proxies residenciales
URL:   https://ovoko.es/buscar?q=QUERY
Card:  div.products__items
Title: span.products__text__header
Price: .products__price strong
Link:  a.products__items__link
"""
import os
import httpx
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus

SCRAPER_API_KEY = os.environ.get("SCRAPER_API_KEY", "")


class OvokoScraper(BaseScraper):
    name = "ovoko"
        base_url = "https://ovoko.es"
        
            async def scrape(self, query: str) -> ScraperResult:
                    if not SCRAPER_API_KEY:
                                return ScraperResult(source=self.na"""
Scraper Ovoko - ovoko.es
Protegido por Cloudflare - usa ScraperAPI con proxies residenciales
URL:   https://ovoko.es/buscar?q=QUERY
Card:  div.products__items
Title: span.products__text__header
Price: .products__price strong
Link:  a.products__items__link
"""
import os
import httpx
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus

SCRAPER_API_KEY = os.environ.get("SCRAPER_API_KEY", "")


class OvokoScraper(BaseScraper):
    name = "ovoko"
        base_url = "https://ovoko.es"
        
            async def scrape(self, query: str) -> ScraperResult:
                    if not SCRAPER_API_KEY:
                                return ScraperResult(source=self.name, listings=[], error="SCRAPER_API_KEY not configured")
                                
                                        target_url = f"{self.base_url}/buscar?q={quote_plus(query)}"
                                                api_url = f"https://api.scraperapi.com/?api_key={SCRAPER_API_KEY}&url={quote_plus(target_url)}&render=false"
                                                
                                                        html = None
                                                                error = None
                                                                        try:
                                                                                    async with httpx.AsyncClient(timeout=30) as client:
                                                                                                    resp = await client.get(api_url)
                                                                                                                    if resp.status_code == 200:
                                                                                                                                        html = resp.text
                                                                                                                                                        else:
                                                                                                                                                                            error = f"HTTP {resp.status_code}"
                                                                                                                                                                                    except Exception as e:
                                                                                                                                                                                                error = str(e)[:120]
                                                                                                                                                                                                
                                                                                                                                                                                                        if Price: .products__price strong
Link:  a.products__items__link
Vehicle: span.products__text__description__item (2nd)
"""
from .base import PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus

try:
    from curl_cffi.requests import AsyncSession
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False


class OvokoScraper:
    name = "ovoko"
    base_url = "https://ovoko.es"

    def build_url(self, query: str) -> str:
        return f"{self.base_url}/buscar?q={quote_plus(query)}"

    async def scrape(self, query: str) -> ScraperResult:
        if not HAS_CURL_CFFI:
            return ScraperResult(
                source=self.name, listings=[],
                error="curl_cffi not installed - Cloudflare bypass unavailable"
            )

        url = self.build_url(query)
        html = None
        error = None

        try:
            async with AsyncSession(impersonate="chrome120") as session:
                resp = await session.get(
                    url,
                    headers={
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        "Accept-Language": "es-ES,es;q=0.9",
                        "Referer": "https://ovoko.es/",
                    },
                    timeout=25,
                )
                if resp.status_code == 200:
                    html = resp.text
                else:
                    error = f"HTTP {resp.status_code}"
        except Exception as e:
            error = str(e)[:120]

        if not html:
            return ScraperResult(source=self.name, listings=[], error=error)

        soup = BeautifulSoup(html, "lxml")
        listings: List[PartListing] = []

        for card in soup.select("div.products__items")[:10]:
            title_el = card.select_one("span.products__text__header")
            title = title_el.get_text(strip=True) if title_el else "Sin t-tulo"

            # Vehicle description (2nd item)
            desc_items = card.select("span.products__text__description__item")
            vehicle = desc_items[1].get_text(strip=True) if len(desc_items) > 1 else ""
            if vehicle:
                title = f"{title} - {vehicle}"

            price_el = card.select_one(".products__price strong")
            price_raw = price_el.get_text(strip=True) if price_el else ""
            price = parse_price(price_raw)

            link_el = card.select_one("a.products__items__link")
            link = link_el["href"] if link_el else url
            if link.startswith("/"):
                link = self.base_url + link

            img_el = card.select_one("img")
            image = None
            if img_el:
                image = img_el.get("src") or img_el.get("data-src") or img_el.get("data-full-img")

            listings.append(PartListing(
                title=title, price=price, price_raw=price_raw,
                url=link, source=self.name, image_url=image,
            ))

        return ScraperResult(source=self.name, listings=listings)

