/**
 * Imovirtual Scraper
 * Usage: node scraper/imovirtual.js
 * 
 * Scrapes property listings from Imovirtual and saves to data/listings.json
 * Run this locally or as a cron job — don't run on every request.
 */

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

// ── CONFIG ────────────────────────────────────────────
const CONFIG = {
  baseUrl: "https://www.imovirtual.com",
  searchPaths: [
    "/comprar/moradia/leiria/",
    "/comprar/apartamento/leiria/",
    "/comprar/moradia/batalha/",
    "/comprar/apartamento/batalha/",
    "/comprar/moradia/alcobaca/",
    "/comprar/moradia/nazare/",
  ],
  maxPages: 3,         // pages per search path
  delayMs: 2000,       // delay between requests (be polite)
  outputFile: path.join(__dirname, "../data/listings.json"),
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Cache-Control": "max-age=0",
  "Upgrade-Insecure-Requests": "1",
};

// ── HELPERS ───────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parsePrice(text) {
  if (!text) return null;
  const num = text.replace(/[^\d]/g, "");
  return num ? parseInt(num) : null;
}

function parseArea(text) {
  if (!text) return null;
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function parseBedrooms(text) {
  if (!text) return 0;
  const match = text.match(/T(\d+)/i);
  return match ? parseInt(match[1]) : 0;
}

// Geocode city name to rough coordinates
const CITY_COORDS = {
  "leiria":        [39.7436, -8.8071],
  "batalha":       [39.6572, -8.8278],
  "alcobaça":      [39.5497, -8.9783],
  "alcobaca":      [39.5497, -8.9783],
  "nazaré":        [39.6017, -9.0697],
  "nazare":        [39.6017, -9.0697],
  "porto de mós":  [39.6028, -8.8193],
  "marinha grande":[39.7483, -8.9307],
  "caldas da rainha": [39.4019, -9.1339],
};

function getCoordsForCity(city) {
  if (!city) return [39.7, -8.8];
  const key = city.toLowerCase().trim();
  for (const [name, coords] of Object.entries(CITY_COORDS)) {
    if (key.includes(name)) {
      // Add small random offset so pins don't stack
      return [
        coords[0] + (Math.random() - 0.5) * 0.02,
        coords[1] + (Math.random() - 0.5) * 0.02,
      ];
    }
  }
  return [39.7 + (Math.random() - 0.5) * 0.1, -8.8 + (Math.random() - 0.5) * 0.1];
}

// ── SCRAPER ───────────────────────────────────────────
async function scrapePage(url) {
  try {
    console.log(`  Fetching: ${url}`);
    const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(res.data);
    const listings = [];

    // Imovirtual listing cards (structure as of 2024/2025)
    // They use article tags with data attributes
    $("article[data-cy='listing-item'], article.offer-item, [data-testid='listing-item']").each((i, el) => {
      const $el = $(el);

      // Name / title
      const name = $el.find("h3, [data-cy='listing-item-title'], .offer-item-title").first().text().trim();

      // Price
      const priceText = $el.find("[data-cy='listing-item-price'], .offer-item-price, strong.price").first().text().trim();
      const price = parsePrice(priceText);

      // Location
      const locationText = $el.find("[data-cy='listing-item-address'], .offer-item-location, p.text-xs").first().text().trim();

      // Area & bedrooms from title or details
      const detailsText = $el.find(".offer-item-details, [data-cy='listing-item-details']").text();
      const area = parseArea(detailsText) || parseArea(name);
      const bedrooms = parseBedrooms(name) || parseBedrooms(detailsText);

      // Property type from URL or class
      const link = $el.find("a").first().attr("href") || "";
      let type = "House";
      if (link.includes("apartamento") || name.toLowerCase().includes("apartamento") || name.match(/T\d/)) type = "Apartment";
      else if (link.includes("terreno") || name.toLowerCase().includes("terreno")) type = "Land";
      else if (link.includes("comercial") || link.includes("escritorio")) type = "Commercial";

      // Image
      const image = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || null;

      // Extract city from location
      const locationParts = locationText.split(",");
      const city = locationParts[locationParts.length - 1]?.trim() || "Leiria";

      if (!name || !price) return; // skip invalid

      listings.push({
        id: Date.now() + i + Math.random(),
        name: name || "Property",
        agency: "Imovirtual",
        type,
        price,
        area: area || null,
        bedrooms: bedrooms || 0,
        city,
        location: locationText,
        description: `${name} — ${locationText}`,
        image,
        source: "imovirtual",
        sourceUrl: link.startsWith("http") ? link : CONFIG.baseUrl + link,
        lat: getCoordsForCity(city)[0],
        lng: getCoordsForCity(city)[1],
        listedAt: new Date().toISOString().split("T")[0],
      });
    });

    // Also try Next.js __NEXT_DATA__ (Imovirtual migrated to Next.js)
    const nextDataScript = $("#__NEXT_DATA__").html();
    if (nextDataScript && listings.length === 0) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const items =
          nextData?.props?.pageProps?.data?.searchAds?.items ||
          nextData?.props?.pageProps?.listings?.items ||
          nextData?.props?.pageProps?.adsData?.searchAds?.items ||
          [];

        items.forEach((item, i) => {
          const price = item.totalPrice?.value || item.priceFromPerSqm?.value || null;
          const city = item.location?.address?.city?.name || item.location?.reverseGeocoding?.city || "Leiria";
          const coords = item.location?.coordinates;

          listings.push({
            id: item.id || Date.now() + i,
            name: item.title || item.characteristicsSummary || "Property",
            agency: item.agency?.name || item.seller?.name || "Imovirtual",
            type: item.estate === "FLAT" ? "Apartment" : item.estate === "HOUSE" ? "House" : item.estate === "TERRAIN" ? "Land" : "House",
            price,
            area: item.areaInSquareMeters || null,
            bedrooms: item.roomsNumber || 0,
            city,
            location: [item.location?.address?.street?.name, city].filter(Boolean).join(", "),
            description: item.description || item.title || "",
            image: item.images?.[0]?.large || item.mainImage || null,
            source: "imovirtual",
            sourceUrl: item.url ? CONFIG.baseUrl + item.url : null,
            lat: coords?.latitude || getCoordsForCity(city)[0],
            lng: coords?.longitude || getCoordsForCity(city)[1],
            listedAt: new Date().toISOString().split("T")[0],
          });
        });
      } catch (e) {
        console.log("  Could not parse __NEXT_DATA__:", e.message);
      }
    }

    console.log(`  Found ${listings.length} listings`);
    return listings;

  } catch (err) {
    console.error(`  Error fetching ${url}:`, err.message);
    return [];
  }
}

async function scrape() {
  console.log("🏠 Starting Imovirtual scraper...\n");

  // Ensure output directory exists
  const dataDir = path.dirname(CONFIG.outputFile);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const allListings = [];
  const seen = new Set();

  for (const searchPath of CONFIG.searchPaths) {
    for (let page = 1; page <= CONFIG.maxPages; page++) {
      const url = `${CONFIG.baseUrl}${searchPath}?page=${page}`;
      const listings = await scrapePage(url);

      // Deduplicate by name+price
      listings.forEach(l => {
        const key = `${l.name}-${l.price}`;
        if (!seen.has(key) && l.price) {
          seen.add(key);
          allListings.push(l);
        }
      });

      if (listings.length === 0) break; // no more pages
      await sleep(CONFIG.delayMs);
    }
  }

  // Save to file
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(allListings, null, 2));
  console.log(`\n✅ Done! Saved ${allListings.length} listings to ${CONFIG.outputFile}`);
  return allListings;
}

// Run if called directly
if (require.main === module) {
  scrape().catch(console.error);
}

module.exports = { scrape };
