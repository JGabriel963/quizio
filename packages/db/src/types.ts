import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type * as schema from "./schema";

/**
 * Driver-agnostic database handle. Repository adapters accept this type so the
 * same code runs on node-postgres in the app and on PGlite in tests.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
