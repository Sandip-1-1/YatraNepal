import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.ts";
import { insertBookingSchema, insertNotificationSchema } from "@shared/schema";

// Haversine formula to calculate distance between two lat/lon points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Simulate bus movement along route
async function simulateBusMovement() {
  const buses = await storage.getBuses();
  const stops = await storage.getStops();

  for (const bus of buses) {
    const routeStops = stops
      .filter(s => s.routeId === bus.routeId)
      .sort((a, b) => a.sequence - b.sequence);

    if (routeStops.length === 0) continue;

    const currentStopIndex = bus.currentStopIndex;
    const nextStopIndex = (currentStopIndex + 1) % routeStops.length;
    const currentStop = routeStops[currentStopIndex];
    const nextStop = routeStops[nextStopIndex];

    // Calculate current position
    const currentLat = parseFloat(bus.currentLatitude);
    const currentLon = parseFloat(bus.currentLongitude);
    const nextLat = parseFloat(nextStop.latitude);
    const nextLon = parseFloat(nextStop.longitude);

    // Move bus towards next stop (small increments)
    const distance = calculateDistance(currentLat, currentLon, nextLat, nextLon);

    if (distance < 0.1) {
      // Reached next stop
      await storage.updateBusLocation(
        bus.id,
        nextStop.latitude,
        nextStop.longitude,
        0,
        nextStopIndex
      );

      // Create arrival notification
      const user = await storage.getCurrentUser();
      if (user && user.preferredRouteId === bus.routeId) {
        await storage.createNotification({
          userId: user.id,
          routeId: bus.routeId,
          message: `Bus ${bus.busNumber} has arrived at ${nextStop.name}`,
          type: 'arrival',
          isRead: false,
        });
      }
    } else {
      // Move towards next stop
      const step = 0.003; // Small movement step
      const ratio = step / distance;
      const newLat = currentLat + (nextLat - currentLat) * ratio;
      const newLon = currentLon + (nextLon - currentLon) * ratio;
      const speed = 20 + Math.floor(Math.random() * 20); // 20-40 km/h

      await storage.updateBusLocation(
        bus.id,
        newLat.toFixed(7),
        newLon.toFixed(7),
        speed,
        currentStopIndex
      );
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Routes
  app.get('/api/routes', async (_req, res) => {
    try {
      const routes = await storage.getRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch routes' });
    }
  });

  app.get('/api/routes/:id', async (req, res) => {
    try {
      const route = await storage.getRoute(req.params.id);
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }
      res.json(route);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch route' });
    }
  });

  // Stops
  app.get('/api/stops', async (_req, res) => {
    try {
      const stops = await storage.getStops();
      res.json(stops);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stops' });
    }
  });

  app.get('/api/stops/route/:routeId', async (req, res) => {
    try {
      const stops = await storage.getStopsByRoute(req.params.routeId);
      res.json(stops);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stops' });
    }
  });

  // Buses
  app.get('/api/buses', async (_req, res) => {
    try {
      const buses = await storage.getBuses();
      res.json(buses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch buses' });
    }
  });

  app.get('/api/buses/:id', async (req, res) => {
    try {
      const bus = await storage.getBus(req.params.id);
      if (!bus) {
        return res.status(404).json({ error: 'Bus not found' });
      }
      res.json(bus);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bus' });
    }
  });

  app.get('/api/buses/route/:routeId', async (req, res) => {
    try {
      const buses = await storage.getBusesByRoute(req.params.routeId);
      res.json(buses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch buses' });
    }
  });

  // Bookings
  app.get('/api/bookings', async (_req, res) => {
    try {
      const user = await storage.getCurrentUser();
      if (!user) {
        return res.json([]);
      }
      const bookings = await storage.getBookingsByUser(user.id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  app.get('/api/bookings/bus/:busId', async (req, res) => {
    try {
      const bookings = await storage.getBookingsByBus(req.params.busId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bus bookings' });
    }
  });

  app.post('/api/bookings', async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      
      // Validate required fields
      if (!validatedData.userId || !validatedData.busId) {
        return res.status(400).json({ error: 'Missing required booking information' });
      }

      // Check bus capacity
      const bus = await storage.getBus(validatedData.busId);
      if (!bus) {
        return res.status(404).json({ error: 'Bus not found' });
      }
      
      if (bus.occupiedSeats >= bus.capacity) {
        return res.status(400).json({ error: 'Bus is at full capacity' });
      }
      
      // Get stop sequences to check for overlapping segments
      const allStops = await storage.getStops();
      const fromStop = allStops.find(s => s.id === validatedData.fromStopId);
      const toStop = allStops.find(s => s.id === validatedData.toStopId);

      if (!fromStop || !toStop) {
        return res.status(400).json({ error: 'Invalid stop selection' });
      }

      // Validate direction: passengers can only travel forward through stops
      if (fromStop.sequence >= toStop.sequence) {
        return res.status(400).json({ error: 'Invalid journey: destination stop must come after boarding stop' });
      }

      // Server-side validation: check if seat is already booked for overlapping segments
      const existingBookings = await storage.getBookingsByBus(validatedData.busId);
      
      const hasConflict = existingBookings.some(booking => {
        // Check if same date and seat (timezone-agnostic date comparison)
        const bookingDate = new Date(booking.travelDate).toISOString().split('T')[0];
        const newBookingDate = new Date(validatedData.travelDate).toISOString().split('T')[0];
        
        if (booking.seatNumber !== validatedData.seatNumber || bookingDate !== newBookingDate) {
          return false;
        }

        // Get existing booking's stop sequences
        const existingFromStop = allStops.find(s => s.id === booking.fromStopId);
        const existingToStop = allStops.find(s => s.id === booking.toStopId);

        if (!existingFromStop || !existingToStop) return false;

        // Both segments go forward (fromSequence < toSequence)
        // Treat segments as half-open intervals [start, end) where end is exclusive
        // This allows consecutive trips: [A,B) and [B,C) don't conflict
        // A passenger boards at 'from' and gets off before 'to' departs
        const newStart = fromStop.sequence;
        const newEnd = toStop.sequence;
        const existingStart = existingFromStop.sequence;
        const existingEnd = existingToStop.sequence;

        // Segments overlap if they share occupied stops (half-open intervals)
        // [2,5) and [4,7) overlap at stops 4,5,6 ✓
        // [2,5) and [5,8) don't overlap (consecutive) ✓
        return newStart < existingEnd && existingStart < newEnd;
      });

      if (hasConflict) {
        return res.status(400).json({ 
          error: 'This seat is already booked for an overlapping segment on the selected date' 
        });
      }

      const booking = await storage.createBooking(validatedData);
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Invalid booking data' });
    }
  });

  // Traffic
  app.get('/api/traffic', async (_req, res) => {
    try {
      const traffic = await storage.getTraffic();
      res.json(traffic);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch traffic' });
    }
  });

  // Notifications
  app.get('/api/notifications', async (_req, res) => {
    try {
      const user = await storage.getCurrentUser();
      if (!user) {
        return res.json([]);
      }
      const notifications = await storage.getNotificationsByUser(user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      await storage.deleteNotification(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  app.post('/api/notifications/settings', async (req, res) => {
    try {
      // Mock endpoint for notification settings
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // User
  app.get('/api/user/current', async (_req, res) => {
    try {
      const user = await storage.getCurrentUser();
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Start bus movement simulation (every 3 seconds)
  setInterval(simulateBusMovement, 3000);

  const httpServer = createServer(app);
  return httpServer;
}
