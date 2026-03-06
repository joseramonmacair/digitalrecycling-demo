"""
Scraper: Ovoko (ovoko.com / ovoko.es)
Búsqueda por referencia OEM — tienen API pública y búsqueda por OEM muy buena
"""
import asyncio
import httpx
from bs4 import BeautifulSoup
from dataclasses import dataclass, asdict
from typing import Optional
import re


@dataclass
class PartListing:
    source: str = "ovoko"
    oem: str = ""
    part_name: str = ""
    price: Optional[float] = None
    currency: str = "EUR"
    condition: str = ""
    seller: str = ""
    seller_country: str = ""
    warranty_months: int = 0
    mileage: Optional[int] = None
    url: str = ""
    image_url: str = ""


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "es-ES,es;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


async def scrape_ovoko(oem_ref: str) -> list[PartListing]:
    results = []
    # Ovoko tiene search directa por referencia OEM
    search_url = f"https://www.ovoko.es/buscar?q={oem_ref}&type=oem"

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        try:
            resp = await client.get(search_url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # Ovoko usa data-* attributes en sus cards
            cards = soup.select("[data-part-id], .part-item, .catalog-item")

            for card in cards[:15]:
                listing = PartListing(oem=oem_ref)

                name_el = card.select_one(".part-name, .title, h2, h3")
                listing.part_name = name_el.get_text(strip=True) if name_el else ""

                # Precio — Ovoko suele mostrarlo como "XX,XX €"
                price_el = card.select_one(".price, [data-price], .part-price")
                if price_el:
                    raw = price_el.get_text(strip=True)
                    match = re.search(r"[\d\s]+[.,]\d{2}", raw)
                    if match:
                        clean = match.group().replace(" ", "").replace(",", ".")
                        listing.price = float(clean)

                # Garantía
                warranty_el = card.select_one(".warranty, .garantia")
                if warranty_el:
                    wtext = warranty_el.get_text(strip=True)
                    m = re.search(r"(\d+)\s*mes", wtext, re.I)
                    listing.warranty_months = int(m.group(1)) if m else 0

                # Vendedor / país
                seller_el = card.select_one(".seller-name, .vendor")
                listing.seller = seller_el.get_text(strip=True) if seller_el else ""

                country_el = card.select_one("[data-country], .country-flag")
                listing.seller_country = country_el.get("data-country", "") if country_el else ""

                # Kilometraje
                km_el = card.select_one(".mileage, .km, [data-km]")
                if km_el:
                    km_raw = km_el.get_text(strip=True)
                    km_match = re.search(r"[\d\.]+", km_raw)
                    if km_match:
                        listing.mileage = int(km_match.group().replace(".", ""))

                link_el = card.select_one("a[href]")
                if link_el:
                    href = link_el["href"]
                    listing.url = href if href.startswith("http") else f"https://www.ovoko.es{href}"

                img_el = card.select_one("img[src]")
                listing.image_url = img_el.get("src", "") if img_el else ""

                if listing.price:
                    results.append(listing)

        except httpx.HTTPError as e:
            print(f"[ovoko] HTTP Error: {e}")
        except Exception as e:
            print(f"[ovoko] Error scraping '{oem_ref}': {e}")

    return results


if __name__ == "__main__":
    listings = asyncio.run(scrape_ovoko("036100098AX"))
    for l in listings:
        print(asdict(l))
