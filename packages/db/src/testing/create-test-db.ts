import { PGlite } from "@electric-sql/pglite";
import { pushSchema } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "../schema";
import type { Database } from "../types";

export interface TestDatabase {
	db: Database;
	close(): Promise<void>;
}

/**
 * Spins up an in-process Postgres (PGlite, WASM) with the current Drizzle
 * schema pushed. No Docker required; create one per test file and close it in
 * `afterAll`. Use for repository adapter tests.
 */
export async function createTestDb(): Promise<TestDatabase> {
	const client = new PGlite();
	const db = drizzle({ client, schema });

	const { apply } = await pushSchema(schema, db as never);
	await apply();

	return {
		db: db as unknown as Database,
		close: () => client.close(),
	};
}
