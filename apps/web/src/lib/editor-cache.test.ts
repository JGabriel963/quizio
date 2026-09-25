import { describe, expect, it } from "vitest";

import type { QuizEditorData } from "./api-types";
import {
	selectionAfterRemoval,
	withQuestionInserted,
	withQuestionMoved,
	withQuestionRemoved,
} from "./editor-cache";

const question = (id: string) => ({ id, type: "quiz" as const, text: id });

function editorWith(...ids: string[]): QuizEditorData {
	return {
		quiz: { questionCount: ids.length } as QuizEditorData["quiz"],
		questions: ids.map(question),
	};
}

const idsOf = (data: QuizEditorData) => data.questions.map(({ id }) => id);

describe("editor cache", () => {
	it("moves a question optimistically", () => {
		expect(idsOf(withQuestionMoved(editorWith("a", "b", "c"), "c", 0))).toEqual(
			["c", "a", "b"],
		);
	});

	it("removes a question optimistically, leaving the previous data for rollback", () => {
		const before = editorWith("a", "b", "c");

		const after = withQuestionRemoved(before, "b");

		expect(idsOf(after)).toEqual(["a", "c"]);
		expect(after.quiz.questionCount).toBe(2);
		expect(idsOf(before)).toEqual(["a", "b", "c"]);
	});

	it("inserts a question at its index and counts it", () => {
		const after = withQuestionInserted(editorWith("a", "c"), question("b"), 1);

		expect(idsOf(after)).toEqual(["a", "b", "c"]);
		expect(after.quiz.questionCount).toBe(3);
	});

	it("inserting a question already listed changes nothing", () => {
		const before = editorWith("a", "b");

		expect(withQuestionInserted(before, question("b"), 0)).toBe(before);
	});

	it("selects the next question after removal", () => {
		const remaining = editorWith("a", "c").questions;

		expect(selectionAfterRemoval(remaining, 1)).toBe("c");
	});

	it("selects the previous question when the last one is removed", () => {
		const remaining = editorWith("a").questions;

		expect(selectionAfterRemoval(remaining, 1)).toBe("a");
	});
});
