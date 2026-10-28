import { describe, expect, it } from "vitest";

import { aQuiz } from "../../quiz/testing/a-quiz";
import { ThemeNotFoundError } from "../domain/theme-errors";
import { aCustomTheme } from "../testing/a-custom-theme";
import { themesTestDeps } from "../testing/themes-test-deps";
import { createDeleteCustomTheme } from "./delete-custom-theme";
import { createListCustomThemes } from "./list-custom-themes";

async function withTheme() {
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
	return { ...t, image, logo, remove: createDeleteCustomTheme(t.deps) };
}

describe("deleteCustomTheme (spec 043, RN-19, RN-28)", () => {
	it("deletes the theme, its quizzes go back to standard and its files go", async () => {
		const t = await withTheme();
		await t.quizzes.save(aQuiz({ id: "q1", customThemeId: "theme-1" }));

		await t.remove({ ownerId: "owner-1", themeId: "theme-1" });

		expect(await t.store.findById("theme-1")).toBeNull();
		expect((await t.quizzes.findById("q1"))?.customThemeId).toBeNull();
		expect(await t.storage.exists(t.image)).toBe(false);
		expect(await t.storage.exists(t.logo)).toBe(false);
	});

	it("keeps the files an open assignment copied (CA-22)", async () => {
		const t = await withTheme();
		t.fileUsage.copiedByAGame(t.image);

		await t.remove({ ownerId: "owner-1", themeId: "theme-1" });

		expect(await t.storage.exists(t.image)).toBe(true);
		expect(await t.storage.exists(t.logo)).toBe(false);
	});

	it("someone else's is THEME.NOT_FOUND", async () => {
		const t = await withTheme();

		await expect(
			t.remove({ ownerId: "owner-2", themeId: "theme-1" }),
		).rejects.toThrow(ThemeNotFoundError);
		expect(await t.store.findById("theme-1")).not.toBeNull();
	});
});

describe("listCustomThemes (spec 043, RN-16)", () => {
	it("only the owner's, newest first, with quizCount and URLs", async () => {
		const t = await withTheme();
		t.clock.advanceBy(1000);
		await t.store.createTakingUploads(
			aCustomTheme({ id: "theme-2", name: "Novo", createdAt: t.clock.now() }),
			[],
		);
		await t.store.createTakingUploads(
			aCustomTheme({ id: "theme-3", ownerId: "owner-2" }),
			[],
		);
		await t.quizzes.save(aQuiz({ id: "q1", customThemeId: "theme-1" }));

		const listed = await createListCustomThemes(t.deps)({ ownerId: "owner-1" });

		expect(listed.map((theme) => [theme.id, theme.quizCount])).toEqual([
			["theme-2", 0],
			["theme-1", 1],
		]);
		expect(listed[1]?.view).toMatchObject({
			imageUrl: `https://media.test/${t.image}`,
			logoUrl: `https://media.test/${t.logo}`,
		});
	});
});
