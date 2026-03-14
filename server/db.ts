import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";
import * as dotenv from "dotenv";

dotenv.config(); // load .env

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in .env");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export { pool };
export const db = drizzle(pool, { schema });
