import type { QuestionType } from "@quizio/core/quiz/domain/question";

/** What the type picker shows beside a type the creator points at (spec 031, RN-01). */
export interface QuestionTypePreview {
	/** A question of the type, as an example. */
	example: string;
	/** What the example's answer area shows. */
	answers: readonly string[];
	/** One line on what the type does, as in Kahoot. */
	description: string;
}

export const QUESTION_TYPE_PREVIEWS: Record<QuestionType, QuestionTypePreview> =
	{
		quiz: {
			example: "Qual é a capital do Brasil?",
			answers: ["Brasília", "Rio de Janeiro", "Salvador", "Recife"],
			description:
				"Faça uma pergunta com respostas certas e erradas para os participantes escolherem.",
		},
		trueFalse: {
			example: "A Lua é maior que a Terra.",
			answers: ["Verdadeiro", "Falso"],
			description:
				"Peça aos participantes para dizerem se uma afirmação é verdadeira ou falsa.",
		},
		typeAnswer: {
			example: "Qual é o rio mais extenso do mundo?",
			answers: ["Nilo"],
			description: "Peça aos participantes para digitarem uma resposta curta.",
		},
		slider: {
			example: "Qual é a altura do Monte Everest?",
			answers: ["8.849 m"],
			description:
				"Deixe os participantes adivinharem o número no controle deslizante.",
		},
		puzzle: {
			example: "Ordene do menos ao mais populoso",
			answers: ["EUA", "Itália", "Egito", "Espanha"],
			description:
				"Peça que os participantes coloquem as respostas na ordem certa.",
		},
	};
