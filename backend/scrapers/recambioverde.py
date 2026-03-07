"""
Scraper RecambioVerde — selectores verificados en vivo
URL: https://www.recambioverde.es/recambios-desguace/QUERY
Card: a[href*='/detalle/'] con texto (no imagen)
Precio: span.price-new (subiendo por el DOM desde el link)
"""
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus


class RecambioVerdeScraper(BaseScraper):
    name = "recambioverde"
    base_url = "https://www.recambioverde.es"

    def build_url(self, query: str) -> str:
        # RecambioVerde usa el texto directamente en la URL sin encoding especial
        slug = query.lower().replace(" ", "-")
        return f"{self.base_url}/recambios-desguace/{slug}"

    async def scrape(self, query: str) -> ScraperResult:
        url = self.build_url(query)
        html, error = await self.fetch(url)
        if error:
            return ScraperResult(source=self.name, listings=[], error=error)

        soup = BeautifulSoup(html, "lxml")
        listings: List[PartListing] = []

        seen_urls = set()

        for link_el in soup.select("a[href*='/detalle/']"):
            href = link_el.get("href", "")
            if not href or href in seen_urls:
                continue

            # Solo links de texto (con nombre de pieza), no links de imagen
            title_text = link_el.get_text(strip=True)
            if not title_text or len(title_text) < 8:
                continue

            seen_urls.add(href)
            full_url = self.base_url + href if href.startswith("/") else href

            # Buscar precio subiendo por el DOM
            price_raw = ""
            el = link_el.parent
            for _ in range(8):
                if el is None:
                    break
                price_el = el.select_one("span.price-new")
                if price_el:
                    price_raw = price_el.get_text(strip=True)
                    break
                el = el.parent

            price = parse_price(price_raw)

            # Imagen
            img_el = link_el.find_previous_sibling("a")
            img = None
            if img_el:
                img_tag = img_el.find("img")
                if img_tag:
                    img = img_tag.get("src") or img_tag.get("data-src")

            listings.append(PartListing(
                title=title_text, price=price, price_raw=price_raw,
                url=full_url, source=self.name, image_url=img,
            ))

            if len(listings) >= 10:
                break

        return ScraperResult(source=self.name, listings=listings)

