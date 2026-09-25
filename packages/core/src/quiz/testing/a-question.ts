import type { Question } from "../domain/question";

/** Test builder: a quiz question with some text. */
export function aQuestion(overrides: Partial<Question> = {}): Question {
	return {
		id: "question-1",
		type: "quiz",
		text: "Qual é a capital do Brasil?",
		...overrides,
	};
}
