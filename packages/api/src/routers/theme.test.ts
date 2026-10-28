import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

const patternLook = {
	background: {
		kind: "pattern" as const,
		pattern: "waves" as const,
		color: "#1b2a6b",
	},
	accentColor: "#ffd84d",
	logoKey: null,
};

async function failureOf(promise: Promise<unknown>) {
	return promise.then(
		() => {
			throw new Error("Expected a failure");
		},
		(error: unknown) => error,
	);
}

describe("theme router (spec 043)", () => {
	it("create, list, update and delete through the router", async () => {
		const ana = createTestApi().callerFor("user-1");

		const created = await ana.theme.create({
			name: "Escola Azul",
			look: patternLook,
		});
		const updated = await ana.theme.update({
			themeId: created.id,
			name: "Escola Verde",
			look: { ...patternLook, accentColor: "#26890c" },
		});

		expect(updated).toMatchObject({
			name: "Escola Verde",
			view: { accentColor: "#26890c" },
		});
		expect((await ana.theme.list()).map((theme) => theme.name)).toEqual([
			"Escola Verde",
		]);

		await ana.theme.delete({ themeId: created.id });
		expect(await ana.theme.list()).toEqual([]);
	});

	it("uploads a file under themes/{user}/ and discards it", async () => {
		const api = createTestApi();
		const ana = api.callerFor("user-1");

		const upload = await ana.theme.requestUpload({
			contentType: "image/png",
			sizeBytes: 1000,
		});
		api.storage.simulateUpload(upload.key);
		await ana.theme.discardUpload({ key: upload.key });

		expect(upload.key).toMatch(/^themes\/user-1\//);
		expect(await api.storage.exists(upload.key)).toBe(false);
	});

	it("a visitor gets UNAUTHORIZED", async () => {
		const error = await failureOf(createTestApi().callerFor(null).theme.list());

		expect(error).toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("someone else's theme is NOT_FOUND with data.domainCode THEME.NOT_FOUND (CA-16, CA-17)", async () => {
		const api = createTestApi();
		const created = await api
			.callerFor("user-1")
			.theme.create({ name: "Escola Azul", look: patternLook });
		const beto = api.callerFor("user-2");
		const quiz = await beto.quiz.create({});

		for (const attempt of [
			beto.theme.delete({ themeId: created.id }),
			beto.quiz.setTheme({
				quizId: quiz.id,
				choice: { kind: "custom", customThemeId: created.id },
			}),
		]) {
			expect(await failureOf(attempt)).toMatchObject({
				code: "NOT_FOUND",
				cause: { code: "THEME.NOT_FOUND" },
			});
		}
	});

	it("an illegible color is BAD_REQUEST with THEME.ILLEGIBLE_COLOR (CA-08)", async () => {
		const error = await failureOf(
			createTestApi()
				.callerFor("user-1")
				.theme.create({
					name: "Cinza",
					look: { ...patternLook, accentColor: "#777777" },
				}),
		);

		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "THEME.ILLEGIBLE_COLOR" },
		});
	});
});
