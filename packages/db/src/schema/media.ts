import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * PDFs sent to the creation assistant (spec 027, RN-18), recorded only so the
 * ones nobody discarded can be deleted after 24 hours. No foreign key to the
 * owner: a row must outlive nothing but its file.
 */
export const sourceUpload = pgTable(
	"source_upload",
	{
		key: text("key").primaryKey(),
		ownerId: text("owner_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	},
	(table) => [index("source_upload_created_idx").on(table.createdAt)],
);
