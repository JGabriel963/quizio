import {
	THEME_IDS,
	ThemeNotFoundError,
} from "@quizio/core/shared/domain/theme";
import { BACKGROUND_PATTERN_IDS } from "@quizio/core/shared/domain/theme-look";
import type { ThemeLookInput } from "@quizio/core/themes/domain/custom-theme";
import { z } from "zod";

import { defineTool, type ToolContext } from "../define-tool";
import { fileSource, resolveFile } from "../schemas/file-source";

const hexColor = z.string().describe("#RRGGBB.");

const background = z
	.union([
		z.object({
			pattern: z.enum(BACKGROUND_PATTERN_IDS),
			color: hexColor.describe("The pattern's color, #RRGGBB."),
		}),
		z.object({
			image: fileSource,
			tone: z
				.enum(["dark", "light"])
				.describe(
					"Whether the image is dark (light text over it) or light (dark text).",
				),
		}),
	])
	.describe("One of Quizio's patterns in a color, or an image.");

const themeFields = {
	background,
	accentColor: hexColor.describe(
		"Used for nicknames in the lobby and the podium blocks; text on it must reach a 4.5:1 contrast.",
	),
	logo: fileSource
		.nullish()
		.describe(
			"Shown on the host's screens in place of Quizio's name; null removes it.",
		),
};

async function lookOf(
	input: {
		background: z.infer<typeof background>;
		accentColor: string;
		logo?: z.infer<typeof fileSource> | null;
	},
	context: ToolContext,
	currentLogoKey: string | null = null,
): Promise<ThemeLookInput> {
	const file = (source: z.infer<typeof fileSource>) =>
		resolveFile(source, { kind: "themeFile" }, context);
	return {
		background:
			"pattern" in input.background
				? { kind: "pattern", ...input.background }
				: {
						kind: "image",
						key: await file(input.background.image),
						tone: input.background.tone,
					},
		accentColor: input.accentColor,
		logoKey:
			input.logo === undefined
				? currentLogoKey
				: input.logo === null
					? null
					: await file(input.logo),
	};
}

const withoutView = <Theme extends { view: unknown }>({
	view: _view,
	...theme
}: Theme) => theme;

/** Themes: the catalog and the person's own (spec 044, RN-25). */
export const themeTools = [
	defineTool({
		name: "list_themes",
		title: "List the themes",
		description:
			"The ready-made themes (ids for update_quiz's theme.readyMade) and the person's custom themes.",
		kind: "read",
		input: z.object({}),
		run: async (_input, { useCases, identity }) => ({
			readyMade: THEME_IDS,
			custom: (
				await useCases.listCustomThemes({ ownerId: identity.userId })
			).map(withoutView),
		}),
	}),
	defineTool({
		name: "create_custom_theme",
		title: "Create a custom theme",
		description:
			"A theme of the person's own: a name of 1 to 30 characters, a background (pattern in a color, or an image), an accent color and an optional logo. Colors must keep text legible (4.5:1).",
		kind: "write",
		input: z.object({ name: z.string(), ...themeFields }),
		run: async ({ name, ...look }, context) => ({
			theme: withoutView(
				await context.useCases.createCustomTheme({
					ownerId: context.identity.userId,
					name,
					look: await lookOf(look, context),
				}),
			),
		}),
	}),
	defineTool({
		name: "update_custom_theme",
		title: "Change a custom theme",
		description:
			"Changes only what is sent. The quizzes using the theme change with it; games already created keep their look.",
		kind: "idempotent",
		input: z.object({
			themeId: z.string(),
			name: z.string().optional(),
			background: background.optional(),
			accentColor: hexColor.optional(),
			logo: themeFields.logo,
		}),
		run: async ({ themeId, name, ...changes }, context) => {
			const current = (
				await context.useCases.listCustomThemes({
					ownerId: context.identity.userId,
				})
			).find((theme) => theme.id === themeId);
			if (!current) {
				throw new ThemeNotFoundError();
			}
			const look: ThemeLookInput =
				changes.background !== undefined
					? await lookOf(
							{
								background: changes.background,
								accentColor: changes.accentColor ?? current.look.accentColor,
								logo: changes.logo,
							},
							context,
							current.look.logoKey,
						)
					: {
							...current.look,
							accentColor: changes.accentColor ?? current.look.accentColor,
							logoKey:
								changes.logo === undefined
									? current.look.logoKey
									: changes.logo === null
										? null
										: await resolveFile(
												changes.logo,
												{ kind: "themeFile" },
												context,
											),
						};
			return {
				theme: withoutView(
					await context.useCases.updateCustomTheme({
						ownerId: context.identity.userId,
						themeId,
						name: name ?? current.name,
						look,
					}),
				),
			};
		},
	}),
	defineTool({
		name: "delete_custom_theme",
		title: "Delete a custom theme",
		description:
			"Deletes one of the person's themes; the quizzes using it go back to the standard theme. Cannot be undone: confirm with the person first.",
		kind: "destructive",
		input: z.object({ themeId: z.string() }),
		run: async ({ themeId }, { useCases, identity }) => {
			await useCases.deleteCustomTheme({ ownerId: identity.userId, themeId });
			return { deleted: themeId };
		},
	}),
];
