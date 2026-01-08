import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { seed, reset } from "drizzle-seed";
import ws from "ws";
import { battle, player, stage } from "../src/lib/server/db/schema/public";

neonConfig.webSocketConstructor = ws;

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: bun scripts/db-seed.ts <user-id>");
  console.error("Sign up in the app first, then pass your user ID.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

await reset(db, { battle, player, stage });

await seed(db, { battle, player, stage }).refine((f) => ({
  battle: {
    count: 5,
    columns: {
      id: f.string({ isUnique: true }),
      creatorId: f.default({ defaultValue: userId }),
      name: f.loremIpsum({ sentencesCount: 1 }),
      status: f.default({ defaultValue: "draft" }),
      visibility: f.default({ defaultValue: "public" }),
      authoritativeTimezone: f.default({ defaultValue: "America/New_York" }),
    },
  },
  player: {
    count: 5,
    columns: {
      id: f.string({ isUnique: true }),
      userId: f.default({ defaultValue: userId }),
    },
  },
  stage: {
    count: 10,
    columns: {
      id: f.string({ isUnique: true }),
      vibe: f.loremIpsum({ sentencesCount: 1 }),
      phase: f.default({ defaultValue: "upcoming" }),
    },
  },
}));

await pool.end();

console.log("Database seeded for user:", userId);
