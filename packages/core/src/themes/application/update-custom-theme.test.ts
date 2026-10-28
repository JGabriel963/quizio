import { describe, expect, it } from "vitest";

import { aQuiz } from "../../quiz/testing/a-quiz";
import {
	ThemeNotFoundError,
	ThemeUploadNotFoundError,
} from "../domain/theme-errors";
import { aCustomTheme } from "../testing/a-custom-theme";
import { themesTestDeps } from "../testing/themes-test-deps";
import { createRequestThemeUpload } from "./request-theme-upload";
import { createUpdateCustomTheme } from "./update-custom-theme";

const HOUR = 60 * 60 * 1000;

/** A later upload request, a day on: it sweeps what was released. */
async function sweepADayLater(t: ReturnType<typeof themesTestDeps>) {
	t.clock.advanceBy(24 * HOUR + 1);
	await createRequestThemeUpload(t.deps)({
		ownerId: "owner-2",
		contentType: "image/png",
		sizeBytes: 1000,
	});
}

/** A theme with image A and logo L, both stored. */
async function withImageTheme() {
	const t = themesTestDeps();
	const image = "themes/owner-1/a.jpg";
	const logo = "themes/owner-1/logo.png";
	t.storage.simulateUpload(image);
	t.storage.simulateUpload(logo);
	await t.store.createTakingUploads(
		aCustomTheme({
			look: {
				background: { kind: "image", key: image, tone: "dark" },
				accentColor: "#1368ce",
				logoKey: logo,
			},
		}),
		[],
	);
	t.clock.advanceBy(HOUR);
	return { ...t, image, logo, update: createUpdateCustomTheme(t.deps) };
}

describe("updateCustomTheme (spec 043, RN-17, RN-18, RN-28)", () => {
	it("changes the look and the name every quiz reads", async () => {
		const t = await withImageTheme();
		await t.quizzes.save(aQuiz({ id: "q1", customThemeId: "theme-1" }));

		const view = await t.update({
			ownerId: "owner-1",
			themeId: "theme-1",
			name: "Escola Verde",
			look: {
				background: { kind: "image", key: t.image, tone: "dark" },
				accentColor: "#26890c",
				logoKey: t.logo,
			},
		});

		expect(view).toMatchObject({ name: "Escola Verde", quizCount: 1 });
		expect(await t.store.findById("theme-1")).toMatchObject({
			name: "Escola Verde",
			look: { accentColor: "#26890c" },
			updatedAt: t.clock.now(),
		});
		// The files it kept stay.
		expect(await t.storage.exists(t.image)).toBe(true);
		expect(await t.storage.exists(t.logo)).toBe(true);
	});

	it("takes a new upload; the replaced files go a day later when nobody copied them (CA-21, RN-28)", async () => {
		const t = await withImageTheme();
		const replacement = await t.uploaded("themes/owner-1/b.jpg");

		await t.update({
			ownerId: "owner-1",
			themeId: "theme-1",
			name: "Escola Azul",
			look: {
				background: { kind: "image", key: replacement, tone: "light" },
				accentColor: "#1368ce",
				logoKey: null,
			},
		});

		// Released, not deleted: a game being created may have read them.
		expect(t.store.pendingUploadKeys().sort()).toEqual(
			[t.image, t.logo].sort(),
		);
		expect(await t.storage.exists(t.image)).toBe(true);

		await sweepADayLater(t);

		expect(await t.storage.exists(replacement)).toBe(true);
		expect(await t.storage.exists(t.image)).toBe(false);
		expect(await t.storage.exists(t.logo)).toBe(false);
	});

	it("keeps a file a game copied, also one that copied it while the theme was edited (CA-14)", async () => {
		const t = await withImageTheme();

		await t.update({
			ownerId: "owner-1",
			themeId: "theme-1",
			name: "Escola Azul",
			look: {
				background: { kind: "pattern", pattern: "waves", color: "#1b2a6b" },
				accentColor: "#26890c",
				logoKey: null,
			},
		});

		// The game was created with the old look at the same moment.
		t.fileUsage.copiedByAGame(t.logo);
		await sweepADayLater(t);

		expect(await t.storage.exists(t.logo)).toBe(true);
		expect(await t.storage.exists(t.image)).toBe(false);
	});

	it("refuses a file that is neither the theme's nor a pending upload", async () => {
		const t = await withImageTheme();
		t.storage.simulateUpload("themes/owner-1/stray.png");

		await expect(
			t.update({
				ownerId: "owner-1",
				themeId: "theme-1",
				name: "Escola Azul",
				look: {
					background: { kind: "image", key: t.image, tone: "dark" },
					accentColor: "#1368ce",
					logoKey: "themes/owner-1/stray.png",
				},
			}),
		).rejects.toThrow(ThemeUploadNotFoundError);
		expect((await t.store.findById("theme-1"))?.look.logoKey).toBe(t.logo);
	});

	it("someone else's or a missing theme is THEME.NOT_FOUND", async () => {
		const t = await withImageTheme();
		const input = {
			name: "X",
			look: {
				background: {
					kind: "pattern" as const,
					pattern: "waves",
					color: "#1b2a6b",
				},
				accentColor: "#ffd84d",
				logoKey: null,
			},
		};

		await expect(
			t.update({ ownerId: "owner-2", themeId: "theme-1", ...input }),
		).rejects.toThrow(ThemeNotFoundError);
		await expect(
			t.update({ ownerId: "owner-1", themeId: "nope", ...input }),
		).rejects.toThrow(ThemeNotFoundError);
	});
});
