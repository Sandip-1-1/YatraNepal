import { db } from "./db.ts";
import { routes, stops, buses, traffic, users } from "@shared/schema";

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
  const stopsData = {
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
        latitude: stopsArray[i].lat,
        longitude: stopsArray[i].lon,
        sequence: i,
      });
    }
  }

  console.log("Created stops");

  // --------------------------
  // Buses
  // --------------------------
  const busesData = [
    // Ring Road Express - route1
    {
      routeId: route1.id,
      busNumber: "BA-1-001",
      occupiedSeats: 0,
      capacity: 40,
    },
    {
      routeId: route1.id,
      busNumber: "BA-1-002",
      occupiedSeats: 20,
      capacity: 40,
    },
    {
      routeId: route1.id,
      busNumber: "BA-1-003",
      occupiedSeats: 40,
      capacity: 40,
    },

    // Patan - Bouddha - route2
    {
      routeId: route2.id,
      busNumber: "BA-2-001",
      occupiedSeats: 5,
      capacity: 35,
    },
    {
      routeId: route2.id,
      busNumber: "BA-2-002",
      occupiedSeats: 17,
      capacity: 35,
    },
    {
      routeId: route2.id,
      busNumber: "BA-2-003",
      occupiedSeats: 35,
      capacity: 35,
    },

    // Airport - Thamel - route3
    {
      routeId: route3.id,
      busNumber: "BA-3-001",
      occupiedSeats: 2,
      capacity: 30,
    },
    {
      routeId: route3.id,
      busNumber: "BA-3-002",
      occupiedSeats: 15,
      capacity: 30,
    },
    {
      routeId: route3.id,
      busNumber: "BA-3-003",
      occupiedSeats: 30,
      capacity: 30,
    },
  ];

  for (const bus of busesData) {
    const stopsArray = stopsData[bus.routeId];
    await db.insert(buses).values({
      ...bus,
      currentLatitude: stopsArray[0].lat,
      currentLongitude: stopsArray[0].lon,
      speed: 25,
      currentStopIndex: 0,
      isActive: true,
    });
  }

  console.log("Created buses");

  // --------------------------
  // Traffic
  // --------------------------
  const trafficData = [
    { latitude: 27.7017, longitude: 85.3206, congestionLevel: "medium" },
    { latitude: 27.6954, longitude: 85.2801, congestionLevel: "heavy" },
    { latitude: 27.7211, longitude: 85.3617, congestionLevel: "light" },
    { latitude: 27.6966, longitude: 85.3591, congestionLevel: "medium" },
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
