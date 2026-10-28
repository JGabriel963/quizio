import type { QuizThemeChoice } from "@quizio/core/quiz/domain/quiz";
import { THEME_IDS } from "@quizio/core/shared/domain/theme";
import { z } from "zod";

/** A quiz's theme: one of the catalog, or one of the person's own (spec 042, 043). */
export const themeChoice = z
	.union([
		z.object({
			readyMade: z
				.enum(THEME_IDS)
				.describe("A ready-made theme (see list_themes)."),
		}),
		z.object({
			customThemeId: z.string().describe("One of the person's custom themes."),
		}),
	])
	.describe("The quiz's look in the editor and in games.");

export function toThemeChoice(
	input: z.infer<typeof themeChoice>,
): QuizThemeChoice {
	return "readyMade" in input
		? { kind: "catalog", themeId: input.readyMade }
		: { kind: "custom", customThemeId: input.customThemeId };
}
