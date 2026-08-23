/**
 * Server-only database handle. Import from API routes exclusively - never
 * from screens or components.
 *
 * Both drivers speak the full Postgres protocol and support TRANSACTIONS:
 * plain `pg` against localhost (offline-friendly dev) and Neon's WebSocket
 * Pool everywhere else (serverless-safe; `ws` polyfills WebSocket on Node
 * runtimes that lack it). Multi-statement writes MUST use db.transaction.
 * The one remaining restriction: no db.batch - it's a Neon-HTTP-only API.
 *
 * The neon-serverless instance is cast to the node-postgres type: both are
 * pg-protocol Drizzle sessions with identical query/transaction surfaces,
 * and a single static type keeps app code driver-agnostic.
 */
import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import ws from "ws";

import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const isLocal = /localhost|127\.0\.0\.1/.test(url);

if (!isLocal && typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}

/**
 * The handle is cached on globalThis: the Expo dev server re-evaluates route
 * modules per request, and a fresh Pool per request exhausts Postgres
 * connections. In production module state persists and this is a no-op.
 */
const globalCache = globalThis as { __repcardDb?: NodePgDatabase<typeof schema> };

export const db: NodePgDatabase<typeof schema> = (globalCache.__repcardDb ??= isLocal
  ? drizzlePg({ client: new Pool({ connectionString: url }), schema, casing: "snake_case" })
  : (drizzleNeon({
      client: new NeonPool({ connectionString: url }),
      schema,
      casing: "snake_case",
    }) as unknown as NodePgDatabase<typeof schema>));

export * from "./schema";
