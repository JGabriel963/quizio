import {
	DEFAULT_THEME_ID,
	knownThemeId,
	type ThemeId,
} from "@quizio/core/shared/domain/theme";
import type { CSSProperties } from "react";

import { DARK_TEXT, LIGHT_TEXT, readableTextOn } from "./contrast";

/**
 * The ready-made themes (spec 042, ADR 0021): the core knows the ids, this
 * catalog knows the names, the art and the colors. The art is Quizio's own,
 * in `public/themes`. `surfaces` are the colors text may sit on (the
 * gradient's ends and the shapes); the text color is worked out from them,
 * never written by hand (RN-19).
 */
interface ThemeSource {
	name: string;
	surfaces: readonly string[];
	/** Nickname cards in the lobby, podium blocks, the thumbnail's name band. */
	accent: string;
}

const SOURCES: Record<ThemeId, ThemeSource> = {
	standard: {
		name: "Padrão",
		surfaces: ["#46178f", "#25076b"],
		accent: "#25076b",
	},
	purple: {
		name: "Roxo",
		surfaces: ["#5b21b6", "#2e0a6e", "#4c1d95", "#3b0f80", "#2a0866"],
		accent: "#2a0866",
	},
	blue: {
		name: "Azul",
		surfaces: ["#1660c0", "#0a3577", "#0f50a6", "#0b4290", "#08336f"],
		accent: "#08336f",
	},
	teal: {
		name: "Verde-azulado",
		surfaces: ["#0b7a77", "#04403e", "#086663", "#055552", "#033f3d"],
		accent: "#033f3d",
	},
	red: {
		name: "Vermelho",
		surfaces: ["#b3172d", "#650a17", "#9c1427", "#82101f", "#640b17"],
		accent: "#640b17",
	},
	orange: {
		name: "Laranja",
		surfaces: ["#a3440a", "#5e2604", "#8f3b08", "#783106", "#5c2504"],
		accent: "#5c2504",
	},
	graphite: {
		name: "Grafite",
		surfaces: ["#3b4048", "#1a1d22", "#33373e", "#2a2e34", "#1f2227"],
		accent: "#111317",
	},
	light: {
		name: "Claro",
		surfaces: ["#f6f7f9", "#e4e7eb", "#eceef2", "#e1e4e9", "#d6dae0"],
		accent: "#c9ced6",
	},
	"light-blue": {
		name: "Azul claro",
		surfaces: ["#eaf3fe", "#d2e5fb", "#ddebfc", "#cde1fa", "#bcd7f7"],
		accent: "#a9cbf3",
	},
	"light-green": {
		name: "Verde claro",
		surfaces: ["#ecf8ee", "#d2eed5", "#def3e1", "#cfecd3", "#bfe4c4"],
		accent: "#a6d9ad",
	},
	"light-yellow": {
		name: "Amarelo claro",
		surfaces: ["#fff9e3", "#fdedb8", "#fff2c9", "#fde9a8", "#fbdf8a"],
		accent: "#f5cf5b",
	},
	"light-orange": {
		name: "Laranja claro",
		surfaces: ["#fff1e4", "#fddcbf", "#fee6d0", "#fdd7b5", "#fbc89a"],
		accent: "#f7b57c",
	},
	lilac: {
		name: "Lilás",
		surfaces: ["#f3ecfc", "#dfd1f6", "#e9def9", "#dccaf4", "#cdb6ee"],
		accent: "#bea3ea",
	},
	beige: {
		name: "Bege",
		surfaces: ["#f8f2ea", "#ebdfce", "#f1e7da", "#e7d9c6", "#dccab2"],
		accent: "#d3bea2",
	},
};

export interface ThemeEntry extends ThemeSource {
	id: ThemeId;
	image: string;
	/** Text and icons straight on the background (RN-19). */
	text: string;
	/** Text on the accent. */
	accentText: string;
}

export const THEME_CATALOG = Object.fromEntries(
	Object.entries(SOURCES).map(([id, source]) => [
		id,
		{
			...source,
			id,
			image: `/themes/${id}.svg`,
			text: readableTextOn(source.surfaces),
			accentText: readableTextOn([source.accent]),
		},
	]),
) as Record<ThemeId, ThemeEntry>;

/** The editor panel's groups, in order (RN-02). */
export const THEME_GROUPS: readonly {
	name: string;
	themeIds: readonly ThemeId[];
}[] = [
	{ name: "Padrão", themeIds: ["standard"] },
	{
		name: "Cores",
		themeIds: ["purple", "blue", "teal", "red", "orange", "graphite"],
	},
	{
		name: "Claros",
		themeIds: [
			"light",
			"light-blue",
			"light-green",
			"light-yellow",
			"light-orange",
			"lilac",
			"beige",
		],
	},
];

/** Any stored id: one that left the catalog is the default (RN-05). */
export function themeOf(id: string | null | undefined): ThemeEntry {
	return THEME_CATALOG[knownThemeId(id)] ?? THEME_CATALOG[DEFAULT_THEME_ID];
}

/** Light when the readable text over it is dark (RN-21). */
export function themeTone(id: string | null | undefined): "light" | "dark" {
	return themeOf(id).text === DARK_TEXT ? "light" : "dark";
}

/**
 * What a game screen or the editor's canvas needs to wear the theme. Chips
 * and strips on the background (`bg-game-chip`) follow the tone: dark with
 * white text, or light with dark text, as Kahoot's light themes. Bars
 * (`bg-game-bar`, the host's header, the phone's footer) stay dark and get
 * darker over a light background, so white text keeps reading.
 */
export function themeStyle(id: string | null | undefined): CSSProperties {
	const theme = themeOf(id);
	const light = themeTone(id) === "light";
	return {
		"--game-bg-image": `url("${theme.image}")`,
		"--game-base": theme.surfaces[0],
		"--game-fg": theme.text,
		"--game-accent": theme.accent,
		"--game-accent-fg": theme.accentText,
		"--game-chip": light ? "rgb(255 255 255 / 0.75)" : "rgb(0 0 0 / 0.4)",
		"--game-chip-fg": light ? DARK_TEXT : LIGHT_TEXT,
		"--game-bar": light ? "rgb(23 23 23 / 0.8)" : "rgb(0 0 0 / 0.4)",
	} as CSSProperties;
}
