import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage.ts";
import { insertNotificationSchema } from "@shared/schema";
import type { Bus, Stop, Traffic } from "@shared/schema";

// --- ETA types ---
export interface StopEta {
  stopId: string;
  stopName: string;
  etaMinutes: number;
}
export interface BusEtaResult {
  busId: string;
  etas: StopEta[];
}

// Haversine formula to calculate distance between two lat/lon points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Traffic congestion multipliers
const TRAFFIC_FACTORS: Record<string, number> = {
  light: 1.0,
  medium: 1.2,
  heavy: 1.5,
};
const TRAFFIC_RADIUS_KM = 0.5; // Consider traffic within 500m of the path
const DWELL_TIME_MINUTES = 0.5; // Time spent at each intermediate stop

/**
 * Returns the max traffic factor affecting the straight-line path from
 * (lat1,lon1) to (lat2,lon2). Checks every traffic point — if it's within
 * TRAFFIC_RADIUS_KM of either endpoint, its factor applies.
 */
function getTrafficFactor(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  trafficPoints: Traffic[],
): number {
  let maxFactor = 1.0;
  for (const t of trafficPoints) {
    const tLat = parseFloat(t.latitude);
    const tLon = parseFloat(t.longitude);
    const distToStart = calculateDistance(lat1, lon1, tLat, tLon);
    const distToEnd = calculateDistance(lat2, lon2, tLat, tLon);
    if (distToStart < TRAFFIC_RADIUS_KM || distToEnd < TRAFFIC_RADIUS_KM) {
      const factor = TRAFFIC_FACTORS[t.congestionLevel] ?? 1.0;
      if (factor > maxFactor) maxFactor = factor;
    }
  }
  return maxFactor;
}

/**
 * Compute ETAs from a bus's current position to every upcoming stop on its route.
 *
 * Formula per segment:
 *   d = haversine(busOrPrevStop, nextStop)
 *   base_eta = (d / speed) * 60          (minutes)
 *   eta = base_eta * traffic_factor + dwell_time_per_intermediate_stop
 *
 * Cumulative ETA is the sum across segments.
 */
function computeEtasForBus(
  bus: Bus,
  routeStops: Stop[],
  trafficPoints: Traffic[],
): StopEta[] {
  const speed = bus.speed > 0 ? bus.speed : 15; // fallback 15 km/h when stopped
  const currentIdx = bus.currentStopIndex;
  let curLat = parseFloat(bus.currentLatitude);
  let curLon = parseFloat(bus.currentLongitude);
  let cumulativeMinutes = 0;
  const etas: StopEta[] = [];

  // Walk from the next stop onward
  for (let i = currentIdx + 1; i < routeStops.length; i++) {
    const stop = routeStops[i];
    const stopLat = parseFloat(stop.latitude);
    const stopLon = parseFloat(stop.longitude);

    const d = calculateDistance(curLat, curLon, stopLat, stopLon);
    const baseMinutes = (d / speed) * 60;
    const trafficFactor = getTrafficFactor(curLat, curLon, stopLat, stopLon, trafficPoints);
    cumulativeMinutes += baseMinutes * trafficFactor;

    // Add dwell time for intermediate stops (not the first upcoming one)
    if (i > currentIdx + 1) {
      cumulativeMinutes += DWELL_TIME_MINUTES;
    }

    etas.push({
      stopId: stop.id,
      stopName: stop.name,
      etaMinutes: Math.round(cumulativeMinutes * 10) / 10, // 1 decimal
    });

    curLat = stopLat;
    curLon = stopLon;
  }

  return etas;
}

/** Compute ETAs for all active buses at once. */
async function computeAllEtas(): Promise<BusEtaResult[]> {
  const [buses, stops, trafficPoints] = await Promise.all([
    storage.getBuses(),
    storage.getStops(),
    storage.getTraffic(),
  ]);

  const results: BusEtaResult[] = [];
  for (const bus of buses) {
    const routeStops = stops
      .filter((s) => s.routeId === bus.routeId)
      .sort((a, b) => a.sequence - b.sequence);
    if (routeStops.length === 0) continue;

    results.push({
      busId: bus.id,
      etas: computeEtasForBus(bus, routeStops, trafficPoints),
    });
  }
  return results;
}

// --- WebSocket broadcast ---
let wss: WebSocketServer | null = null;

