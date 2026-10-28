import { describe, expect, it } from "vitest";

import {
	canSaveTheme,
	customThemeForm,
	discardableUploads,
	formLook,
	formLookView,
	type ThemeFormAction,
	themeFormChanged,
	themeFormReducer,
} from "./custom-theme-form";

const run = (...actions: ThemeFormAction[]) =>
	actions.reduce(themeFormReducer, customThemeForm(null));

const LOGO = {
	key: "themes/u1/logo.png",
	url: "https://media.test/themes/u1/logo.png",
};
const IMAGE = {
	key: "themes/u1/bg.jpg",
	url: "https://media.test/themes/u1/bg.jpg",
};

describe("custom theme form (spec 043)", () => {
	it("starts with Meu tema, the first pattern, Quizio's purple and blue (RN-03, RN-05, RN-06)", () => {
		const form = customThemeForm(null);

		expect(formLook(form)).toEqual({
			background: { kind: "pattern", pattern: "waves", color: "#46178f" },
			accentColor: "#1368ce",
			logoKey: null,
		});
		expect(form.name).toBe("Meu tema");
		expect(canSaveTheme(form)).toBe(true);
		expect(themeFormChanged(form)).toBe(false);
	});

	it("Salvar is off with an empty name or an illegible color (CA-07, CA-08)", () => {
		expect(canSaveTheme(run({ type: "name", name: "   " }))).toBe(false);
		expect(canSaveTheme(run({ type: "accentColor", color: "#777777" }))).toBe(
			false,
		);
		expect(
			canSaveTheme(run({ type: "backgroundColor", color: "#777777" })),
		).toBe(false);
	});

	it("Salvar waits for an upload and needs the image of an image background", () => {
		expect(canSaveTheme(run({ type: "uploadStarted", slot: "logo" }))).toBe(
			false,
		);
		expect(canSaveTheme(run({ type: "backgroundKind", kind: "image" }))).toBe(
			false,
		);
		expect(
			canSaveTheme(
				run(
					{ type: "backgroundKind", kind: "image" },
					{ type: "uploadStarted", slot: "image" },
					{ type: "uploaded", slot: "image", file: IMAGE, tone: "light" },
				),
			),
		).toBe(true);
	});

	it("knows when something changed (RN-15)", () => {
		expect(themeFormChanged(run({ type: "pattern", pattern: "rings" }))).toBe(
			true,
		);
		expect(themeFormChanged(run({ type: "name", name: "Meu tema" }))).toBe(
			false,
		);
	});

	it("an image background gives the image's key and tone", () => {
		const form = run(
			{ type: "backgroundKind", kind: "image" },
			{ type: "uploadStarted", slot: "image" },
			{ type: "uploaded", slot: "image", file: IMAGE, tone: "light" },
			{ type: "uploadStarted", slot: "logo" },
			{ type: "uploaded", slot: "logo", file: LOGO },
		);

		expect(formLook(form)).toEqual({
			background: { kind: "image", key: IMAGE.key, tone: "light" },
			accentColor: "#1368ce",
			logoKey: LOGO.key,
		});
		expect(formLookView(form)).toMatchObject({
			pattern: null,
			imageUrl: IMAGE.url,
			imageTone: "light",
			logoUrl: LOGO.url,
		});
	});

	it("tracks the uploads to discard: all on Cancelar, the replaced ones on Salvar", () => {
		const other = {
			key: "themes/u1/other.png",
			url: "https://media.test/o.png",
		};
		const form = run(
			{ type: "uploadStarted", slot: "logo" },
			{ type: "uploaded", slot: "logo", file: LOGO },
			{ type: "uploadStarted", slot: "logo" },
			{ type: "uploaded", slot: "logo", file: other },
		);

		expect(discardableUploads(form, "cancel")).toEqual([LOGO.key, other.key]);
		expect(discardableUploads(form, "save")).toEqual([LOGO.key]);
	});

	it("editing starts from the theme and keeps its own files out of the discards", () => {
		const form = customThemeForm({
			id: "theme-1",
			name: "Escola Azul",
			look: {
				background: { kind: "image", key: IMAGE.key, tone: "dark" },
				accentColor: "#ffd84d",
				logoKey: LOGO.key,
			},
			view: {
				pattern: null,
				backgroundColor: null,
				imageUrl: IMAGE.url,
				imageTone: "dark",
				accentColor: "#ffd84d",
				logoUrl: LOGO.url,
			},
		});
		const removed = themeFormReducer(form, { type: "remove", slot: "logo" });

		expect(form.themeId).toBe("theme-1");
		expect(formLook(removed).logoKey).toBeNull();
		expect(discardableUploads(removed, "cancel")).toEqual([]);
		expect(themeFormChanged(removed)).toBe(true);
	});

	it("a failed upload frees the slot", () => {
		const form = run(
			{ type: "uploadStarted", slot: "logo" },
			{ type: "uploadFailed", slot: "logo" },
		);

		expect(form.progress.logo).toBeNull();
		expect(canSaveTheme(form)).toBe(true);
	});
});
