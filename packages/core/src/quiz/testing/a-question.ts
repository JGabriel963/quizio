import {
	blankQuestion,
	type Question,
	type QuizQuestion,
	type TrueFalseQuestion,
} from "../domain/question";

/** Test builder: a quiz question with some text and the blank defaults. */
export function aQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
	return {
		...blankQuestion(overrides.id ?? "question-1"),
		text: "Qual é a capital do Brasil?",
		...overrides,
	};
}

/** Test builder: a true/false question with some text and nothing marked. */
export function aTrueFalseQuestion(
	overrides: Partial<TrueFalseQuestion> = {},
): TrueFalseQuestion {
	return {
		id: "question-1",
		type: "trueFalse",
		text: "A capital do Brasil é Brasília",
		timeLimitSeconds: 20,
		points: "standard",
		image: null,
		correct: null,
		...overrides,
	};
}

/** Narrows a question a test knows to be a quiz one. */
export function asQuiz(question: Question | undefined): QuizQuestion {
	if (question?.type !== "quiz") {
		throw new Error(`Expected a quiz question, got ${question?.type}`);
	}
	return question;
}

/** Narrows a question a test knows to be a true/false one. */
export function asTrueFalse(question: Question | undefined): TrueFalseQuestion {
	if (question?.type !== "trueFalse") {
		throw new Error(`Expected a true/false question, got ${question?.type}`);
	}
	return question;
}
