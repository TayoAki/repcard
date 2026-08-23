/**
 * Server-only database handle. Import from API routes exclusively - never
 * from screens or components.
 *
 * Driver switch: plain `pg` against localhost (offline-friendly dev),
 * Neon's HTTP driver everywhere else (serverless-safe in production).
 * App code must stick to the surface both drivers share: no db.batch, no
 * db.transaction. Use Promise.all for parallel reads and sequential
 * awaits (FK-ordered) for multi-statement writes.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const isLocal = /localhost|127\.0\.0\.1/.test(url);

export const db = isLocal
  ? drizzlePg({ client: new Pool({ connectionString: url }), schema, casing: "snake_case" })
  : drizzleNeon({ client: neon(url), schema, casing: "snake_case" });

export * from "./schema";
