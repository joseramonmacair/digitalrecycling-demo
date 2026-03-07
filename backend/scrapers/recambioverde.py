"""
Scraper RecambioVerde — selectores verificados en vivo
URL: https://www.recambioverde.es/recambios-desguace/QUERY
Card: div.product-item-container.item--static (contiene imagen + right-block)
Título: a[href*="/detalle/"] con texto del nombre
Precio: span.price-new (dentro de .right-block > .price)
Link: a[href*="/detalle/"]
"""
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus


class RecambioVerdeScraper(BaseScraper):
    name = "recambioverde"
    base_url = "https://www.recambioverde.es"

    def build_url(self, query: str) -> str:
        # RecambioVerde usa slug en la URL
        slug = quote_plus(query.lower().replace(" ", "-"))
        return f"{self.base_url}/recambios-desguace/{slug}"

    async def scrape(self, query: str) -> ScraperResult:
        url = self.build_url(query)
        html, error = await self.fetch(url)
        if error:
            return ScraperResult(source=self.name, listings=[], error=error)

        soup = BeautifulSoup(html, "lxml")
        listings: List[PartListing] = []

        # Buscar todos los links de detalle — cada pieza tiene 2 links (img + texto)
        seen_urls = set()
        for link_el in soup.select("a[href*='/detalle/']")[:20]:
            link = link_el["href"]
            if link in seen_urls:
                continue
            seen_urls.add(link)

            # El link de texto tiene el nombre de la pieza
            title_text = link_el.get_text(strip=True)
            if not title_text or len(title_text) < 5:
                continue  # saltar links de imagen

            if link.startswith("/"):
                link = self.base_url + link

            # Buscar el precio en el contenedor padre
            card = link_el.closest("div") if hasattr(link_el, "closest") else None
            # En BS4 subimos manualmente
            el = link_el.parent
            price_raw = ""
            for _ in range(6):
                if el is None:
                    break
                price_el = el.select_one("span.price-new")
                if price_el:
                    price_raw = price_el.get_text(strip=True)
                    break
                el = el.parent

            price = parse_price(price_raw)

            # Imagen
            img_el = link_el.find_previous("img") or link_el.find("img")
            image = None
            if img_el:
                image = img_el.get("src") or img_el.get("data-src")

            listings.append(PartListing(
                title=title_text, price=price, price_raw=price_raw,
                url=link, source=self.name, image_url=image,
            ))

            if len(listings) >= 10:
                break

        return ScraperResult(source=self.name, listings=listings)
