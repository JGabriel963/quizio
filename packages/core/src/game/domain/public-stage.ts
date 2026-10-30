import type { AnswerImage } from "../../quiz/domain/answer-image";
import type { QuestionType, SelectionMode } from "../../quiz/domain/question";
import type {
	ImageCrop,
	ImagePlacement,
} from "../../quiz/domain/question-image";
import {
	firstPosition,
	lastPosition,
	sliderStep,
	startPosition,
} from "../../shared/domain/slider-scale";
import {
	NO_FORMATTING,
	type TextFormatting,
} from "../../shared/domain/text-formatting";
import {
	type GamePhase,
	type PlayingGame,
	phaseDurationMs,
} from "./game-progress";
import type { GameQuestion, GameSlider } from "./game-question";

/** What a player's device needs to draw one answer button. */
export interface PublicChoice {
	id: string;
	shapeIndex: number;
	/** Only true/false buttons are named (spec 009, RN-15). */
	label: string | null;
	/** Only with the questions on the devices, once the answers open (spec 012, RN-18). */
	text: string | null;
	/** Its marked stretches; none without the text (spec 048, RN-19). */
	textFormatting: TextFormatting;
	/** An image answer, only when the texts would be shown (spec 049, RN-23). */
	image: AnswerImageView | null;
}

/** An answer's image as a screen draws it (spec 049): the URL, never the key. */
export interface AnswerImageView {
	url: string;
	crop: ImageCrop | null;
	altText: string | null;
}

/** The view of an answer's image, with its URL built by the server. */
export function answerImageView(
	image: AnswerImage | null,
	imageUrlOf: (key: string) => string,
): AnswerImageView | null {
	return image
		? { url: imageUrlOf(image.key), crop: image.crop, altText: image.altText }
		: null;
}

/**
 * What a device needs to draw a slider (spec 032, RN-23 to RN-25): the labels
 * of the limit buttons, the ends, the step, where the marker starts and the
 * unit. Never the answer nor the margin; the ends and the step tell only that
 * the answer is one of the positions.
 */
export interface PublicSliderScale {
	min: number;
	max: number;
	first: number;
	last: number;
	step: number;
	start: number;
	unit: string | null;
}

export function publicSliderScale(slider: GameSlider): PublicSliderScale {
	return {
		min: slider.min,
		max: slider.max,
		first: firstPosition(slider),
		last: lastPosition(slider),
		step: sliderStep(slider.min, slider.max),
		start: startPosition(slider),
		unit: slider.unit,
	};
}

/** The question's image as a device draws it: an address, never a key (ADR 0003). */
export interface PublicImage {
	url: string;
	/** In the middle or behind the whole screen, as on the host's (spec 012, RN-20). */
	placement: ImagePlacement;
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
		/** Its marked stretches; none without the statement (spec 047, RN-25). */
		textFormatting: TextFormatting;
		/** Null with the questions off the devices and before the answers open. */
		image: PublicImage | null;
		choices: PublicChoice[];
		/** A slider's scale, from the answers on, with the questions on the devices or not (RN-27). */
		slider: PublicSliderScale | null;
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
			textFormatting: onDevices ? shown.textFormatting : NO_FORMATTING,
			image:
				answersShown && shown.image
					? {
							url: imageUrlOf(shown.image.key),
							placement: shown.image.placement,
							crop: shown.image.crop,
							altText: shown.image.altText,
						}
					: null,
			choices: shown.choices.map((choice) => ({
				id: choice.id,
				shapeIndex: choice.shapeIndex,
				label: shown.type === "trueFalse" ? choice.text : null,
				text: answersShown ? choice.text : null,
				textFormatting: answersShown ? choice.textFormatting : NO_FORMATTING,
				image: answersShown ? answerImageView(choice.image, imageUrlOf) : null,
			})),
			slider:
				shown.slider && phase !== "questionIntro"
					? publicSliderScale(shown.slider)
					: null,
		},
	};
}
