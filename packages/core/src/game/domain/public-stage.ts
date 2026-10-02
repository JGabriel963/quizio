import type { QuestionType, SelectionMode } from "../../quiz/domain/question";
import type { ImageCrop } from "../../quiz/domain/question-image";
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
	/** Only with the questions on the devices, once the answers open (spec 012, RN-18). */
	text: string | null;
}

/** The question's image as a device draws it: an address, never a key (ADR 0003). */
export interface PublicImage {
	url: string;
	crop: ImageCrop | null;
	altText: string | null;
}

/**
 * The part of a stage that every device may know, and that travels in the
 * game's public channel: never the correct answer nor the count per answer
 * (spec 009, RN-21). The question's text, its image and the answer texts go
 * only when the host turned "Mostrar perguntas nos dispositivos" on (spec
 * 012, RN-18 to RN-20): they are on the projected screen anyway.
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
		/** The statement; null with the questions off the devices. */
		text: string | null;
		/** Null with the questions off the devices and before the answers open. */
		image: PublicImage | null;
		choices: PublicChoice[];
	} | null;
}

export function publicStageOf(
	game: PlayingGame,
	/** The question of the stage; none is needed for the game intro. */
	question: GameQuestion | null,
	/** Turns the key of an image into its public address. */
	imageUrlOf: (key: string) => string,
): PublicStage {
	const { questionIndex, phase } = game.progress;
	const shown = phase === "gameIntro" ? null : question;
	const onDevices = game.options.showQuestionsOnDevices;
	// The intro shows the statement alone, as the host's screen does (RN-18a).
	const answersShown = onDevices && phase !== "questionIntro";
	return {
		questionIndex,
		questionCount: game.questionCount,
		phase,
		durationMs: phaseDurationMs(phase, question?.timeLimitSeconds ?? 0),
		question: shown && {
			type: shown.type,
			selection: shown.selection,
			text: onDevices ? shown.text : null,
			image:
				answersShown && shown.image
					? {
							url: imageUrlOf(shown.image.key),
							crop: shown.image.crop,
							altText: shown.image.altText,
						}
					: null,
			choices: shown.choices.map((choice) => ({
				id: choice.id,
				shapeIndex: choice.shapeIndex,
				label: shown.type === "trueFalse" ? choice.text : null,
				text: answersShown ? choice.text : null,
			})),
		},
	};
}
