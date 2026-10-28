import type { HexColor } from "@quizio/core/shared/domain/theme-look";

/**
 * "Biblioteca de cores" of "Crie seu tema" (spec 043, RN-06), as Kahoot's:
 * eight hues from the lightest to the darkest, and a row of grays. Every one
 * is legible with light or dark text (RN-11); a test checks it, and the
 * middle shades were darkened until they were.
 */
export const COLOR_LIBRARY: readonly (readonly HexColor[])[] = [
	[
		"#e6f0ff",
		"#dcfdff",
		"#e6fde1",
		"#ffffdc",
		"#ffe9d6",
		"#ffe2e2",
		"#ffe9fb",
		"#efe6fd",
	],
	[
		"#a6c8ff",
		"#a2f5f4",
		"#b5f4a6",
		"#fff99e",
		"#ffcc99",
		"#f7b9b9",
		"#f6c7f0",
		"#d4bbfc",
	],
	[
		"#6b9cff",
		"#5ed4d2",
		"#79e05a",
		"#fff55a",
		"#ffaa5a",
		"#ef8a80",
		"#ee8ee0",
		"#ab83ec",
	],
	[
		"#2e69fc",
		"#3b9ba2",
		"#58b844",
		"#fbd848",
		"#e66e0a",
		"#dc3927",
		"#c733b9",
		"#7339d6",
	],
	[
		"#0a1fff",
		"#2c6e78",
		"#3c8628",
		"#f0a83a",
		"#bf5900",
		"#a82020",
		"#a0218f",
		"#5410c4",
	],
	[
		"#ffffff",
		"#f0f0f0",
		"#d4d4d4",
		"#acacac",
		"#8f8f8f",
		"#5c5c5c",
		"#2f2f2f",
		"#000000",
	],
];

/** A new theme: Quizio's purple behind, its blue as the accent (RN-06). */
export const DEFAULT_BACKGROUND_COLOR: HexColor = "#46178f";
export const DEFAULT_ACCENT_COLOR: HexColor = "#1368ce";
