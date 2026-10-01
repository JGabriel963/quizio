import { blankQuestion, type Question } from "../domain/question";

/** Test builder: a quiz question with some text and the blank defaults. */
export function aQuestion(overrides: Partial<Question> = {}): Question {
	return {
		...blankQuestion(overrides.id ?? "question-1"),
		text: "Qual é a capital do Brasil?",
		...overrides,
	};
}
