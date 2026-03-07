"""
Scraper El Choque — selectores verificados en vivo
URL: https://www.elchoque.com/?mot_q=QUERY
Resultados reales: article.js-product-miniature que NO están dentro de .swiper-wrapper
Título: .s_title_block a
Precio: span.price
"""
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus


class ElChoqueScraper(BaseScraper):
    name = "elchoque"
    base_url = "https://www.elchoque.com"

    def build_url(self, query: str) -> str:
        return f"{self.base_url}/?mot_q={quote_plus(query)}"

    async def scrape(self, query: str) -> ScraperResult:
        url = self.build_url(query)
        html, error = await self.fetch(url)
        if error:
            return ScraperResult(source=self.name, listings=[], error=error)

        soup = BeautifulSoup(html, "lxml")
        listings: List[PartListing] = []

        # Excluir cards dentro del carrusel (swiper) — son productos destacados, no resultados
        # Los resultados reales están fuera del swiper, en el bloque de búsqueda
        for card in soup.select("article.js-product-miniature"):
            # Saltar si está dentro de un swiper (carrusel de la home)
            if card.find_parent(class_="swiper-wrapper"):
                continue

            title_el = card.select_one(".s_title_block a") or card.select_one("h2 a, h3 a, a")
            title = title_el.get_text(strip=True) if title_el else "Sin título"

            price_el = card.select_one("span.price")
            price_raw = price_el.get_text(strip=True) if price_el else ""
            price = parse_price(price_raw)

            link_el = card.select_one("a[href]")
            link = link_el["href"] if link_el else url
            if link.startswith("/"):
                link = self.base_url + link

            img_el = card.select_one("img")
            image = None
            if img_el:
                image = img_el.get("src") or img_el.get("data-src")

            listings.append(PartListing(
                title=title, price=price, price_raw=price_raw,
                url=link, source=self.name, image_url=image,
            ))

            if len(listings) >= 10:
                break

        return ScraperResult(source=self.name, listings=listings)

