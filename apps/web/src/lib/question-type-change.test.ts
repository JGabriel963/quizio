import { applyQuestionChange } from "@quizio/core/quiz/domain/question-change";
import {
	aQuestion,
	aTrueFalseQuestion,
} from "@quizio/core/quiz/testing/a-question";
import { describe, expect, it } from "vitest";

import {
	createRememberedContents,
	typeChangeFor,
} from "./question-type-change";

const written = aQuestion({
	id: "q-1",
	selection: "multiple",
	choices: [
		{ id: "choice-1", text: "Sim", correct: true },
		{ id: "choice-2", text: "Não", correct: false },
		{ id: "choice-3", text: null, correct: false },
		{ id: "choice-4", text: null, correct: false },
		{ id: "choice-5", text: "Talvez", correct: true },
		{ id: "choice-6", text: null, correct: false },
	],
});

describe("typeChangeFor", () => {
	it("the same type sends nothing", () => {
		const remembered = createRememberedContents();

		expect(typeChangeFor(remembered, written, "quiz")).toBeNull();
	});

	it("the first change sends no remembered content", () => {
		const remembered = createRememberedContents();

		expect(typeChangeFor(remembered, written, "trueFalse")).toEqual({
			kind: "type",
			type: "trueFalse",
			remembered: null,
		});
	});

	it("going back sends what the question had, and the core restores it", () => {
		const remembered = createRememberedContents();
		const toTrueFalse = typeChangeFor(remembered, written, "trueFalse");
		const asTrueFalse = applyQuestionChange(
			written,
			toTrueFalse ?? { kind: "text", text: null },
		).question;

		const back = typeChangeFor(remembered, asTrueFalse, "quiz");

		expect(back).toEqual({
			kind: "type",
			type: "quiz",
			remembered: {
				type: "quiz",
				selection: "multiple",
				choices: written.choices,
			},
		});
		expect(
			applyQuestionChange(asTrueFalse, back ?? { kind: "text", text: null })
				.question,
		).toEqual(written);
	});

	it("the true/false answer comes back too", () => {
		const remembered = createRememberedContents();
		const statement = aTrueFalseQuestion({ id: "q-1", correct: false });
		typeChangeFor(remembered, statement, "quiz");

		expect(
			typeChangeFor(remembered, aQuestion({ id: "q-1" }), "trueFalse"),
		).toEqual({
			kind: "type",
			type: "trueFalse",
			remembered: { type: "trueFalse", correct: false },
		});
	});

	it("remembers the latest content of each type", () => {
		const remembered = createRememberedContents();
		typeChangeFor(remembered, written, "trueFalse");
		typeChangeFor(
			remembered,
			aTrueFalseQuestion({ id: "q-1", correct: true }),
			"quiz",
		);
		const edited = aQuestion({ id: "q-1" });

		typeChangeFor(remembered, edited, "trueFalse");

		expect(
			typeChangeFor(remembered, aTrueFalseQuestion({ id: "q-1" }), "quiz"),
		).toMatchObject({
			remembered: {
				type: "quiz",
				selection: "single",
				choices: edited.choices,
			},
		});
	});

	it("another question, such as a copy, has no remembered content", () => {
		const remembered = createRememberedContents();
		typeChangeFor(remembered, written, "trueFalse");
		const copy = aTrueFalseQuestion({ id: "copy-of-q-1" });

		expect(typeChangeFor(remembered, copy, "quiz")).toEqual({
			kind: "type",
			type: "quiz",
			remembered: null,
		});
	});
});
