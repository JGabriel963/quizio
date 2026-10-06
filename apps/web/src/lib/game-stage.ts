import type {
	AnswerCountPayload,
	StageChangedPayload,
} from "@quizio/core/game/domain/game-events";
import {
	GAME_PHASES,
	type GamePhase,
} from "@quizio/core/game/domain/game-progress";
import { HOST_AWAY_AFTER_MS } from "@quizio/core/game/domain/host-presence";
import { PODIUM_SIZE } from "@quizio/core/game/domain/podium";
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
	"Mamão com açúcar!",
	"É assim que se faz!",
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

/**
 * Where a question left the player (spec 010, RN-15): on the podium, or the
 * place and how far the player right ahead is.
 */
export function positionMessage(
	outcome: Pick<PlayerOutcomeData, "rank" | "behind">,
): { title: string; detail: string | null } {
	if (outcome.rank <= PODIUM_SIZE) {
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

const PODIUM_PHRASES: Record<number, string> = {
	1: "Imbatível!",
	2: "Por pouco!",
	3: "No pódio!",
};

/**
 * What the player reads at the end of the game (spec 011, RN-20, RN-21): the
 * medal and a phrase up to third place, the place itself from fourth on.
 */
export function finalMessage(rank: number): {
	medal: 1 | 2 | 3 | null;
	title: string;
	detail: string | null;
} {
	const phrase = PODIUM_PHRASES[rank];
	return phrase
		? { medal: rank as 1 | 2 | 3, title: phrase, detail: null }
		: {
				medal: null,
				title: `Você ficou em ${rank}º lugar`,
				detail: "Obrigado por jogar!",
			};
}

/** Past the instant itself, so the server's answer is already on the other side of it. */
const HOST_CHECK_MARGIN_MS = 250;

/**
 * How long a player's device waits before asking about its session again:
 * the usual `intervalMs`, or sooner when the host's silence (`hostIdleMs`, as
 * the server last told it) would reach the limit before that (spec 013,
 * RN-14). The device never decides by itself that the host is away: it asks
 * at the moment the server can tell.
 */
export function nextSessionCheckInMs(
	hostIdleMs: number | null,
	intervalMs: number,
): number {
	if (hostIdleMs === null || hostIdleMs >= HOST_AWAY_AFTER_MS) {
		return intervalMs;
	}
	return Math.min(
		intervalMs,
		HOST_AWAY_AFTER_MS - hostIdleMs + HOST_CHECK_MARGIN_MS,
	);
}