function broadcast(type: string, data: unknown) {
  if (!wss) return;
  const message = JSON.stringify({ type, data });
  for (const client of Array.from(wss.clients)) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// --- Geometry cache (avoid re-parsing JSON every 3s tick) ---
const geometryCache = new Map<string, [number, number][]>();

// --- Proximity notification tracking (avoid duplicates) ---
// Key format: "busId:stopId" — cleared when bus wraps around route
const proximityNotified = new Set<string>();
const PROXIMITY_RADIUS_KM = 0.2; // 200 meters

async function getGeometryForRoute(routeId: string): Promise<[number, number][] | null> {
  if (geometryCache.has(routeId)) {
    return geometryCache.get(routeId)!;
  }
  const geometry = await storage.getRouteGeometry(routeId);
  if (geometry && geometry.length > 0) {
    geometryCache.set(routeId, geometry);
    return geometry;
  }
  return null;
}

/**
 * Find the stop index closest to a given lat/lon, within a threshold.
 * Returns -1 if no stop is within threshold.
 */
function findNearestStopIndex(
  lat: number,
  lon: number,
  routeStops: Stop[],
  thresholdKm: number = 0.05,
): number {
  for (let i = 0; i < routeStops.length; i++) {
    const d = calculateDistance(
      lat,
      lon,
      parseFloat(routeStops[i].latitude),
      parseFloat(routeStops[i].longitude),
    );
    if (d < thresholdKm) return i;
  }
  return -1;
}

/**
 * Check if bus is approaching upcoming stops (within PROXIMITY_RADIUS_KM)
 * and send "approaching" notifications if not already sent for this bus+stop.
 */
async function checkProximityNotifications(
  bus: Bus,
  lat: number,
  lon: number,
  routeStops: Stop[],
) {
  const user = await storage.getCurrentUser();
  if (!user || user.preferredRouteId !== bus.routeId) return;

  for (let i = bus.currentStopIndex + 1; i < routeStops.length; i++) {
    const stop = routeStops[i];
    const key = `${bus.id}:${stop.id}`;
    if (proximityNotified.has(key)) continue;

    const d = calculateDistance(
      lat,
      lon,
      parseFloat(stop.latitude),
      parseFloat(stop.longitude),
    );

    // Only fire for stops within proximity range but not yet "arrived" (>50m away)
    if (d < PROXIMITY_RADIUS_KM && d > 0.05) {
      proximityNotified.add(key);
      const notification = await storage.createNotification({
        userId: user.id,
        routeId: bus.routeId,
        message: `${bus.busNumber} (${bus.company}) is approaching ${stop.name}`,
        type: "arrival",
        isRead: false,
      });
      broadcast("notification", notification);
    }
  }
}

// Simulate bus movement along route (road-aware when geometry available)
async function simulateBusMovement() {
  const allBuses = await storage.getBuses();
  const allStops = await storage.getStops();

  for (const bus of allBuses) {
    const routeStops = allStops
      .filter((s) => s.routeId === bus.routeId)
      .sort((a, b) => a.sequence - b.sequence);

    if (routeStops.length === 0) continue;

    const geometry = await getGeometryForRoute(bus.routeId);

    if (!geometry || geometry.length < 2) {
      // --- FALLBACK: straight-line interpolation (no geometry) ---
      const currentStopIndex = bus.currentStopIndex;
      const nextStopIndex = (currentStopIndex + 1) % routeStops.length;
      const nextStop = routeStops[nextStopIndex];

      const currentLat = parseFloat(bus.currentLatitude);
      const currentLon = parseFloat(bus.currentLongitude);
      const nextLat = parseFloat(nextStop.latitude);
      const nextLon = parseFloat(nextStop.longitude);

      const distance = calculateDistance(currentLat, currentLon, nextLat, nextLon);

      if (distance < 0.1) {
        await storage.updateBusLocation(
          bus.id,
          nextStop.latitude,
          nextStop.longitude,
          0,
          nextStopIndex,
          0,
        );

        const user = await storage.getCurrentUser();
        if (user && user.preferredRouteId === bus.routeId) {
          const notification = await storage.createNotification({
            userId: user.id,
            routeId: bus.routeId,
            message: `Bus ${bus.busNumber} has arrived at ${nextStop.name}`,
            type: "arrival",
            isRead: false,
          });
          broadcast("notification", notification);
        }
      } else {
        const step = 0.003;
        const ratio = step / distance;
        const newLat = currentLat + (nextLat - currentLat) * ratio;
        const newLon = currentLon + (nextLon - currentLon) * ratio;
        const speed = 20 + Math.floor(Math.random() * 20);

        await checkProximityNotifications(bus, newLat, newLon, routeStops);

        await storage.updateBusLocation(
          bus.id,
          newLat.toFixed(7),
          newLon.toFixed(7),
          speed,
          currentStopIndex,
          0,
        );
      }
      continue;
    }

    // --- ROAD-AWARE: walk along geometry polyline ---
    let segIdx = bus.currentSegmentIndex ?? 0;

    // Advance by 2-3 geometry points per tick (smooth ~25 km/h feel)
    const advancePoints = 2 + Math.floor(Math.random() * 2);
    segIdx = segIdx + advancePoints;

    // Wrap around when reaching the end
    if (segIdx >= geometry.length) {
      segIdx = 0;
      // Clear proximity tracking for this bus since it's restarting the route
      for (const key of Array.from(proximityNotified)) {
        if (key.startsWith(bus.id + ":")) proximityNotified.delete(key);
      }
    }

    const [newLat, newLon] = geometry[segIdx];
    const speed = 20 + Math.floor(Math.random() * 20);

    // Check proximity to upcoming stops for notifications
    await checkProximityNotifications(bus, newLat, newLon, routeStops);

    // Check if we're near a stop — update currentStopIndex if so
    let stopIndex = bus.currentStopIndex;
    const nearStop = findNearestStopIndex(newLat, newLon, routeStops, 0.05);
    if (nearStop !== -1 && nearStop !== stopIndex) {
      stopIndex = nearStop;

      const user = await storage.getCurrentUser();
      if (user && user.preferredRouteId === bus.routeId) {
        const notification = await storage.createNotification({
          userId: user.id,
          routeId: bus.routeId,
          message: `Bus ${bus.busNumber} has arrived at ${routeStops[nearStop].name}`,
          type: "arrival",
          isRead: false,
        });
        broadcast("notification", notification);
      }
    }

    await storage.updateBusLocation(
      bus.id,
      newLat.toFixed(7),
      newLon.toFixed(7),
      speed,
      stopIndex,
      segIdx,
    );
  }

  // Broadcast updated bus positions + ETAs to all WS clients
  const updatedBuses = await storage.getBuses();
  broadcast("bus_update", updatedBuses);

  const etas = await computeAllEtas();
  broadcast("eta_update", etas);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Routes
  app.get("/api/routes", async (_req, res) => {
    try {
      const routes = await storage.getRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch routes" });
    }
  });

  app.get("/api/routes/:id", async (req, res) => {
    try {
      const route = await storage.getRoute(req.params.id);
      if (!route) {
        return res.status(404).json({ error: "Route not found" });
      }
      res.json(route);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch route" });
    }
  });

  // Route geometry (road polyline from OSRM)
  app.get("/api/routes/:id/geometry", async (req, res) => {
    try {
      const geometry = await storage.getRouteGeometry(req.params.id);
      if (!geometry) {
        return res.status(404).json({ error: "Geometry not found for this route" });
      }
      res.json(geometry);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch route geometry" });
    }
  });

  // Stops
  app.get("/api/stops", async (_req, res) => {
    try {
      const stops = await storage.getStops();
      res.json(stops);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stops" });
    }
  });

  app.get("/api/stops/route/:routeId", async (req, res) => {
    try {
      const stops = await storage.getStopsByRoute(req.params.routeId);
      res.json(stops);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stops" });
    }
  });

  // Buses
  app.get("/api/buses", async (_req, res) => {
    try {
      const buses = await storage.getBuses();
      res.json(buses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch buses" });
    }
  });

  app.get("/api/buses/:id", async (req, res) => {
    try {
      const bus = await storage.getBus(req.params.id);
      if (!bus) {
        return res.status(404).json({ error: "Bus not found" });
      }
      res.json(bus);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bus" });
    }
  });

  app.get("/api/buses/route/:routeId", async (req, res) => {
    try {
      const buses = await storage.getBusesByRoute(req.params.routeId);
      res.json(buses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch buses" });
    }
  });

  // Traffic
  app.get("/api/traffic", async (_req, res) => {
    try {
      const traffic = await storage.getTraffic();
      res.json(traffic);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch traffic" });
    }
  });

  // ETA
  app.get("/api/eta/:busId", async (req, res) => {
    try {
      const [bus, stops, trafficPoints] = await Promise.all([
        storage.getBus(req.params.busId),
        storage.getStops(),
        storage.getTraffic(),
      ]);
      if (!bus) {
        return res.status(404).json({ error: "Bus not found" });
      }
      const routeStops = stops
        .filter((s) => s.routeId === bus.routeId)
        .sort((a, b) => a.sequence - b.sequence);

      const etas = computeEtasForBus(bus, routeStops, trafficPoints);
      res.json({ busId: bus.id, etas });
    } catch (error) {
      res.status(500).json({ error: "Failed to compute ETA" });
    }
  });

  // Notifications
  app.get("/api/notifications", async (_req, res) => {
    try {
      const user = await storage.getCurrentUser();
      if (!user) {
        return res.json([]);
      }
      const notifications = await storage.getNotificationsByUser(user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      await storage.deleteNotification(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  app.post("/api/notifications/settings", async (req, res) => {
    try {
      // Mock endpoint for notification settings
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // User
  app.get("/api/user/current", async (_req, res) => {
    try {
      const user = await storage.getCurrentUser();
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Start bus movement simulation (every 3 seconds)
  setInterval(simulateBusMovement, 3000);

  const httpServer = createServer(app);

  // --- WebSocket server with heartbeat ---
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Heartbeat: ping every 30s, terminate unresponsive clients
  const HEARTBEAT_INTERVAL = 30_000;
  const aliveClients = new WeakSet<WebSocket>();

  wss.on("connection", (ws) => {
    aliveClients.add(ws);

    ws.on("pong", () => {
      aliveClients.add(ws);
    });

    ws.on("error", () => {
      // Silently ignore — client will be cleaned up by heartbeat
    });
  });

  const heartbeat = setInterval(() => {
    if (!wss) return;
    for (const ws of Array.from(wss.clients)) {
      if (!aliveClients.has(ws)) {
        ws.terminate();
        continue;
      }
      aliveClients.delete(ws);
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL);

  wss.on("close", () => {
    clearInterval(heartbeat);
  });

  return httpServer;
}
