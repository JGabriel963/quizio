import {
	blankQuestion,
	type PuzzleQuestion,
	type Question,
	type QuizQuestion,
	type SliderQuestion,
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
		textFormatting: {},
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
		text: "Qual o nome do personagem que andou sobre as águas?",
		acceptedAnswers: ["Pedro"],
		...overrides,
	};
}

/** Test builder: a complete slider, 100 to 900 with 600 as the answer (spec 032). */
export function aSliderQuestion(
	overrides: Partial<SliderQuestion> = {},
): SliderQuestion {
	return {
		...blankQuestion(overrides.id ?? "question-1", "slider"),
		text: "Quantos anos tinha Noé quando o dilúvio acabou?",
		min: 100,
		max: 900,
		answer: 600,
		unit: "anos",
		...overrides,
	};
}

/** Test builder: a complete puzzle of four rivers, in the right order (spec 033). */
export function aPuzzleQuestion(
	overrides: Partial<PuzzleQuestion> = {},
): PuzzleQuestion {
	return {
		...blankQuestion(overrides.id ?? "question-1", "puzzle"),
		text: "Coloque estes rios do maior para o menor",
		items: ["Nilo", "Amazonas", "Yangtzé", "Mississipi"],
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

/** Narrows a question a test knows to be a slider. */
export function asSlider(question: Question | undefined): SliderQuestion {
	if (question?.type !== "slider") {
		throw new Error(`Expected a slider question, got ${question?.type}`);
	}
	return question;
}

/** Narrows a question a test knows to be a puzzle. */
export function asPuzzle(question: Question | undefined): PuzzleQuestion {
	if (question?.type !== "puzzle") {
		throw new Error(`Expected a puzzle question, got ${question?.type}`);
	}
	return question;
}
