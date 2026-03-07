import os
import base64
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus

SCRAPER_API_KEY = os.environ.get("SCRAPER_API_KEY", "")


class EcoopartsScraper(BaseScraper):
    name = "ecooparts"
    base_url = "https://ecooparts.com"

    def build_url(self, query: str) -> str:
        q = query.encode()
        tebu = base64.b64encode(q).decode()
        busval = base64.b64encode(
            f"|{query}|ninguno|productos|-1|0|0|0|0||0|0|0".encode()
        ).decode()
        params = (
            f"busval={busval}&filval=&panu=1&toen=NWg4amtqYjA5M2NoaXdtOTV0Ym45"
            f"&tolreg=MA==&veid=MA==&paid=NjA=&qregx=MzA=&tmin=MQ=="
            f"&idla=ZXNfRVM=&fila=ZXNfRVM=&oem=&vin=&ma=0&md=0&ca=0&ar=0"
        )
        return f"{self.base_url}/ajax/ajax_buscador.php?{params}"

    async def scrape(self, query: str) -> ScraperResult:
        url = self.build_url(query)
        html, error = await self.fetch(url)
        if not html:
            return ScraperResult(source=self.name, listings=[], error=error)

        soup = BeautifulSoup(html, "lxml")
        listings: List[PartListing] = []

        for card in soup.select("div.product-item, li.product, div.item-product, article")[:10]:
            title_el = card.select_one("h2, h3, .product-name, a[href*=recambio]")
            title = title_el.get_text(strip=True) if title_el else ""

            price_el = card.select_one(".price, [class*=price], [class*=precio]")
            price_raw = price_el.get_text(strip=True) if price_el else ""
            price = parse_price(price_raw)

            link_el = card.select_one("a[href*=recambio]")
            link = link_el.get("href", self.base_url) if link_el else self.base_url
            if link.startswith("/"):
                link = self.base_url + link

            img_el = card.select_one("img")
            image = img_el.get("src") if img_el else None

            if title:
                listings.append(PartListing(
                    title=title, price=price, price_raw=price_raw,
                    url=link, source=self.name, image_url=image,
                ))

        # Si no encontro cards con selectores estandar, parsea el HTML plano de la API
        if not listings:
            import re
            blocks = re.split(r"(?:ID: \d+)", html)
            for block in blocks[1:11]:
                title_m = re.search(r"ALTERNADOR[^\n<]{5,80}|[A-Z][A-Z ]{5,60}(?:FORD|SEAT|OPEL|CITROEN|VW|RENAULT|BMW|AUDI|PEUGEOT)[^\n<]{5,60}", block)
                price_m = re.search(r"([\d]+[,.][\d]+)\s*EUR|(\d+[,.]?\d*)\s*€", block)
                link_m = re.search(r'href=["']([^"']*recambio[^"']*)["']', block)

                if title_m and price_m:
                    title = title_m.group(0).strip()[:100]
                    price_raw = price_m.group(0).strip()
                    price = parse_price(price_raw)
                    link = (self.base_url + link_m.group(1)) if link_m else self.base_url
                    listings.append(PartListing(
                        title=title, price=price, price_raw=price_raw,
                        url=link, source=self.name,
                    ))

        return ScraperResult(source=self.name, listings=listings)
