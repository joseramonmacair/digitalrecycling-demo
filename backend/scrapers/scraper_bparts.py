"""
Scraper: BParts (bparts.com)
Búsqueda por referencia OEM
"""
import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from dataclasses import dataclass, asdict
from typing import Optional
import re


@dataclass
class PartListing:
    source: str = "bparts"
    oem: str = ""
    part_name: str = ""
    price: Optional[float] = None
    condition: str = ""
    seller: str = ""
    location: str = ""
    warranty: str = ""
    url: str = ""
    image_url: str = ""


async def scrape_bparts(oem_ref: str, headless: bool = True) -> list[PartListing]:
    results = []
    search_url = f"https://www.bparts.pt/en/search?q={oem_ref}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="es-ES",
        )
        page = await context.new_page()

        try:
            await page.goto(search_url, wait_until="networkidle", timeout=30_000)
            await page.wait_for_selector(".product-item, .search-result, article", timeout=10_000)

            html = await page.content()
            soup = BeautifulSoup(html, "html.parser")

            # Ajustar selectores según estructura real de bparts
            cards = soup.select(".product-item")
            for card in cards[:10]:
                listing = PartListing(oem=oem_ref)

                name_el = card.select_one(".product-name, h2, h3, .title")
                listing.part_name = name_el.get_text(strip=True) if name_el else ""

                price_el = card.select_one(".price, .product-price, [data-price]")
                if price_el:
                    raw = price_el.get_text(strip=True)
                    match = re.search(r"[\d.,]+", raw.replace(",", "."))
                    if match:
                        listing.price = float(match.group().replace(",", "."))

                cond_el = card.select_one(".condition, .estado")
                listing.condition = cond_el.get_text(strip=True) if cond_el else "Usado"

                seller_el = card.select_one(".seller, .vendor, .desguace")
                listing.seller = seller_el.get_text(strip=True) if seller_el else ""

                link_el = card.select_one("a[href]")
                if link_el:
                    href = link_el["href"]
                    listing.url = href if href.startswith("http") else f"https://www.bparts.pt{href}"

                img_el = card.select_one("img[src]")
                listing.image_url = img_el["src"] if img_el else ""

                if listing.price:
                    results.append(listing)

        except Exception as e:
            print(f"[bparts] Error scraping '{oem_ref}': {e}")
        finally:
            await browser.close()

    return results


if __name__ == "__main__":
    listings = asyncio.run(scrape_bparts("036100098AX"))
    for l in listings:
        print(asdict(l))
