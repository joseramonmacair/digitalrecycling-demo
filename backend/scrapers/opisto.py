"""
Scraper Opisto — selectores verificados en vivo
URL: https://www.opisto.com/es/auto/piezas-de-ocasion/pagina-1?q=QUERY
Card: div.card.flex-column.flex-md-row.mb-3
Título: a (primer link del card, contiene "Alternador\nBMW X6...")
Precio: span.fs-3.gotham-rounded-medium.text-nowrap  → "11,89 €*"
Link: a[href*="/ficha-del-producto/"]
"""
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus


class OpistoScraper(BaseScraper):
    name = "opisto"
    base_url = "https://www.opisto.com"

    def build_url(self, query: str) -> str:
        return f"{self.base_url}/es/auto/piezas-de-ocasion/pagina-1?q={quote_plus(query)}"

    async def scrape(self, query: str) -> ScraperResult:
        url = self.build_url(query)
        html, error = await self.fetch(url)
        if error:
            return ScraperResult(source=self.name, listings=[], error=error)

        soup = BeautifulSoup(html, "lxml")
        listings: List[PartListing] = []

        for card in soup.select("div.card.mb-3")[:10]:
            # Título desde el link principal (limpiamos saltos de línea extra)
            link_el = card.select_one("a[href*='/ficha-del-producto/']")
            if not link_el:
                link_el = card.select_one("a[href]")
            title = " ".join(link_el.get_text().split()) if link_el else "Sin título"

            link = link_el["href"] if link_el else url
            if link.startswith("/"):
                link = self.base_url + link

            # Precio — puede tener asterisco al final
            price_el = card.select_one("span.fs-3")
            price_raw = price_el.get_text(strip=True).replace("*", "").strip() if price_el else ""
            price = parse_price(price_raw)

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
