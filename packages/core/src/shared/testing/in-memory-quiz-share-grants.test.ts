import { describe, expect, it } from "vitest";

import { InMemoryQuizShareGrants } from "./in-memory-quiz-share-grants";

describe("InMemoryQuizShareGrants", () => {
	it("canUse only after grant(userId, quizId); revoke takes it back", async () => {
		const grants = new InMemoryQuizShareGrants();

		expect(await grants.canUse("carla", "quiz-1")).toBe(false);
		grants.grant("carla", "quiz-1");
		expect(await grants.canUse("carla", "quiz-1")).toBe(true);
		expect(await grants.canUse("carla", "quiz-2")).toBe(false);
		expect(await grants.canUse("diego", "quiz-1")).toBe(false);
		grants.revoke("carla", "quiz-1");
		expect(await grants.canUse("carla", "quiz-1")).toBe(false);
	});
});
