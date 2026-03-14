# YatraNepal - Real-time Public Transit Tracker

A real-time public transportation tracking application for Kathmandu Valley, Nepal. Track buses and minibuses across multiple routes with live map visualization, ETAs, traffic overlays, and proximity notifications.

![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Express](https://img.shields.io/badge/Express-4-000000)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

## Features

- **Live Vehicle Tracking** — Buses and minibuses move along real road geometry (via OSRM) with positions broadcast over WebSocket every 3 seconds
- **Multiple Map Layers** — Street map (OpenStreetMap) and satellite view (Esri + CartoDB labels) with seamless toggle
- **Location Search** — Search any location in Nepal using OpenStreetMap Nominatim geocoding, click to fly to it
- **Route Filtering** — Searchable dropdown to filter the map by specific transit routes
- **Vehicle Types** — Visual distinction between buses (32px icon) and minibuses (28px icon) with different SVG shapes
- **Transport Companies** — Sajha Yatayat, Mahanagar Yatayat, Nepal Yatayat, and Bagmati Yatayat
- **Real-time ETAs** — Server-calculated estimated arrival times at each stop using Haversine distance and traffic-aware speed
- **Traffic Overlay** — Toggle color-coded traffic congestion circles on the map
- **Proximity Notifications** — Automatic alerts when a bus approaches a stop within 200 meters
- **Route Geometry** — Road-accurate polylines fetched from OSRM and stored in the database

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite 5** for development and build
- **react-leaflet** / Leaflet.js for interactive maps
- **TanStack Query v5** for server state management
- **wouter** for client-side routing
- **shadcn/ui** + Radix UI primitives
- **Tailwind CSS 3** for styling
- **lucide-react** for icons

### Backend
- **Node.js 20** with Express 4
- **WebSocket** (`ws` package) for real-time updates
- **PostgreSQL** with Drizzle ORM
- **Zod** for schema validation (via drizzle-zod)

### External Services (free, no API keys)
- **OpenStreetMap** — Street map tiles
- **Esri World Imagery** — Satellite tiles
- **CartoDB** — Label overlays for satellite view
- **OSRM Demo Server** — Road geometry for route polylines (used at seed time)
- **Nominatim** — Location search / geocoding

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── MapView.tsx       # Main map with layers, markers, routes
│   │   │   ├── BusInfoCard.tsx   # Bus detail card with ETAs
│   │   │   ├── RouteSelector.tsx # Route filter dropdown with search
│   │   │   ├── LocationSearch.tsx # Location search with Nominatim
│   │   │   ├── NotificationPanel.tsx # Notification list + route toggles
│   │   │   ├── TrafficToggle.tsx # Traffic overlay toggle
│   │   │   └── ui/              # shadcn/ui primitives
│   │   ├── hooks/
│   │   │   └── use-websocket.ts # WebSocket client → React Query cache
│   │   ├── pages/
│   │   │   └── MapPage.tsx      # Main page layout
│   │   └── App.tsx              # Router + layout
│   └── index.html
├── server/
│   ├── routes.ts             # API endpoints + WebSocket + bus simulation
│   ├── storage.ts            # Database access layer (Drizzle)
│   ├── db.ts                 # PostgreSQL connection
│   ├── seed.ts               # Seed data (routes, stops, buses, traffic)
│   ├── index-dev.ts          # Dev server entry
│   └── index-prod.ts         # Production server entry
├── shared/
│   └── schema.ts             # Drizzle schema + Zod validation (shared)
├── drizzle.config.ts
├── vite.config.ts
└── package.json
```

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** 14+

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sandip-1-1/YatraNepal.git
   cd YatraNepal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the database**

   Create a `.env` file in the project root:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/yatraNepal
   ```

4. **Push the database schema**
   ```bash
   npm run db:push
   ```

5. **Seed the database**
   ```bash
   npx tsx server/seed.ts
   ```
   This creates 3 routes in Kathmandu Valley with 15 stops, 9 vehicles, and 4 traffic points. Route geometry is fetched from OSRM at seed time.

6. **Start the dev server**
   ```bash
   npm run dev
   ```
   Opens on `http://localhost:5000`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Vite + Express) |
| `npm run build` | Build for production (Vite + esbuild) |
| `npm start` | Start production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push Drizzle schema to PostgreSQL |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/routes` | All routes |
| GET | `/api/routes/:id/geometry` | Road geometry for a route |
| GET | `/api/stops` | All stops |
| GET | `/api/stops/route/:routeId` | Stops for a specific route |
| GET | `/api/buses` | All buses |
| GET | `/api/buses/route/:routeId` | Buses on a specific route |
| GET | `/api/traffic` | Traffic congestion data |
| GET | `/api/notifications` | User notifications |
| POST | `/api/notifications` | Create a notification |
| PATCH | `/api/notifications/:id/read` | Mark notification as read |
| GET | `/api/user` | Current user profile |
| PATCH | `/api/user/preferred-route` | Update preferred route |

### WebSocket

Connect to `ws://localhost:5000/ws` to receive real-time updates:

- `bus_update` — Array of all bus positions (every 3 seconds)
- `eta_update` — ETAs for all buses to their upcoming stops
- `notification` — Proximity alerts when a bus is near a stop

## Routes

The seed data includes 3 routes in Kathmandu Valley:

| Route | Stops | Vehicles |
|-------|-------|----------|
| Ring Road Express | 5 stops (Kalanki → Koteshwor) | 3 buses/minibuses |
| Kathmandu - Bhaktapur | 5 stops (Ratna Park → Bhaktapur) | 3 buses/minibuses |
| Lagankhel - Budhanilkantha | 5 stops (Lagankhel → Budhanilkantha) | 3 buses/minibuses |

## License

MIT
