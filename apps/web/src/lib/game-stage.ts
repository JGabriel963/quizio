import type {
	AnswerCountPayload,
	StageChangedPayload,
} from "@quizio/core/game/domain/game-events";
import {
	GAME_PHASES,
	type GamePhase,
} from "@quizio/core/game/domain/game-progress";
import {
	type AnswerShapeName,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";

import type { HostGameData, PlayerOutcomeData } from "./api-types";

/** A stage, as far as ordering goes. */
interface StagePosition {
	questionIndex: number;
	phase: GamePhase;
}

/** Stages only go forward: a later question, or a later phase of the same one. */
export function stageOrder(stage: StagePosition): number {
	return (
		stage.questionIndex * GAME_PHASES.length + GAME_PHASES.indexOf(stage.phase)
	);
}

/**
 * Whether the host's view already shows what a `stage-changed` event tells.
 * When it does not, the screen asks the server again: the event carries only
 * the public part of the stage (spec 009, RN-21).
 */
export function showsStage(
	view: HostGameData,
	event: StageChangedPayload,
): boolean {
	if (view.status !== event.status) {
		return false;
	}
	if (!event.stage || !view.stage) {
		return event.stage === null && view.stage === null;
	}
	return stageOrder(view.stage) >= stageOrder(event.stage);
}

/** The total of answers only grows, and only for the question on screen. */
export function applyAnswerCount(
	view: HostGameData,
	event: AnswerCountPayload,
): HostGameData {
	const { stage } = view;
	if (
		!stage ||
		stage.questionIndex !== event.questionIndex ||
		stage.phase !== "answering" ||
		event.count <= stage.answerCount
	) {
		return view;
	}
	return { ...view, stage: { ...stage, answerCount: event.count } };
}

/** What the player reads while waiting for the results (spec 009, RN-19). */
export const WAITING_PHRASES = [
	"Resposta recebida!",
	"Será que acertou?",
	"A competitividade está no ar?",
] as const;

/** One phrase per question, so it does not change while the player waits. */
export function waitingPhrase(questionIndex: number): string {
	return WAITING_PHRASES[questionIndex % WAITING_PHRASES.length] as string;
}

const SHAPE_NAMES: Record<AnswerShapeName, string> = {
	triangle: "Triângulo vermelho",
	diamond: "Losango azul",
	circle: "Círculo amarelo",
	square: "Quadrado verde",
	pentagon: "Pentágono verde-água",
	"inverted-triangle": "Triângulo invertido roxo",
};

/** How a screen reader names an answer button that shows only color and shape (RN-14). */
export function answerShapeName(shapeIndex: number): string {
	return SHAPE_NAMES[answerShapeAt(shapeIndex)];
}

/** How many places the podium has (spec 010, RN-15). */
const PODIUM_PLACES = 3;

/**
 * Where a question left the player (spec 010, RN-15): on the podium, or the
 * place and how far the player right ahead is.
 */
export function positionMessage(
	outcome: Pick<PlayerOutcomeData, "rank" | "behind">,
): { title: string; detail: string | null } {
	if (outcome.rank <= PODIUM_PLACES) {
		return { title: "Você está no pódio!", detail: null };
	}
	const { behind } = outcome;
	return {
		title: `Você está em ${outcome.rank}º lugar`,
		detail: behind
			? `${behind.points} ${behind.points === 1 ? "ponto" : "pontos"} atrás de ${behind.nickname}`
			: null,
	};
}
