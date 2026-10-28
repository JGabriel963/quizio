import type { ThemeLookView } from "@quizio/core/shared/application/theme-look-view";
import { isLegibleColor } from "@quizio/core/shared/domain/contrast";
import { characterCount } from "@quizio/core/shared/domain/text-length";
import type { ThemeTone } from "@quizio/core/shared/domain/theme";
import type {
	BackgroundPatternId,
	ThemeLook,
} from "@quizio/core/shared/domain/theme-look";

import {
	DEFAULT_ACCENT_COLOR,
	DEFAULT_BACKGROUND_COLOR,
} from "./theme-palette";

/** As the core's `parseThemeName` (spec 043, RN-03). */
export const THEME_NAME_MAX_LENGTH = 30;
const DEFAULT_THEME_NAME = "Meu tema";

export type ThemeFileSlot = "logo" | "image";

/** A file the form holds: its key for the server, its URL for the screen. */
export interface ThemeFormFile {
	key: string;
	url: string;
}

/** What "Editar tema" starts from: a theme of "Seus temas". */
export interface EditableTheme {
	id: string;
	name: string;
	look: ThemeLook;
	view: ThemeLookView;
}

/**
 * "Crie seu tema" / "Editar tema" (spec 043, RN-13 to RN-15) as data: what is
 * filled, the uploads going and the ones sent in this session, which go if
 * the theme does not keep them (RN-29). The effects live in the dialog.
 */
export interface CustomThemeFormState {
	/** Null while creating. */
	themeId: string | null;
	name: string;
	backgroundKind: "pattern" | "image";
	pattern: BackgroundPatternId;
	backgroundColor: string;
	image: (ThemeFormFile & { tone: ThemeTone }) | null;
	accentColor: string;
	logo: ThemeFormFile | null;
	progress: Record<ThemeFileSlot, number | null>;
	/** Keys uploaded here, in order; the theme's own files are not among them. */
	sent: string[];
	/** What it opened with, to tell a change. */
	initial: string;
}

export type ThemeFormAction =
	| { type: "name"; name: string }
	| { type: "backgroundKind"; kind: "pattern" | "image" }
	| { type: "pattern"; pattern: BackgroundPatternId }
	| { type: "backgroundColor"; color: string }
	| { type: "accentColor"; color: string }
	| { type: "uploadStarted"; slot: ThemeFileSlot }
	| { type: "uploadProgress"; slot: ThemeFileSlot; fraction: number }
	| {
			type: "uploaded";
			slot: ThemeFileSlot;
			file: ThemeFormFile;
			tone?: ThemeTone;
	  }
	| { type: "uploadFailed"; slot: ThemeFileSlot }
	| { type: "remove"; slot: ThemeFileSlot };

export function customThemeForm(
	theme: EditableTheme | null,
): CustomThemeFormState {
	const background = theme?.look.background;
	const state: CustomThemeFormState = {
		themeId: theme?.id ?? null,
		name: theme?.name ?? DEFAULT_THEME_NAME,
		backgroundKind: background?.kind ?? "pattern",
		pattern: background?.kind === "pattern" ? background.pattern : "waves",
		backgroundColor:
			background?.kind === "pattern"
				? background.color
				: DEFAULT_BACKGROUND_COLOR,
		image:
			background?.kind === "image" && theme?.view.imageUrl
				? {
						key: background.key,
						url: theme.view.imageUrl,
						tone: background.tone,
					}
				: null,
		accentColor: theme?.look.accentColor ?? DEFAULT_ACCENT_COLOR,
		logo:
			theme?.look.logoKey && theme.view.logoUrl
				? { key: theme.look.logoKey, url: theme.view.logoUrl }
				: null,
		progress: { logo: null, image: null },
		sent: [],
		initial: "",
	};
	return { ...state, initial: fingerprint(state) };
}

export function themeFormReducer(
	state: CustomThemeFormState,
	action: ThemeFormAction,
): CustomThemeFormState {
	switch (action.type) {
		case "name":
			return { ...state, name: action.name };
		case "backgroundKind":
			return { ...state, backgroundKind: action.kind };
		case "pattern":
			return { ...state, pattern: action.pattern };
		case "backgroundColor":
			return { ...state, backgroundColor: action.color };
		case "accentColor":
			return { ...state, accentColor: action.color };
		case "uploadStarted":
			return withProgress(state, action.slot, 0);
		case "uploadProgress":
			return withProgress(state, action.slot, action.fraction);
		case "uploadFailed":
			return withProgress(state, action.slot, null);
		case "uploaded": {
			const next = {
				...withProgress(state, action.slot, null),
				sent: [...state.sent, action.file.key],
			};
			return action.slot === "logo"
				? { ...next, logo: action.file }
				: { ...next, image: { ...action.file, tone: action.tone ?? "dark" } };
		}
		case "remove":
			return action.slot === "logo"
				? { ...state, logo: null }
				: { ...state, image: null };
	}
}

function withProgress(
	state: CustomThemeFormState,
	slot: ThemeFileSlot,
	value: number | null,
): CustomThemeFormState {
	return { ...state, progress: { ...state.progress, [slot]: value } };
}

/** The look the server is sent; an image background without its image is not one yet. */
export function formLook(state: CustomThemeFormState): ThemeLook {
	return {
		background:
			state.backgroundKind === "image" && state.image
				? { kind: "image", key: state.image.key, tone: state.image.tone }
				: {
						kind: "pattern",
						pattern: state.pattern,
						color: state.backgroundColor,
					},
		accentColor: state.accentColor,
		logoKey: state.logo?.key ?? null,
	};
}

/** The look the preview draws, before anything is saved (RN-14). */
export function formLookView(state: CustomThemeFormState): ThemeLookView {
	const image = state.backgroundKind === "image" ? state.image : null;
	return {
		pattern: image ? null : state.pattern,
		backgroundColor: image ? null : state.backgroundColor,
		imageUrl: image?.url ?? null,
		imageTone: image?.tone ?? null,
		accentColor: state.accentColor,
		logoUrl: state.logo?.url ?? null,
	};
}

export function canSaveTheme(state: CustomThemeFormState): boolean {
	const length = characterCount(state.name.trim());
	return (
		length > 0 &&
		length <= THEME_NAME_MAX_LENGTH &&
		isLegibleColor(state.accentColor) &&
		(state.backgroundKind === "image"
			? state.image !== null
			: isLegibleColor(state.backgroundColor)) &&
		state.progress.logo === null &&
		state.progress.image === null
	);
}

/** Whether "Descartar este tema?" has something to ask about (RN-15). */
export function themeFormChanged(state: CustomThemeFormState): boolean {
	return fingerprint(state) !== state.initial;
}

/**
 * Uploads of this session to discard (RN-29): all of them on Cancelar, the
 * ones the saved theme does not use on Salvar.
 */
export function discardableUploads(
	state: CustomThemeFormState,
	ending: "cancel" | "save",
): string[] {
	if (ending === "cancel") {
		return [...state.sent];
	}
	const look = formLook(state);
	const kept = new Set([
		...(look.background.kind === "image" ? [look.background.key] : []),
		...(look.logoKey ? [look.logoKey] : []),
	]);
	return state.sent.filter((key) => !kept.has(key));
}

function fingerprint(state: CustomThemeFormState): string {
	return JSON.stringify([
		state.name.trim(),
		formLook(state),
		state.backgroundKind,
	]);
}
