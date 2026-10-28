import type { ThemeFileUsage } from "@quizio/core/themes/application/ports/theme-file-usage";
import { inArray, or, sql } from "drizzle-orm";

import { game } from "../../schema/game";
import type { Database } from "../../types";

/**
 * The theme files games copied (spec 043, RN-28): a look's image and logo
 * keys, read from `game.custom_theme`, whose shape is the core's `ThemeLook`.
 */
export function createDrizzleThemeFileUsage(db: Database): ThemeFileUsage {
	return {
		async inUse(keys) {
			if (keys.length === 0) {
				return new Set();
			}
			const imageKey = sql<
				string | null
			>`${game.customTheme}->'background'->>'key'`;
			const logoKey = sql<string | null>`${game.customTheme}->>'logoKey'`;
			const rows = await db
				.select({ imageKey, logoKey })
				.from(game)
				.where(or(inArray(imageKey, [...keys]), inArray(logoKey, [...keys])));
			const asked = new Set(keys);
			return new Set(
				rows
					.flatMap((row) => [row.imageKey, row.logoKey])
					.filter((key): key is string => key !== null && asked.has(key)),
			);
		},
	};
}
