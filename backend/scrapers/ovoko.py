import os
from .base import BaseScraper, PartListing, ScraperResult, parse_price
from bs4 import BeautifulSoup
from typing import List
from urllib.parse import quote_plus

SCRAPER_API_KEY = os.environ.get("SCRAPER_API_KEY", "")


class OvokoScraper(BaseScraper):
    name = "ovoko"
    base_url = "https://ovoko.es"

    async def scrape(self, query: str) -> ScraperResult:
        if not SCRAPER_API_KEY:
            return ScraperResult(source=self.name, listings=[], error="SCRAPER_API_KEY not configured")

        target_url = f"{self.base_url}/buscar?q={quote_plus(query)}"
        api_url = f"https://api.scraperapi.com/?api_key={SCRAPER_API_KEY}&url={quote_plus(target_url)}&render=true&wait_for_css=div.products__items"

        html, error = await self.fetch(api_url)
        if not html:
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
            link = link_el.get("href", self.base_url) if link_el else self.base_url
            if link.startswith("/"):
                link = self.base_url + link

            img_el = card.select_one("img")
            image = img_el.get("src") or img_el.get("data-src") if img_el else None

            listings.append(PartListing(
                title=title, price=price, price_raw=price_raw,
                url=link, source=self.name, image_url=image,
            ))

        return ScraperResult(source=self.name, listings=listings)
