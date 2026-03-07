"""
Scraper Ovoko - ovoko.es
Protegido por Cloudflare. Usa ScraperAPI con proxies residenciales.
URL:   https://ovoko.es/buscar?q=QUERY
Card:  div.products__items
Title: span.products__text__header
Price: .products__price strong
Link:  a.products__items__link
"""
import os
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus

SCRAPER_API_KEY = os.environ.get("SCRAPER_API_KEY", "")


class OvokoScraper(BaseScraper):
    name = "ovoko"
    base_url = "https://ovoko.es"

    def build_url(self, query: str) -> str:
        target = f"{self.base_url}/buscar?q={quote_plus(query)}"
        if SCRAPER_API_KEY:
            return f"https://api.scraperapi.com/?api_key={SCRAPER_API_KEY}&url={quote_plus(target)}&render=false"
        return target

    async def scrape(self, query: str) -> ScraperResult:
        if not SCRAPER_API_KEY:
            return ScraperResult(source=self.name, listings=[], error="SCRAPER_API_KEY not configured")

        url = self.build_url(query)
        html, error = await self.fetch(url)
        if error:
            return ScraperResult(source=self.name, listings=[], error=error)

        soup = BeautifulSoup(html, "lxml")
        listings: List[PartListing] = []

        for card in soup.select("div.products__items")[:10]:
            title_el = card.select_one("span.products__text__header")
            title = title_el.get_text(strip=True) if title_el else "Sin titulo"

            desc_items = card.select("span.products__text__description__item")
            vehicle = desc_items[1].get_text(strip=True) if len(desc_items) > 1 else ""
            if vehicle:
                title = f"{title} - {vehicle}"

            price_el = card.select_one(".products__price strong")
            price_raw = price_el.get_text(strip=True) if price_el else ""
            price = parse_price(price_raw)

            link_el = card.select_one("a.products__items__link")
            link = link_el["href"] if link_el else self.base_url
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
