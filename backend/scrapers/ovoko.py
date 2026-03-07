"""
Scraper Ovoko — selectores verificados en vivo
URL: https://ovoko.es/buscar?q=QUERY
Card: .products__items
Título: span.products__text__header
Descripción: span.products__text__description__item (2º)
Precio: .products__price strong
Link: a.products__items__link
"""
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus


class OvokoScraper(BaseScraper):
    name = "ovoko"
    base_url = "https://ovoko.es"

    def build_url(self, query: str) -> str:
        return f"{self.base_url}/buscar?q={quote_plus(query)}"

    async def scrape(self, query: str) -> ScraperResult:
        url = self.build_url(query)
        html, error = await self.fetch(url)
        if error:
            return ScraperResult(source=self.name, listings=[], error=error)

        soup = BeautifulSoup(html, "lxml")
        listings: List[PartListing] = []

        for card in soup.select(".products__items")[:10]:
            # Título de la pieza
            header_el = card.select_one("span.products__text__header")
            # Descripción del vehículo (2ª aparición de .products__text__description__item)
            desc_items = card.select("span.products__text__description__item")
            vehicle = desc_items[1].get_text(strip=True) if len(desc_items) > 1 else ""
            title = header_el.get_text(strip=True) if header_el else "Sin título"
            if vehicle:
                title = f"{title} — {vehicle}"

            # Precio (primer strong dentro de .products__price)
            price_el = card.select_one(".products__price strong")
            price_raw = price_el.get_text(strip=True) if price_el else ""
            price = parse_price(price_raw)

            # Link
            link_el = card.select_one("a.products__items__link, a[href]")
            link = link_el["href"] if link_el else url
            if link.startswith("/"):
                link = self.base_url + link

            # Imagen
            img_el = card.select_one("img")
            image = None
            if img_el:
                image = img_el.get("src") or img_el.get("data-src")

            listings.append(PartListing(
                title=title, price=price, price_raw=price_raw,
                url=link, source=self.name, image_url=image,
            ))

        return ScraperResult(source=self.name, listings=listings)
