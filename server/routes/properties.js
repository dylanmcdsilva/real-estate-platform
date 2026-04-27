const express = require("express");
const router = express.Router();

// In-memory store (replace with MongoDB/Postgres in Phase 2)
let properties = [
  {
    id: 1,
    name: "Quinta do Sol",
    agency: "Imobiliária Central",
    type: "House",
    price: 285000,
    area: 180,
    bedrooms: 4,
    city: "Leiria",
    lat: 39.7436,
    lng: -8.8071,
    description: "Spacious family home with garden and garage.",
    listedAt: "2024-11-01"
  },
  {
    id: 2,
    name: "Apartamento Moderno T2",
    agency: "Era Imóveis",
    type: "Apartment",
    price: 162000,
    area: 85,
    bedrooms: 2,
    city: "Batalha",
    lat: 39.6572,
    lng: -8.8278,
    description: "Modern 2-bedroom apartment near the monastery.",
    listedAt: "2024-12-10"
  },
  {
    id: 3,
    name: "Moradia T3 com Piscina",
    agency: "Remax Oeste",
    type: "House",
    price: 420000,
    area: 230,
    bedrooms: 3,
    city: "Porto de Mós",
    lat: 39.6028,
    lng: -8.8193,
    description: "Luxurious villa with pool and mountain views.",
    listedAt: "2025-01-15"
  },
  {
    id: 4,
    name: "Terreno Urbano",
    agency: "Imobiliária Central",
    type: "Land",
    price: 75000,
    area: 500,
    bedrooms: 0,
    city: "Alcobaça",
    lat: 39.5497,
    lng: -8.9783,
    description: "Urban plot with approved building license.",
    listedAt: "2025-02-05"
  },
  {
    id: 5,
    name: "Loja Comercial Centro",
    agency: "Era Imóveis",
    type: "Commercial",
    price: 195000,
    area: 120,
    bedrooms: 0,
    city: "Leiria",
    lat: 39.7489,
    lng: -8.8109,
    description: "Prime commercial space in city centre.",
    listedAt: "2025-03-01"
  },
  {
    id: 6,
    name: "Casa de Campo",
    agency: "Remax Oeste",
    type: "House",
    price: 340000,
    area: 200,
    bedrooms: 5,
    city: "Nazaré",
    lat: 39.6017,
    lng: -9.0697,
    description: "Charming countryside home with ocean views.",
    listedAt: "2025-01-28"
  },
  {
    id: 7,
    name: "Apartamento T1 Novo",
    agency: "Imobiliária Central",
    type: "Apartment",
    price: 118000,
    area: 55,
    bedrooms: 1,
    city: "Marinha Grande",
    lat: 39.7483,
    lng: -8.9307,
    description: "Brand new studio near industrial zone.",
    listedAt: "2025-02-20"
  },
  {
    id: 8,
    name: "Armazém Industrial",
    agency: "Era Imóveis",
    type: "Commercial",
    price: 520000,
    area: 800,
    bedrooms: 0,
    city: "Marinha Grande",
    lat: 39.7401,
    lng: -8.9221,
    description: "Large warehouse with loading docks and office space.",
    listedAt: "2025-03-10"
  }
];

// GET all properties (with optional filters)
router.get("/", (req, res) => {
  let result = [...properties];

  const { type, city, agency, minPrice, maxPrice, minBeds } = req.query;

  if (type) result = result.filter(p => p.type === type);
  if (city) result = result.filter(p => p.city.toLowerCase().includes(city.toLowerCase()));
  if (agency) result = result.filter(p => p.agency === agency);
  if (minPrice) result = result.filter(p => p.price >= Number(minPrice));
  if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));
  if (minBeds) result = result.filter(p => p.bedrooms >= Number(minBeds));

  res.json(result);
});

// GET single property
router.get("/:id", (req, res) => {
  const prop = properties.find(p => p.id === Number(req.params.id));
  if (!prop) return res.status(404).json({ error: "Property not found" });
  res.json(prop);
});

// POST new property
router.post("/", (req, res) => {
  const required = ["name", "agency", "type", "price", "lat", "lng"];
  for (const field of required) {
    if (req.body[field] === undefined) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  const newProp = {
    id: Date.now(),
    listedAt: new Date().toISOString().split("T")[0],
    ...req.body
  };
  properties.push(newProp);
  res.status(201).json(newProp);
});

// PUT update property
router.put("/:id", (req, res) => {
  const idx = properties.findIndex(p => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Property not found" });
  properties[idx] = { ...properties[idx], ...req.body, id: properties[idx].id };
  res.json(properties[idx]);
});

// DELETE property
router.delete("/:id", (req, res) => {
  const idx = properties.findIndex(p => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Property not found" });
  properties.splice(idx, 1);
  res.json({ message: "Property deleted" });
});

// GET analytics
router.get("/meta/stats", (req, res) => {
  const total = properties.length;
  const avgPrice = total ? properties.reduce((s, p) => s + p.price, 0) / total : 0;
  const byType = {};
  const byAgency = {};
  const byCity = {};

  properties.forEach(p => {
    byType[p.type] = (byType[p.type] || 0) + 1;
    byAgency[p.agency] = (byAgency[p.agency] || 0) + 1;
    byCity[p.city] = (byCity[p.city] || 0) + 1;
  });

  res.json({ total, avgPrice, byType, byAgency, byCity });
});

module.exports = router;
