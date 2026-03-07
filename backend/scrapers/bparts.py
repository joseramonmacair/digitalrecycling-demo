"""
Scraper B-Parts — selectores verificados en vivo
URL OEM: https://www.b-parts.com/es/recambios-auto/search?reference=QUERY
Card: div.relative (contiene precio + link + sku)
SKU: div.text-neutral-50.text-xs.font-bold
Título: div.font-bold.text-base (primer div.font-bold en el card)
Vehículo: span.text-xs.leading-3.inline.mr-1.font-light
Precio: div.font-bold.text-base (2º div.font-bold)
Link: a[href*="/recambios-auto/electricidad"], a[href*="/recambios-auto/"]
NOTA: B-Parts solo funciona bien con referencias OEM exactas.
"""
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus


class BPartsScraper(BaseScraper):
    name = "bparts"
    base_url = "https://www.b-parts.com"

    def build_url(self, query: str) -> str:
        return f"{self.base_url}/es/recambios-auto/search?reference={quote_plus(query)}"

    async def scrape(self, query: str) -> ScraperResult:
        url = self.build_url(query)
        html, error = await self.fetch(url)
        if error:
            return ScraperResult(source=self.name, listings=[], error=error)

        soup = BeautifulSoup(html, "lxml")
        listings: List[PartListing] = []

        # Cada card tiene un SKU tipo "BP123..."
        for sku_el in soup.select("div.text-neutral-50.text-xs.font-bold.pb-1")[:10]:
            card = sku_el.parent
            if not card:
                continue

            # Título = primer div.font-bold.text-base
            bold_divs = card.select("div.font-bold.text-base")
            title = bold_divs[0].get_text(strip=True) if bold_divs else "Sin título"

            # Vehículo = spans con texto del coche
            vehicle_spans = card.select("span.text-xs.leading-3.inline.mr-1.font-light")
            vehicle = " ".join(s.get_text(strip=True) for s in vehicle_spans[:3])
            if vehicle:
                title = f"{title} — {vehicle}"

            # Precio = último div.font-bold que contiene €
            price_raw = ""
            for div in reversed(bold_divs):
                txt = div.get_text(strip=True)
                if "€" in txt:
                    price_raw = txt
                    break
            price = parse_price(price_raw)

            # Link
            link_el = card.select_one("a[href*='/recambios-auto/']")
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
