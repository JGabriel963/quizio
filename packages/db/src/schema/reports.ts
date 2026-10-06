import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { game } from "./game";

/**
 * What a creator changed in a report (spec 015; ADR 0010). The report itself
 * is read from the game's rows; this holds only what is the report's own, and
 * only once it was renamed or trashed. No row: the game's title, out of the
 * trash.
 */
export const report = pgTable("report", {
	gameId: text("game_id")
		.primaryKey()
		.references(() => game.id, { onDelete: "cascade" }),
	/** Null while the report goes by the game's title (RN-45). */
	name: text("name"),
	trashedAt: timestamp("trashed_at", { withTimezone: true }),
});
