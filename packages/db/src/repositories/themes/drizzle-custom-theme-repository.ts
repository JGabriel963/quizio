import type { CustomThemeReads } from "@quizio/core/quiz/application/ports/custom-theme-reads";
import { readThemeLook } from "@quizio/core/shared/domain/theme-look";
import type { CustomThemeRepository } from "@quizio/core/themes/application/ports/custom-theme-repository";
import type { CustomTheme } from "@quizio/core/themes/domain/custom-theme";
import { and, count, desc, eq, inArray } from "drizzle-orm";

import { quiz } from "../../schema/quiz";
import { customTheme, themeUpload } from "../../schema/themes";
import type { Database } from "../../types";

/** Thrown inside a transaction to roll it back when an upload is not pending. */
class UploadMissing extends Error {}

/**
 * The custom themes (spec 043, ADR 0022). Writing one deletes its pending
 * uploads in the same transaction, so of two saves with one upload only the
 * first takes it. Also the quiz's `CustomThemeReads`.
 */
export function createDrizzleCustomThemeRepository(
	db: Database,
): CustomThemeRepository & CustomThemeReads {
	async function writeTaking(
		theme: CustomTheme,
		uploadKeys: readonly string[],
		write: (tx: Database) => Promise<void>,
	): Promise<"ok" | "uploadMissing"> {
		try {
			await db.transaction(async (tx) => {
				if (uploadKeys.length > 0) {
					const taken = await tx
						.delete(themeUpload)
						.where(
							and(
								inArray(themeUpload.key, [...uploadKeys]),
								eq(themeUpload.ownerId, theme.ownerId),
							),
						)
						.returning({ key: themeUpload.key });
					if (taken.length !== new Set(uploadKeys).size) {
						throw new UploadMissing();
					}
				}
				await write(tx as unknown as Database);
			});
			return "ok";
		} catch (error) {
			if (error instanceof UploadMissing) {
				return "uploadMissing";
			}
			throw error;
		}
	}

	return {
		async findById(id) {
			const [row] = await db
				.select()
				.from(customTheme)
				.where(eq(customTheme.id, id))
				.limit(1);
			return row ? toCustomTheme(row) : null;
		},

		async findOwned(ownerId, id) {
			const theme = await this.findById(id);
			return theme && theme.ownerId === ownerId
				? { id: theme.id, look: theme.look }
				: null;
		},

		async listByOwner(ownerId) {
			const usage = db
				.select({
					themeId: quiz.customThemeId,
					quizCount: count().as("quiz_count"),
				})
				.from(quiz)
				.where(eq(quiz.ownerId, ownerId))
				.groupBy(quiz.customThemeId)
				.as("usage");
			const rows = await db
				.select({ theme: customTheme, quizCount: usage.quizCount })
				.from(customTheme)
				.leftJoin(usage, eq(usage.themeId, customTheme.id))
				.where(eq(customTheme.ownerId, ownerId))
				.orderBy(desc(customTheme.createdAt), desc(customTheme.id));
			return rows.flatMap(({ theme, quizCount }) => {
				const read = toCustomTheme(theme);
				return read ? [{ ...read, quizCount: Number(quizCount ?? 0) }] : [];
			});
		},

		createTakingUploads(theme, uploadKeys) {
			return writeTaking(theme, uploadKeys, async (tx) => {
				await tx.insert(customTheme).values(theme);
			});
		},

		updateTakingUploads(theme, uploadKeys) {
			return writeTaking(theme, uploadKeys, async (tx) => {
				await tx
					.update(customTheme)
					.set({
						name: theme.name,
						look: theme.look,
						updatedAt: theme.updatedAt,
					})
					.where(eq(customTheme.id, theme.id));
			});
		},

		async delete(id) {
			// `quiz.custom_theme_id` clears itself (ON DELETE SET NULL, RN-19).
			await db.delete(customTheme).where(eq(customTheme.id, id));
		},
	};
}

/** A row whose look the core no longer reads is left out, never an error. */
function toCustomTheme(
	row: typeof customTheme.$inferSelect,
): CustomTheme | null {
	const look = readThemeLook(row.look);
	return look ? { ...row, look } : null;
}
