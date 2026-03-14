import { db } from "./db.ts";
import { routes, stops, buses, traffic, users } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Fetch road-snapped geometry from the free OSRM demo server.
 * Returns an array of [lat, lon] pairs following actual roads.
 */
async function fetchRouteGeometry(
  stopsCoords: { lat: number; lon: number }[],
): Promise<[number, number][]> {
  // OSRM expects coordinates as lon,lat (not lat,lon!)
  const coordString = stopsCoords.map((s) => `${s.lon},${s.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  console.log(`  Fetching OSRM geometry for ${stopsCoords.length} waypoints...`);

  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`  OSRM request failed (${response.status}), skipping geometry`);
    return [];
  }

  const data = await response.json();
  if (data.code !== "Ok" || !data.routes?.[0]) {
    console.warn(`  OSRM returned no route, skipping geometry`);
    return [];
  }

  // GeoJSON coordinates are [lon, lat] — flip to [lat, lon] for Leaflet
  const coordinates: [number, number][] =
    data.routes[0].geometry.coordinates.map(
      ([lon, lat]: [number, number]) => [lat, lon] as [number, number],
    );

  console.log(`  Got ${coordinates.length} geometry points`);
  return coordinates;
}

async function seed() {
  console.log("Seeding database...");

  // --------------------------
  // Routes
  // --------------------------
  const [route1] = await db
    .insert(routes)
    .values({
      name: "Ring Road Express",
      color: "#2563eb",
      averageTravelTime: 45,
    })
    .returning();

  const [route2] = await db
    .insert(routes)
    .values({
      name: "Patan - Bouddha",
      color: "#22c55e",
      averageTravelTime: 35,
    })
    .returning();

  const [route3] = await db
    .insert(routes)
    .values({
      name: "Airport - Thamel",
      color: "#f97316",
      averageTravelTime: 25,
    })
    .returning();

  console.log("Created routes");

  // --------------------------
  // Stops
  // --------------------------
  const stopsData: Record<string, { name: string; lat: number; lon: number }[]> = {
    [route1.id]: [
      { name: "Ratna Park", lat: 27.7017, lon: 85.3206 },
      { name: "Kalanki", lat: 27.6954, lon: 85.2801 },
      { name: "Balaju", lat: 27.7311, lon: 85.3006 },
      { name: "Maharajgunj", lat: 27.7358, lon: 85.3301 },
      { name: "Koteshwor", lat: 27.6783, lon: 85.3475 },
    ],
    [route2.id]: [
      { name: "Patan Dhoka", lat: 27.6694, lon: 85.3247 },
      { name: "Lagankhel", lat: 27.6658, lon: 85.3247 },
      { name: "Jawalakhel", lat: 27.6783, lon: 85.3141 },
      { name: "Tripureshwor", lat: 27.6933, lon: 85.3153 },
      { name: "Bouddha", lat: 27.7211, lon: 85.3617 },
    ],
    [route3.id]: [
      { name: "Tribhuvan Airport", lat: 27.6966, lon: 85.3591 },
      { name: "Koteshwor Junction", lat: 27.6789, lon: 85.3458 },
      { name: "New Baneshwor", lat: 27.6911, lon: 85.3378 },
      { name: "Durbarmarg", lat: 27.7072, lon: 85.3161 },
      { name: "Thamel", lat: 27.715, lon: 85.3114 },
    ],
  };

  for (const [routeId, stopsArray] of Object.entries(stopsData)) {
    for (let i = 0; i < stopsArray.length; i++) {
      await db.insert(stops).values({
        routeId,
        name: stopsArray[i].name,
        latitude: String(stopsArray[i].lat),
        longitude: String(stopsArray[i].lon),
        sequence: i,
      });
    }
  }

  console.log("Created stops");

  // --------------------------
  // Road geometry from OSRM
  // --------------------------
  console.log("Fetching road geometry from OSRM...");
  for (const [routeId, stopsArray] of Object.entries(stopsData)) {
    const geometry = await fetchRouteGeometry(stopsArray);
    if (geometry.length > 0) {
      await db
        .update(routes)
        .set({ geometry: JSON.stringify(geometry) })
        .where(eq(routes.id, routeId));
      console.log(`  Stored geometry for route ${routeId} (${geometry.length} points)`);
    }
    // Small delay to respect OSRM demo server rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log("Road geometry complete");

  // --------------------------
  // Buses
  // --------------------------
  const busesData = [
    // Ring Road Express - route1
    {
      routeId: route1.id,
      busNumber: "BA-1-001",
      vehicleType: "bus",
      company: "Sajha Yatayat",
    },
    {
      routeId: route1.id,
      busNumber: "BA-1-002",
      vehicleType: "bus",
      company: "Mahanagar Yatayat",
    },
    {
      routeId: route1.id,
      busNumber: "BA-1-003",
      vehicleType: "minibus",
      company: "Nepal Yatayat",
    },

    // Patan - Bouddha - route2
    {
      routeId: route2.id,
      busNumber: "BA-2-001",
      vehicleType: "bus",
      company: "Sajha Yatayat",
    },
    {
      routeId: route2.id,
      busNumber: "BA-2-002",
      vehicleType: "minibus",
      company: "Bagmati Yatayat",
    },
    {
      routeId: route2.id,
      busNumber: "BA-2-003",
      vehicleType: "minibus",
      company: "Bagmati Yatayat",
    },

    // Airport - Thamel - route3
    {
      routeId: route3.id,
      busNumber: "BA-3-001",
      vehicleType: "bus",
      company: "Mahanagar Yatayat",
    },
    {
      routeId: route3.id,
      busNumber: "BA-3-002",
      vehicleType: "bus",
      company: "Sajha Yatayat",
    },
    {
      routeId: route3.id,
      busNumber: "BA-3-003",
      vehicleType: "minibus",
      company: "Nepal Yatayat",
    },
  ];

  for (const bus of busesData) {
    const stopsArray = stopsData[bus.routeId];
    await db.insert(buses).values({
      ...bus,
      currentLatitude: String(stopsArray[0].lat),
      currentLongitude: String(stopsArray[0].lon),
      speed: 25,
      currentStopIndex: 0,
      isActive: true,
    });
  }

  console.log("Created buses (9 total: 5 buses + 4 minibuses across 4 companies)");

  // --------------------------
  // Traffic
  // --------------------------
  const trafficData = [
    { latitude: "27.7017", longitude: "85.3206", congestionLevel: "medium" },
    { latitude: "27.6954", longitude: "85.2801", congestionLevel: "heavy" },
    { latitude: "27.7211", longitude: "85.3617", congestionLevel: "light" },
    { latitude: "27.6966", longitude: "85.3591", congestionLevel: "medium" },
  ];

  await db.insert(traffic).values(trafficData);

  console.log("Created traffic conditions");

  // --------------------------
  // Demo user
  // --------------------------
  await db.insert(users).values({
    name: "Demo User",
    email: "demo@nepaltransit.com",
    phone: "+977-9876543210",
    preferredRouteId: route1.id,
    notificationsEnabled: true,
  });

  console.log("Created demo user");
  console.log("Seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
