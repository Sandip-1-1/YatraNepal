import {
  users,
  routes,
  stops,
  buses,
  traffic,
  notifications,
  type User,
  type InsertUser,
  type Route,
  type InsertRoute,
  type Stop,
  type InsertStop,
  type Bus,
  type InsertBus,
  type Traffic,
  type InsertTraffic,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db.ts";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getCurrentUser(): Promise<User | null>;

  // Routes
  getRoutes(): Promise<Route[]>;
  getRoute(id: string): Promise<Route | undefined>;
  getRouteGeometry(routeId: string): Promise<[number, number][] | null>;
  createRoute(route: InsertRoute): Promise<Route>;

  // Stops
  getStops(): Promise<Stop[]>;
  getStopsByRoute(routeId: string): Promise<Stop[]>;
  createStop(stop: InsertStop): Promise<Stop>;

  // Buses
  getBuses(): Promise<Bus[]>;
  getBus(id: string): Promise<Bus | undefined>;
  getBusesByRoute(routeId: string): Promise<Bus[]>;
  createBus(bus: InsertBus): Promise<Bus>;
  updateBusLocation(
    id: string,
    latitude: string,
    longitude: string,
    speed: number,
    currentStopIndex: number,
    currentSegmentIndex: number,
  ): Promise<Bus>;

  // Traffic
  getTraffic(): Promise<Traffic[]>;
  createTraffic(traffic: InsertTraffic): Promise<Traffic>;

  // Notifications
  getNotifications(): Promise<Notification[]>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  deleteNotification(id: string): Promise<void>;
  markNotificationAsRead(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getCurrentUser(): Promise<User | null> {
    // For prototype, return the first user or create a default one
    const [user] = await db.select().from(users).limit(1);
    if (user) return user;

    // Create a default user
    return await this.createUser({
      name: "Demo User",
      email: "demo@nepaltransit.com",
      phone: "+977-9876543210",
      notificationsEnabled: true,
    });
  }

  // Routes
  async getRoutes(): Promise<Route[]> {
    return await db.select().from(routes);
  }

  async getRoute(id: string): Promise<Route | undefined> {
    const [route] = await db.select().from(routes).where(eq(routes.id, id));
    return route || undefined;
  }

  async getRouteGeometry(routeId: string): Promise<[number, number][] | null> {
    const [route] = await db
      .select({ geometry: routes.geometry })
      .from(routes)
      .where(eq(routes.id, routeId));
    if (!route?.geometry) return null;
    try {
      return JSON.parse(route.geometry) as [number, number][];
    } catch {
      return null;
    }
  }

  async createRoute(route: InsertRoute): Promise<Route> {
    const [newRoute] = await db.insert(routes).values(route).returning();
    return newRoute;
  }

  // Stops
  async getStops(): Promise<Stop[]> {
    return await db.select().from(stops);
  }

  async getStopsByRoute(routeId: string): Promise<Stop[]> {
    return await db.select().from(stops).where(eq(stops.routeId, routeId));
  }

  async createStop(stop: InsertStop): Promise<Stop> {
    const [newStop] = await db.insert(stops).values(stop).returning();
    return newStop;
  }

  // Buses
  async getBuses(): Promise<Bus[]> {
    return await db.select().from(buses).where(eq(buses.isActive, true));
  }

  async getBus(id: string): Promise<Bus | undefined> {
    const [bus] = await db.select().from(buses).where(eq(buses.id, id));
    return bus || undefined;
  }

  async getBusesByRoute(routeId: string): Promise<Bus[]> {
    return await db
      .select()
      .from(buses)
      .where(and(eq(buses.routeId, routeId), eq(buses.isActive, true)));
  }

  async createBus(bus: InsertBus): Promise<Bus> {
    const [newBus] = await db.insert(buses).values(bus).returning();
    return newBus;
  }

  async updateBusLocation(
    id: string,
    latitude: string,
    longitude: string,
    speed: number,
    currentStopIndex: number,
    currentSegmentIndex: number,
  ): Promise<Bus> {
    const [updatedBus] = await db
      .update(buses)
      .set({
        currentLatitude: latitude,
        currentLongitude: longitude,
        speed,
        currentStopIndex,
        currentSegmentIndex,
        lastUpdated: new Date(),
      })
      .where(eq(buses.id, id))
      .returning();
    return updatedBus;
  }

  // Traffic
  async getTraffic(): Promise<Traffic[]> {
    return await db.select().from(traffic);
  }

  async createTraffic(trafficData: InsertTraffic): Promise<Traffic> {
    const [newTraffic] = await db
      .insert(traffic)
      .values(trafficData)
      .returning();
    return newTraffic;
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications);
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));
  }

  async createNotification(
    notification: InsertNotification,
  ): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }
}

export const storage = new DatabaseStorage();
