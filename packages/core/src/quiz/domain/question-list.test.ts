import { describe, expect, it } from "vitest";

import { NotFoundError } from "../../shared/domain/not-found-error";
import { aQuestion } from "../testing/a-question";
import { blankQuestion, type Question } from "./question";
import {
	appendGeneratedQuestions,
	InvalidQuestionPositionError,
	insertQuestionAfter,
	LastQuestionError,
	moveQuestion,
	NoGeneratedQuestionsError,
	QUIZ_MAX_QUESTIONS,
	QuestionLimitReachedError,
	QuestionNotFoundError,
	removeQuestion,
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
	it("removes a question keeping the order of the others", () => {
		expect(ids(removeQuestion([a, b, c], "b"))).toEqual(["a", "c"]);
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

describe("appendGeneratedQuestions", () => {
	const x = aQuestion({ id: "x", text: "X", aiGenerated: true });
	const y = aQuestion({ id: "y", text: "Y", aiGenerated: true });

	it("appends generated questions at the end", () => {
		const { list, firstIndex } = appendGeneratedQuestions([a, b], [x, y]);

		expect(ids(list)).toEqual(["a", "b", "x", "y"]);
		expect(firstIndex).toBe(2);
	});

	it("replaces a single blank question", () => {
		const { list, firstIndex } = appendGeneratedQuestions(
			[blankQuestion("blank")],
			[x, y],
		);

		expect(ids(list)).toEqual(["x", "y"]);
		expect(firstIndex).toBe(0);
	});

	it("keeps a single question that has text", () => {
		expect(ids(appendGeneratedQuestions([a], [x]).list)).toEqual(["a", "x"]);
	});

	it("keeps a blank question that is not alone", () => {
		expect(
			ids(appendGeneratedQuestions([a, blankQuestion("blank")], [x]).list),
		).toEqual(["a", "blank", "x"]);
	});

	it("refuses past 200 questions", () => {
		const generated = listOf(5).map((question) => ({
			...question,
			id: `new-${question.id}`,
		}));

		expect(
			appendGeneratedQuestions(listOf(QUIZ_MAX_QUESTIONS - 5), generated).list,
		).toHaveLength(QUIZ_MAX_QUESTIONS);
		expect(() =>
			appendGeneratedQuestions(listOf(QUIZ_MAX_QUESTIONS - 4), generated),
		).toThrow(QuestionLimitReachedError);
	});

	it("refuses an empty list of generated questions", () => {
		expect(() => appendGeneratedQuestions([a], [])).toThrow(
			NoGeneratedQuestionsError,
		);
	});
});
