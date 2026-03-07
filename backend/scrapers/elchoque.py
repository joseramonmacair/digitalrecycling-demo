"""
Scraper El Choque — selectores verificados en vivo
URL CORRECTA: https://www.elchoque.com/busqueda?s=QUERY
(La URL /?mot_q=QUERY carga la home con carruseles, no resultados reales)
Card:   article.js-product-miniature (todos fuera del swiper en /busqueda)
Título: h3.s_title_block  (texto directo, no un <a>)
Precio: span.price
Link:   a[href*="/inicio/"]
"""
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus


class ElChoqueScraper(BaseScraper):
    name = "elchoque"
    base_url = "https://www.elchoque.com"

    def build_url(self, query: str) -> str:
        return f"{self.base_url}/busqueda?s={quote_plus(query)}"

    async def scrape(self, query: str) -> ScraperResult:
        url = self.build_url(query)
        html, error = await self.fetch(url)
        if error:
            return ScraperResult(source=self.name, listings=[], error=error)

        soup = BeautifulSoup(html, "lxml")
        listings: List[PartListing] = []

        for card in soup.select("article.js-product-miniature")[:10]:
            # Título: en /busqueda está en h3.s_title_block (texto directo)
            title_el = card.select_one("h3.s_title_block") or card.select_one(".s_title_block")
            title = title_el.get_text(strip=True) if title_el else "Sin título"

            # Precio
            price_el = card.select_one("span.price")
            price_raw = price_el.get_text(strip=True) if price_el else ""
            price = parse_price(price_raw)

            # Link
            link_el = card.select_one("a[href*='/inicio/'], a[href]")
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

