import type { QuestionType, SelectionMode } from "../../quiz/domain/question";
import {
	type GamePhase,
	type PlayingGame,
	phaseDurationMs,
} from "./game-progress";
import type { GameQuestion } from "./game-question";

/** What a player's device needs to draw one answer button. */
export interface PublicChoice {
	id: string;
	shapeIndex: number;
	/** Only true/false buttons are named (spec 009, RN-15). */
	label: string | null;
}

/**
 * The part of a stage that every device may know, and that travels in the
 * game's public channel: no question text, no answer texts, no correct answer
 * and no count per answer (spec 009, RN-14, RN-21).
 */
export interface PublicStage {
	questionIndex: number;
	questionCount: number;
	phase: GamePhase;
	/** How long the phase lasts in all; null for the results. */
	durationMs: number | null;
	/** Null during the game intro. */
	question: {
		type: QuestionType;
		selection: SelectionMode;
		choices: PublicChoice[];
	} | null;
}

export function publicStageOf(
	game: PlayingGame,
	/** The question of the stage; none is needed for the game intro. */
	question: GameQuestion | null,
): PublicStage {
	const { questionIndex, phase } = game.progress;
	const shown = phase === "gameIntro" ? null : question;
	return {
		questionIndex,
		questionCount: game.questionCount,
		phase,
		durationMs: phaseDurationMs(phase, question?.timeLimitSeconds ?? 0),
		question: shown && {
			type: shown.type,
			selection: shown.selection,
			choices: shown.choices.map((choice) => ({
				id: choice.id,
				shapeIndex: choice.shapeIndex,
				label: shown.type === "trueFalse" ? choice.text : null,
			})),
		},
	};
}
