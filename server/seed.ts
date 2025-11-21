import { db } from "./db";
import { routes, stops, buses, traffic, users } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Create routes
  const [route1] = await db.insert(routes).values({
    name: "Ring Road Express",
    color: "#2563eb", // Blue
    averageTravelTime: 45,
  }).returning();

  const [route2] = await db.insert(routes).values({
    name: "Patan - Bouddha",
    color: "#22c55e", // Green
    averageTravelTime: 35,
  }).returning();

  const [route3] = await db.insert(routes).values({
    name: "Airport - Thamel",
    color: "#f97316", // Orange
    averageTravelTime: 25,
  }).returning();

  console.log("Created routes");

  // Create stops for Ring Road Express
  const ringRoadStops = [
    { name: "Ratna Park", lat: 27.7017, lon: 85.3206 },
    { name: "Kalanki", lat: 27.6954, lon: 85.2801 },
    { name: "Balaju", lat: 27.7311, lon: 85.3006 },
    { name: "Maharajgunj", lat: 27.7358, lon: 85.3301 },
    { name: "Koteshwor", lat: 27.6783, lon: 85.3475 },
  ];

  for (let i = 0; i < ringRoadStops.length; i++) {
    await db.insert(stops).values({
      routeId: route1.id,
      name: ringRoadStops[i].name,
      latitude: ringRoadStops[i].lat.toFixed(7),
      longitude: ringRoadStops[i].lon.toFixed(7),
      sequence: i,
    });
  }

  // Create stops for Patan - Bouddha
  const patanBouddhaStops = [
    { name: "Patan Dhoka", lat: 27.6694, lon: 85.3247 },
    { name: "Lagankhel", lat: 27.6658, lon: 85.3247 },
    { name: "Jawalakhel", lat: 27.6783, lon: 85.3141 },
    { name: "Tripureshwor", lat: 27.6933, lon: 85.3153 },
    { name: "Bouddha", lat: 27.7211, lon: 85.3617 },
  ];

  for (let i = 0; i < patanBouddhaStops.length; i++) {
    await db.insert(stops).values({
      routeId: route2.id,
      name: patanBouddhaStops[i].name,
      latitude: patanBouddhaStops[i].lat.toFixed(7),
      longitude: patanBouddhaStops[i].lon.toFixed(7),
      sequence: i,
    });
  }

  // Create stops for Airport - Thamel
  const airportThamelStops = [
    { name: "Tribhuvan Airport", lat: 27.6966, lon: 85.3591 },
    { name: "Koteshwor Junction", lat: 27.6789, lon: 85.3458 },
    { name: "New Baneshwor", lat: 27.6911, lon: 85.3378 },
    { name: "Durbarmarg", lat: 27.7072, lon: 85.3161 },
    { name: "Thamel", lat: 27.7150, lon: 85.3114 },
  ];

  for (let i = 0; i < airportThamelStops.length; i++) {
    await db.insert(stops).values({
      routeId: route3.id,
      name: airportThamelStops[i].name,
      latitude: airportThamelStops[i].lat.toFixed(7),
      longitude: airportThamelStops[i].lon.toFixed(7),
      sequence: i,
    });
  }

  console.log("Created stops");

  // Create buses for Ring Road Express
  await db.insert(buses).values([
    {
      routeId: route1.id,
      busNumber: "BA-1-5432",
      currentLatitude: ringRoadStops[0].lat.toFixed(7),
      currentLongitude: ringRoadStops[0].lon.toFixed(7),
      speed: 25,
      capacity: 40,
      occupiedSeats: 12,
      currentStopIndex: 0,
      isActive: true,
    },
    {
      routeId: route1.id,
      busNumber: "BA-1-8765",
      currentLatitude: ringRoadStops[2].lat.toFixed(7),
      currentLongitude: ringRoadStops[2].lon.toFixed(7),
      speed: 30,
      capacity: 40,
      occupiedSeats: 8,
      currentStopIndex: 2,
      isActive: true,
    },
  ]);

  // Create buses for Patan - Bouddha
  await db.insert(buses).values([
    {
      routeId: route2.id,
      busNumber: "BA-2-3456",
      currentLatitude: patanBouddhaStops[0].lat.toFixed(7),
      currentLongitude: patanBouddhaStops[0].lon.toFixed(7),
      speed: 20,
      capacity: 35,
      occupiedSeats: 15,
      currentStopIndex: 0,
      isActive: true,
    },
    {
      routeId: route2.id,
      busNumber: "BA-2-7890",
      currentLatitude: patanBouddhaStops[3].lat.toFixed(7),
      currentLongitude: patanBouddhaStops[3].lon.toFixed(7),
      speed: 28,
      capacity: 35,
      occupiedSeats: 10,
      currentStopIndex: 3,
      isActive: true,
    },
    {
      routeId: route2.id,
      busNumber: "BA-2-1122",
      currentLatitude: patanBouddhaStops[1].lat.toFixed(7),
      currentLongitude: patanBouddhaStops[1].lon.toFixed(7),
      speed: 22,
      capacity: 35,
      occupiedSeats: 20,
      currentStopIndex: 1,
      isActive: true,
    },
  ]);

  // Create buses for Airport - Thamel
  await db.insert(buses).values([
    {
      routeId: route3.id,
      busNumber: "BA-3-6789",
      currentLatitude: airportThamelStops[0].lat.toFixed(7),
      currentLongitude: airportThamelStops[0].lon.toFixed(7),
      speed: 35,
      capacity: 30,
      occupiedSeats: 5,
      currentStopIndex: 0,
      isActive: true,
    },
    {
      routeId: route3.id,
      busNumber: "BA-3-2468",
      currentLatitude: airportThamelStops[2].lat.toFixed(7),
      currentLongitude: airportThamelStops[2].lon.toFixed(7),
      speed: 32,
      capacity: 30,
      occupiedSeats: 18,
      currentStopIndex: 2,
      isActive: true,
    },
  ]);

  console.log("Created buses");

  // Create traffic conditions
  await db.insert(traffic).values([
    {
      latitude: "27.7017",
      longitude: "85.3206",
      congestionLevel: "medium",
    },
    {
      latitude: "27.6954",
      longitude: "85.2801",
      congestionLevel: "heavy",
    },
    {
      latitude: "27.7211",
      longitude: "85.3617",
      congestionLevel: "light",
    },
    {
      latitude: "27.6966",
      longitude: "85.3591",
      congestionLevel: "medium",
    },
  ]);

  console.log("Created traffic conditions");

  // Create a demo user
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
