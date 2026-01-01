import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";
import { env } from "$env/dynamic/private";

// Configure WebSocket for Node.js environments
neonConfig.webSocketConstructor = ws;

if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle({ client: pool, schema });
