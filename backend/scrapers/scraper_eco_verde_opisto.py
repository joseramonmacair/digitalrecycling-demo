"""
Scrapers: Ecooparts · RecambioVerde · Opisto
Búsqueda por referencia OEM
"""
import asyncio
import httpx
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from dataclasses import dataclass, asdict
from typing import Optional
import re

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "es-ES,es;q=0.9",
}


@dataclass
class PartListing:
    source: str = ""
    oem: str = ""
    part_name: str = ""
    price: Optional[float] = None
    condition: str = "Usado"
    seller: str = ""
    location: str = ""
    warranty: str = ""
    url: str = ""
    image_url: str = ""


def extract_price(text: str) -> Optional[float]:
    """Extrae precio numérico de un string como '45,00 €' o '45.00€'"""
    match = re.search(r"(\d{1,6})[.,](\d{2})", text.replace(" ", ""))
    if match:
        return float(f"{match.group(1)}.{match.group(2)}")
    return None


# ─────────────────────────────────────────────
# ECOOPARTS
# ─────────────────────────────────────────────
async def scrape_ecooparts(oem_ref: str) -> list[PartListing]:
    results = []
    url = f"https://www.ecooparts.com/es/buscar?q={oem_ref}"

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # Ecooparts — marketplace español de piezas eco/recicladas
            cards = soup.select(".product-card, .part-card, .listing-item, article")

            for card in cards[:10]:
                listing = PartListing(source="ecooparts", oem=oem_ref)

                name_el = card.select_one("h2, h3, .product-title, .part-name")
                listing.part_name = name_el.get_text(strip=True) if name_el else ""

                price_el = card.select_one(".price, .product-price, [itemprop='price']")
                if price_el:
                    content = price_el.get("content") or price_el.get_text(strip=True)
                    listing.price = extract_price(content)

                seller_el = card.select_one(".seller, .vendor, .desguace-name")
                listing.seller = seller_el.get_text(strip=True) if seller_el else ""

                loc_el = card.select_one(".location, .provincia, .city")
                listing.location = loc_el.get_text(strip=True) if loc_el else ""

                link_el = card.select_one("a[href]")
                if link_el:
                    href = link_el["href"]
                    listing.url = href if href.startswith("http") else f"https://www.ecooparts.com{href}"

                img_el = card.select_one("img[src]")
                listing.image_url = img_el.get("src", "") if img_el else ""

                if listing.price:
                    results.append(listing)

        except Exception as e:
            print(f"[ecooparts] Error: {e}")

    return results


# ─────────────────────────────────────────────
# RECAMBIO VERDE
# ─────────────────────────────────────────────
async def scrape_recambioverde(oem_ref: str) -> list[PartListing]:
    results = []
    # RecambioVerde — desguaces sostenibles España
    url = f"https://www.recambioverde.es/buscar/{oem_ref}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=HEADERS["User-Agent"],
            locale="es-ES",
        )
        page = await context.new_page()
        try:
            await page.goto(url, wait_until="networkidle", timeout=30_000)

            # Esperar resultados
            try:
                await page.wait_for_selector(".result-item, .pieza-item, .listing", timeout=8_000)
            except Exception:
                pass

            html = await page.content()
            soup = BeautifulSoup(html, "html.parser")

            cards = soup.select(".result-item, .pieza-item, .listing, .product")

            for card in cards[:10]:
                listing = PartListing(source="recambioverde", oem=oem_ref)

                name_el = card.select_one("h2, h3, .name, .title")
                listing.part_name = name_el.get_text(strip=True) if name_el else ""

                price_el = card.select_one(".price, .precio, [class*='price']")
                if price_el:
                    listing.price = extract_price(price_el.get_text(strip=True))

                seller_el = card.select_one(".desguace, .seller, .vendor")
                listing.seller = seller_el.get_text(strip=True) if seller_el else ""

                loc_el = card.select_one(".location, .provincia")
                listing.location = loc_el.get_text(strip=True) if loc_el else ""

                warranty_el = card.select_one(".garantia, .warranty")
                listing.warranty = warranty_el.get_text(strip=True) if warranty_el else ""

                link_el = card.select_one("a[href]")
                if link_el:
                    href = link_el["href"]
                    listing.url = href if href.startswith("http") else f"https://www.recambioverde.es{href}"

                if listing.price:
                    results.append(listing)

        except Exception as e:
            print(f"[recambioverde] Error: {e}")
        finally:
            await browser.close()

    return results


# ─────────────────────────────────────────────
# OPISTO
# ─────────────────────────────────────────────
async def scrape_opisto(oem_ref: str) -> list[PartListing]:
    """
    Opisto — marketplace franco-europeo de piezas de segunda mano.
    Tiene buena estructura de búsqueda por OEM.
    """
    results = []
    url = f"https://www.opisto.com/es/buscar?ref={oem_ref}&type=oem"

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # Opisto — estructura tipo marketplace
            cards = soup.select(".product, .ad-item, .listing-card, [data-ad-id]")

            for card in cards[:10]:
                listing = PartListing(source="opisto", oem=oem_ref)

                name_el = card.select_one("h2, h3, .ad-title, .product-name")
                listing.part_name = name_el.get_text(strip=True) if name_el else ""

                price_el = card.select_one(".price, .ad-price, [itemprop='price']")
                if price_el:
                    content = price_el.get("content") or price_el.get_text(strip=True)
                    listing.price = extract_price(content)

                seller_el = card.select_one(".seller, .shop-name, .user-name")
                listing.seller = seller_el.get_text(strip=True) if seller_el else ""

                loc_el = card.select_one(".location, .city, [data-location]")
                listing.location = loc_el.get_text(strip=True) if loc_el else ""

                link_el = card.select_one("a[href]")
                if link_el:
                    href = link_el["href"]
                    listing.url = href if href.startswith("http") else f"https://www.opisto.com{href}"

                img_el = card.select_one("img[src]")
                listing.image_url = img_el.get("src", "") if img_el else ""

                if listing.price:
                    results.append(listing)

        except Exception as e:
            print(f"[opisto] Error: {e}")

    return results


# ─────────────────────────────────────────────
# Test conjunto
# ─────────────────────────────────────────────
if __name__ == "__main__":
    async def main():
        oem = "036100098AX"
        print(f"\n=== Buscando OEM: {oem} ===\n")

        tasks = [
            scrape_ecooparts(oem),
            scrape_recambioverde(oem),
            scrape_opisto(oem),
        ]
        all_results = await asyncio.gather(*tasks)
        for source_results in all_results:
            for l in source_results:
                print(asdict(l))

    asyncio.run(main())
