import { describe, expect, it } from "vitest";

import {
	IllegibleThemeColorError,
	InvalidThemeNameError,
	ThemeUploadNotFoundError,
} from "../domain/theme-errors";
import { themesTestDeps } from "../testing/themes-test-deps";
import { createCreateCustomTheme } from "./create-custom-theme";

const patternLook = {
	background: { kind: "pattern" as const, pattern: "peaks", color: "#1B2A6B" },
	accentColor: "#ffd84d",
	logoKey: null,
};

describe("createCustomTheme (spec 043, RN-02 to RN-07, RN-11)", () => {
	it("creates a pattern theme", async () => {
		const t = themesTestDeps();
		const create = createCreateCustomTheme(t.deps);

		const view = await create({
			ownerId: "owner-1",
			name: " Escola Azul ",
			look: patternLook,
		});

		expect(view).toMatchObject({
			name: "Escola Azul",
			quizCount: 0,
			look: {
				background: { kind: "pattern", pattern: "peaks", color: "#1b2a6b" },
			},
			view: { pattern: "peaks", backgroundColor: "#1b2a6b" },
		});
		expect(await t.store.findById(view.id)).toMatchObject({
			ownerId: "owner-1",
			createdAt: t.clock.now(),
			updatedAt: t.clock.now(),
		});
	});

	it("creates an image theme with a logo and takes the uploads", async () => {
		const t = themesTestDeps();
		const image = await t.uploaded("themes/owner-1/bg.jpg");
		const logo = await t.uploaded("themes/owner-1/logo.png");

		const view = await createCreateCustomTheme(t.deps)({
			ownerId: "owner-1",
			name: "Com imagem",
			look: {
				background: { kind: "image", key: image, tone: "dark" },
				accentColor: "#1368ce",
				logoKey: logo,
			},
		});

		expect(view.view).toMatchObject({
			imageUrl: `https://media.test/${image}`,
			imageTone: "dark",
			logoUrl: `https://media.test/${logo}`,
		});
		expect(t.store.pendingUploadKeys()).toEqual([]);
	});

	it.each([
		["someone else's pending upload", "themes/owner-2/bg.jpg", "owner-2", true],
		[
			"a key outside the owner's folder",
			"media/owner-1/bg.jpg",
			"owner-1",
			true,
		],
		[
			"an upload missing from storage",
			"themes/owner-1/bg.jpg",
			"owner-1",
			false,
		],
	])("refuses %s (THEME.UPLOAD_NOT_FOUND)", async (_, key, uploader, sent) => {
		const t = themesTestDeps();
		await t.store.addThemeUpload({
			key,
			ownerId: uploader,
			createdAt: t.clock.now(),
		});
		if (sent) {
			t.storage.simulateUpload(key);
		}

		await expect(
			createCreateCustomTheme(t.deps)({
				ownerId: "owner-1",
				name: "Com imagem",
				look: {
					background: { kind: "image", key, tone: "dark" },
					accentColor: "#1368ce",
					logoKey: null,
				},
			}),
		).rejects.toThrow(ThemeUploadNotFoundError);
		expect(await t.store.listByOwner("owner-1")).toEqual([]);
	});

	it("refuses a file that is not pending any more", async () => {
		const t = themesTestDeps();
		t.storage.simulateUpload("themes/owner-1/old.png");

		await expect(
			createCreateCustomTheme(t.deps)({
				ownerId: "owner-1",
				name: "Logo",
				look: { ...patternLook, logoKey: "themes/owner-1/old.png" },
			}),
		).rejects.toThrow(ThemeUploadNotFoundError);
	});

	it("refuses an illegible color or a bad name before writing", async () => {
		const t = themesTestDeps();
		const create = createCreateCustomTheme(t.deps);

		await expect(
			create({
				ownerId: "owner-1",
				name: "Cinza",
				look: { ...patternLook, accentColor: "#777777" },
			}),
		).rejects.toThrow(IllegibleThemeColorError);
		await expect(
			create({ ownerId: "owner-1", name: "", look: patternLook }),
		).rejects.toThrow(InvalidThemeNameError);
		expect(await t.store.listByOwner("owner-1")).toEqual([]);
	});
});
