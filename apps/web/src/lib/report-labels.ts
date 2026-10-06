import type { AnswerResultData } from "./api-types";

/** PT-BR texts and formats of the reports (spec 015). */

/** The sentence over the overall accuracy, by band (RN-35). */
export function summaryHeadline(accuracyPercent: number): string {
	if (accuracyPercent >= 80) {
		return "Excelente resultado!";
	}
	return accuracyPercent >= 50
		? "Bom trabalho!"
		: "A prática leva à perfeição!";
}

/** "38%", or a dash when there was nothing to answer (RN-16). */
export function percentLabel(percent: number | null): string {
	return percent === null ? "—" : `${percent}%`;
}

/** The game's time in whole minutes (RN-21). */
export function durationLabel(ms: number): string {
	const minutes = Math.floor(ms / 60_000);
	return minutes < 1 ? "menos de 1 min" : `${minutes} min`;
}

function seconds(ms: number, digits: number): string {
	return `${(ms / 1000).toLocaleString("pt-BR", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	})} s`;
}

/** A question's average response time: "4,86 s" (RN-21). */
export function averageTimeLabel(ms: number | null): string {
	return ms === null ? "—" : seconds(ms, 2);
}

/** One answer's time: "3,2 s". */
export function responseTimeLabel(ms: number | null): string {
	return ms === null ? "—" : seconds(ms, 1);
}

/**
 * "13 de jun. de 2026, 17:45", in the device's time zone (RN-56). Dates
 * arrive as ISO strings; the zone is only given by tests.
 */
export function reportDateLabel(
	date: string | Date,
	timeZone?: string,
): string {
	return new Intl.DateTimeFormat("pt-BR", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone,
	}).format(new Date(date));
}

/** Told in text everywhere: never by color alone (RN-55). */
export const RESULT_LABELS: Record<AnswerResultData, string> = {
	correct: "Correta",
	partiallyCorrect: "Parcialmente correta",
	wrong: "Incorreta",
	unanswered: "Sem resposta",
};

/** "15", or "7 de 15" for a game that ended before its last question (RN-36). */
export function playedQuestionsLabel(played: number, total: number): string {
	return played === total ? `${played}` : `${played} de ${total}`;
}

export function unansweredLabel(count: number): string {
	return `${count} ${count === 1 ? "pergunta" : "perguntas"} sem resposta`;
}

export function participantCountLabel(count: number): string {
	return `${count} ${count === 1 ? "participante" : "participantes"}`;
}

/** The explanations behind each "?" of the summary, in Kahoot's words. */
export const DIFFICULT_QUESTIONS_HELP =
	"Uma pergunta é considerada difícil quando menos de 35% dos participantes acerta a resposta";
export const NEEDS_HELP_HELP =
	"Essa seção destaca os participantes que acertaram menos de 35% das respostas no jogo inteiro";
export const DID_NOT_FINISH_HELP =
	"Os participantes com perguntas não concluídas não enviaram uma resposta a tempo ou saíram do jogo antes de concluir";
