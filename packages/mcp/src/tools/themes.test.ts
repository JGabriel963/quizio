import { describe, expect, it } from "vitest";

import { connectTestClient } from "../testing/connect-test-client";

const png = () => {
	const bytes = new Uint8Array(512);
	bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	return bytes;
};

describe("theme tools (spec 044, RN-25, CA-17)", () => {
	it("list_themes gives the ready-made ids and the caller's custom themes", async () => {
		const { ok } = await connectTestClient({ userId: "ana" });
		await ok("create_custom_theme", {
			name: "Escola",
			background: { pattern: "waves", color: "#1b2a6b" },
			accentColor: "#ffd84d",
		});

		const themes = await ok("list_themes");

		expect(themes.readyMade).toContain("standard");
		expect(themes.readyMade).toContain("light-blue");
		expect(themes.custom).toEqual([
			expect.objectContaining({ name: "Escola" }),
		]);
	});

	it("create_custom_theme with a pattern, a legible color and a logo by link, then update_quiz uses it", async () => {
		const { api, ok } = await connectTestClient({ userId: "ana" });
		api.remoteFiles.serve("https://example.com/logo.png", { bytes: png() });

		const theme = await ok("create_custom_theme", {
			name: "Escola",
			background: { pattern: "waves", color: "#1B2A6B" },
			accentColor: "#ffd84d",
			logo: { url: "https://example.com/logo.png" },
		});
		const created = await ok("create_quiz", { title: "Com tema" });
		const quizId = (created.quiz as { id: string }).id;
		const themed = await ok("update_quiz", {
			quizId,
			theme: { customThemeId: (theme.theme as { id: string }).id },
		});

		expect(theme.theme).toMatchObject({
			name: "Escola",
			look: {
				background: { kind: "pattern", pattern: "waves", color: "#1b2a6b" },
				logoKey: expect.stringMatching(/^themes\/ana\//),
			},
		});
		expect(themed.quiz).toMatchObject({
			customThemeId: (theme.theme as { id: string }).id,
		});
	});

	it("an accent color under 4.5:1 is refused with the minimum", async () => {
		const { call } = await connectTestClient({ userId: "ana" });

		const result = await call("create_custom_theme", {
			name: "Ilegível",
			background: { pattern: "waves", color: "#1b2a6b" },
			accentColor: "#808080",
		});

		expect(result.data.error).toMatchObject({ code: "THEME.ILLEGIBLE_COLOR" });
	});

	it("update_custom_theme and delete_custom_theme", async () => {
		const { ok } = await connectTestClient({ userId: "ana" });
		const created = await ok("create_custom_theme", {
			name: "Antes",
			background: { pattern: "waves", color: "#1b2a6b" },
			accentColor: "#ffd84d",
		});
		const themeId = (created.theme as { id: string }).id;

		const renamed = await ok("update_custom_theme", {
			themeId,
			name: "Depois",
		});
		await ok("delete_custom_theme", { themeId });

		expect(renamed.theme).toMatchObject({
			name: "Depois",
			look: { accentColor: "#ffd84d" },
		});
		expect((await ok("list_themes")).custom).toEqual([]);
	});
});
