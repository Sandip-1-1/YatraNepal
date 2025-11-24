import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "../shared/schema";
import * as dotenv from "dotenv";

dotenv.config(); // load .env

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in .env");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

export const db = drizzle(client, { schema });
