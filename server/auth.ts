import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage.ts";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [hashed, salt] = hash.split(".");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(buf, Buffer.from(hashed, "hex"));
}

declare global {
  namespace Express {
    interface User {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      username: string;
      password: string;
      userType: string;
      isVerified: boolean;
      preferredRouteId: string | null;
      notificationsEnabled: boolean;
      createdAt: Date;
    }
  }
}

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) return done(null, false, { message: "Invalid username" });
      const valid = await verifyPassword(password, user.password);
      if (!valid) return done(null, false, { message: "Invalid password" });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }),
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user || null);
  } catch (err) {
    done(err);
  }
});

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
}

export function stripPassword(user: User) {
  const { password: _, ...safe } = user;
  return safe;
}
