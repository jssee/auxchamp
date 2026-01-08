import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { reset } from "drizzle-seed";
import ws from "ws";
import * as schema from "../src/lib/server/db/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

await reset(db, schema);
await pool.end();

console.log("Database reset.");
