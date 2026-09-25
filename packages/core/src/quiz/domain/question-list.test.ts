import { describe, expect, it } from "vitest";

import { NotFoundError } from "../../shared/domain/not-found-error";
import { aQuestion } from "../testing/a-question";
import { blankQuestion, type Question } from "./question";
import {
	InvalidQuestionPositionError,
	insertQuestionAfter,
	LastQuestionError,
	moveQuestion,
	QUIZ_MAX_QUESTIONS,
	QuestionLimitReachedError,
	QuestionNotFoundError,
	removeQuestion,
	restoreQuestionAt,
} from "./question-list";

const a = aQuestion({ id: "a", text: "A" });
const b = aQuestion({ id: "b", text: "B" });
const c = aQuestion({ id: "c", text: "C" });

const ids = (list: readonly Question[]) => list.map((question) => question.id);

function listOf(size: number): Question[] {
	return Array.from({ length: size }, (_, index) =>
		blankQuestion(`q-${index}`),
	);
}

describe("insertQuestionAfter", () => {
	it("inserts right after the given question", () => {
		const result = insertQuestionAfter([a, b, c], "b", blankQuestion("new"));

		expect(ids(result.list)).toEqual(["a", "b", "new", "c"]);
		expect(result.index).toBe(2);
	});

	it("inserts at the end when no question is given", () => {
		const result = insertQuestionAfter([a, b], null, blankQuestion("new"));

		expect(ids(result.list)).toEqual(["a", "b", "new"]);
		expect(result.index).toBe(2);
	});

	it("refuses to insert after a question that is not in the list", () => {
		const insert = () =>
			insertQuestionAfter([a, b], "missing", blankQuestion("new"));

		expect(insert).toThrow(QuestionNotFoundError);
		expect(insert).toThrow(NotFoundError);
	});

	it("allows the 200th question and refuses the 201st", () => {
		const almostFull = listOf(QUIZ_MAX_QUESTIONS - 1);

		const full = insertQuestionAfter(almostFull, null, blankQuestion("new"));

		expect(full.list).toHaveLength(QUIZ_MAX_QUESTIONS);
		expect(() =>
			insertQuestionAfter(full.list, null, blankQuestion("extra")),
		).toThrow(QuestionLimitReachedError);
	});
});

describe("moveQuestion", () => {
	it("moves a question to a new index", () => {
		expect(ids(moveQuestion([a, b, c], "c", 0))).toEqual(["c", "a", "b"]);
		expect(ids(moveQuestion([a, b, c], "a", 2))).toEqual(["b", "c", "a"]);
	});

	it("refuses a move outside the list", () => {
		expect(() => moveQuestion([a, b, c], "a", 3)).toThrow(
			InvalidQuestionPositionError,
		);
		expect(() => moveQuestion([a, b, c], "a", -1)).toThrow(
			InvalidQuestionPositionError,
		);
		expect(() => moveQuestion([a, b, c], "missing", 0)).toThrow(
			QuestionNotFoundError,
		);
	});
});

describe("removeQuestion", () => {
	it("removes a question returning it with its index", () => {
		const result = removeQuestion([a, b, c], "b");

		expect(ids(result.list)).toEqual(["a", "c"]);
		expect(result.removed).toEqual(b);
		expect(result.index).toBe(1);
	});

	it("refuses to remove the only question", () => {
		expect(() => removeQuestion([a], "a")).toThrow(LastQuestionError);
	});

	it("refuses to remove a question that is not in the list", () => {
		expect(() => removeQuestion([a, b], "missing")).toThrow(
			QuestionNotFoundError,
		);
	});
});

describe("restoreQuestionAt", () => {
	it("restores a removed question at its former index", () => {
		const result = restoreQuestionAt([a, c], b, 1);

		expect(ids(result.list)).toEqual(["a", "b", "c"]);
		expect(result.index).toBe(1);
	});

	it("clamps a restore index beyond the end", () => {
		const result = restoreQuestionAt([a, b], c, 7);

		expect(ids(result.list)).toEqual(["a", "b", "c"]);
		expect(result.index).toBe(2);
	});

	it("ignores a restore of a question already in the list", () => {
		const list = [a, b, c];

		const result = restoreQuestionAt(list, b, 0);

		expect(result.list).toBe(list);
		expect(result.index).toBe(1);
	});

	it("refuses a restore that would exceed the limit", () => {
		expect(() =>
			restoreQuestionAt(listOf(QUIZ_MAX_QUESTIONS), blankQuestion("back"), 0),
		).toThrow(QuestionLimitReachedError);
	});
});
