import type { CustomTheme } from "../domain/custom-theme";

const AT = new Date("2026-10-28T12:00:00.000Z");

/** A navy-and-yellow pattern theme, unless told otherwise. */
export function aCustomTheme(
	overrides: Partial<CustomTheme> = {},
): CustomTheme {
	return {
		id: "theme-1",
		ownerId: "owner-1",
		name: "Escola Azul",
		look: {
			background: { kind: "pattern", pattern: "waves", color: "#1b2a6b" },
			accentColor: "#ffd84d",
			logoKey: null,
		},
		createdAt: AT,
		updatedAt: AT,
		...overrides,
	};
}
