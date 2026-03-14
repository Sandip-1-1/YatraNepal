import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Routes table - defines bus routes with their basic info
export const routes = pgTable("routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: text("color").notNull(),
  averageTravelTime: integer("average_travel_time").notNull(),
  baseFare: integer("base_fare").notNull().default(30), // in NPR
  geometry: text("geometry"),
});

// Stops table - bus stops along routes
export const stops = pgTable("stops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull().references(() => routes.id),
  name: text("name").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  sequence: integer("sequence").notNull(),
});

// Buses table - individual buses operating on routes
export const buses = pgTable("buses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull().references(() => routes.id),
  busNumber: text("bus_number").notNull(),
  vehicleType: text("vehicle_type").notNull().default("bus"),
  company: text("company").notNull().default("Nepal Yatayat"),
  currentLatitude: decimal("current_latitude", { precision: 10, scale: 7 }).notNull(),
  currentLongitude: decimal("current_longitude", { precision: 10, scale: 7 }).notNull(),
  speed: integer("speed").notNull().default(0),
  currentStopIndex: integer("current_stop_index").notNull().default(0),
  currentSegmentIndex: integer("current_segment_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Traffic conditions at different locations
export const traffic = pgTable("traffic", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  congestionLevel: text("congestion_level").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  userType: text("user_type").notNull().default("regular"), // "regular" | "student" | "senior"
  isVerified: boolean("is_verified").notNull().default(false),
  preferredRouteId: varchar("preferred_route_id").references(() => routes.id),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  routeId: varchar("route_id").notNull().references(() => routes.id),
  message: text("message").notNull(),
  type: text("type").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Route history - tracks which routes a user views frequently
export const routeHistory = pgTable("route_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  routeId: varchar("route_id").notNull().references(() => routes.id),
  viewCount: integer("view_count").notNull().default(1),
  lastViewedAt: timestamp("last_viewed_at").notNull().defaultNow(),
});

// Relations
export const routesRelations = relations(routes, ({ many }) => ({
  stops: many(stops),
  buses: many(buses),
  notifications: many(notifications),
}));

export const stopsRelations = relations(stops, ({ one }) => ({
  route: one(routes, {
    fields: [stops.routeId],
    references: [routes.id],
  }),
}));

export const busesRelations = relations(buses, ({ one }) => ({
  route: one(routes, {
    fields: [buses.routeId],
    references: [routes.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  preferredRoute: one(routes, {
    fields: [users.preferredRouteId],
    references: [routes.id],
  }),
  notifications: many(notifications),
  routeHistory: many(routeHistory),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  route: one(routes, {
    fields: [notifications.routeId],
    references: [routes.id],
  }),
}));

export const routeHistoryRelations = relations(routeHistory, ({ one }) => ({
  user: one(users, {
    fields: [routeHistory.userId],
    references: [users.id],
  }),
  route: one(routes, {
    fields: [routeHistory.routeId],
    references: [routes.id],
  }),
}));

// Insert schemas
export const insertRouteSchema = createInsertSchema(routes).omit({ id: true });
export const insertStopSchema = createInsertSchema(stops).omit({ id: true });
export const insertBusSchema = createInsertSchema(buses).omit({ id: true, lastUpdated: true });
export const insertTrafficSchema = createInsertSchema(traffic).omit({ id: true, timestamp: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertRouteHistorySchema = createInsertSchema(routeHistory).omit({ id: true, lastViewedAt: true });

// Auth validation schemas
export const registerUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  userType: z.enum(["regular", "student", "senior"]).default("regular"),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Types
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Stop = typeof stops.$inferSelect;
export type InsertStop = z.infer<typeof insertStopSchema>;
export type Bus = typeof buses.$inferSelect;
export type InsertBus = z.infer<typeof insertBusSchema>;
export type Traffic = typeof traffic.$inferSelect;
export type InsertTraffic = z.infer<typeof insertTrafficSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type RouteHistory = typeof routeHistory.$inferSelect;
export type InsertRouteHistory = z.infer<typeof insertRouteHistorySchema>;
export type SafeUser = Omit<User, "password">;
