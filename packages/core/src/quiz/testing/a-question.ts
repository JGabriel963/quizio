import {
	blankQuestion,
	type Question,
	type QuizQuestion,
	type TrueFalseQuestion,
	type TypeAnswerQuestion,
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
		aiGenerated: false,
		correct: null,
		...overrides,
	};
}

/** Test builder: a type answer question with some text and one accepted answer. */
export function aTypeAnswerQuestion(
	overrides: Partial<TypeAnswerQuestion> = {},
): TypeAnswerQuestion {
	return {
		...blankQuestion(overrides.id ?? "question-1", "typeAnswer"),
		text: "Qual o nome do personagem que andou sobre as Ã¡guas?",
		acceptedAnswers: ["Pedro"],
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

/** Narrows a question a test knows to be a type answer one. */
export function asTypeAnswer(
	question: Question | undefined,
): TypeAnswerQuestion {
	if (question?.type !== "typeAnswer") {
		throw new Error(`Expected a type answer question, got ${question?.type}`);
	}
	return question;
}
