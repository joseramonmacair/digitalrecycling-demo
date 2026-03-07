"""
Scraper Ecooparts — selectores verificados en vivo
URL: https://ecooparts.com/recambios-automovil-segunda-mano/?pag=pro&tebu=BASE64&txbu=BASE64
Card: div.product-card
Título: .product-card__name (primer texto > 5 chars)
Precio: div.product-card__price--current
Link: a[href*='recambio-automovil']
"""
import re
import base64
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup


class EcoopartsScraper(BaseScraper):
    name = "ecooparts"
    base_url = "https://ecooparts.com"

    def _b64(self, text: str) -> str:
        return base64.b64encode(text.encode()).decode()

    def build_url(self, query: str) -> str:
        q64 = self._b64(query)
        return f"{self.base_url}/recambios-automovil-segunda-mano/?pag=pro&tebu={q64}&txbu={q64}"

    async def scrape(self, query: str) -> ScraperResult:
        url = self.build_url(query)
        html, error = await self.fetch(url)
        if error:
            return ScraperResult(source=self.name, listings=[], error=error)

        soup = BeautifulSoup(html, "lxml")
        listings = []

        for card in soup.select("div.product-card")[:10]:
            # Título
            name_block = card.select_one(".product-card__name")
            title = None
            if name_block:
                for child in name_block.children:
                    text = getattr(child, "string", None) or (
                        child.get_text(strip=True) if hasattr(child, "get_text") else ""
                    )
                    text = text.strip()
                    if len(text) > 5 and "Stock" not in text and "Carrito" not in text:
                        title = text
                        break
            if not title:
                continue

            price_el = card.select_one(".product-card__price--current")
            price_raw = price_el.get_text(strip=True) if price_el else ""
            price = parse_price(price_raw)

            link_el = card.select_one("a[href*='recambio-automovil']")
            link = link_el.get("href", url) if link_el else url
            if link and not link.startswith("http"):
                link = self.base_url + link

            img_el = card.select_one("img")
            image = None
            if img_el:
                image = img_el.get("src") or img_el.get("data-src")

            oem_match = re.search(r"OEM[:\s]+([A-Z0-9]{6,})", card.get_text(), re.I)
            oem = oem_match.group(1) if oem_match else None

            listings.append(PartListing(
                title=title, price=price, price_raw=price_raw,
                url=link, source=self.name, image_url=image, reference=oem,
            ))

        return ScraperResult(source=self.name, listings=listings)
