# PropMap — Real Estate Platform

A PropTech GIS platform for listing, visualising, and analysing real estate in Portugal.

## Stack

| Layer    | Tech                                    |
|----------|-----------------------------------------|
| Frontend | Vanilla JS + Leaflet + CartoDB tiles    |
| Backend  | Node.js + Express                       |
| Auth     | JWT + bcryptjs                          |
| Data     | In-memory (swap for MongoDB/Postgres)   |

## Quick Start

```bash
npm install
npm start
```

Then open → http://localhost:3000

**Demo credentials:** `admin@platform.pt` / `admin123`

## API Endpoints

### Properties
| Method | Path                        | Description              |
|--------|-----------------------------|--------------------------|
| GET    | /api/properties             | List all (with filters)  |
| GET    | /api/properties/:id         | Single property          |
| POST   | /api/properties             | Add new property         |
| PUT    | /api/properties/:id         | Update property          |
| DELETE | /api/properties/:id         | Delete property          |
| GET    | /api/properties/meta/stats  | Aggregate stats          |

**Filter query params:** `type`, `city`, `agency`, `minPrice`, `maxPrice`, `minBeds`

### Auth
| Method | Path              | Description     |
|--------|-------------------|-----------------|
| POST   | /api/auth/login   | Login → JWT     |
| POST   | /api/auth/register| Register → JWT  |
| GET    | /api/auth/me      | Current user    |

## Project Structure

```
real-estate-platform/
├── client/             # Frontend (served as static files)
│   ├── index.html
│   ├── app.js
│   └── style.css
├── server/
│   ├── app.js          # Express entry point
│   └── routes/
│       ├── properties.js
│       └── auth.js
├── data/               # GeoJSON/CSV imports (future)
├── package.json
└── README.md
```

## Roadmap

- **Phase 2** — MongoDB/Postgres persistent database
- **Phase 3** — GeoJSON/KML import, zoning layers
- **Phase 4** — Multi-agency dashboard, price trend charts
