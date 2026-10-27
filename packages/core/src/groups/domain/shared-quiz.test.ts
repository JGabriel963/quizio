import { describe, expect, it } from "vitest";

import {
	SHARED_QUIZ_SORTS,
	SHARED_QUIZZES_PAGE_SIZE,
	sharedQuizzesPostKind,
} from "./shared-quiz";

describe("shared quizzes (spec 037)", () => {
	it("sharedQuizzesPostKind: one quiz is quizShare, more are quizzesShare (RN-06)", () => {
		expect(sharedQuizzesPostKind(1)).toBe("quizShare");
		expect(sharedQuizzesPostKind(2)).toBe("quizzesShare");
		expect(sharedQuizzesPostKind(5)).toBe("quizzesShare");
	});

	it("sorts as Ordenar por and pages by 20 (RN-14, RN-15)", () => {
		expect(SHARED_QUIZ_SORTS).toEqual([
			"recent",
			"oldest",
			"nameAsc",
			"nameDesc",
		]);
		expect(SHARED_QUIZZES_PAGE_SIZE).toBe(20);
	});
});
