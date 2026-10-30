import { NO_FORMATTING } from "../../shared/domain/text-formatting";
import { fitTimeLimit, parseQuestionType, type Question } from "./question";
import { buildQuestion, type QuestionDraft } from "./question-draft";
import type { QuestionImage } from "./question-image";

/**
 * A change to a whole question as an agent sends it (spec 044, RN-21): every
 * field optional, and only the ones sent change. A list (answers, accepted
 * answers, puzzle items) is replaced whole; the slider's fields merge.
 */
export type QuestionPatch = Partial<QuestionDraft>;

function imageDraftOf(image: QuestionImage | null): QuestionDraft["image"] {
	return image
		? {
				key: image.key,
				placement: image.placement,
				crop: image.crop,
				altText: image.altText,
			}
		: null;
}

/** The question as a draft, which builds it again unchanged. */
export function draftOf(question: Question): QuestionDraft {
	const shared = {
		type: question.type,
		text: question.text,
		textFormatting: question.textFormatting,
		timeLimitSeconds: question.timeLimitSeconds,
		points: question.points,
		image: imageDraftOf(question.image),
	};
	switch (question.type) {
		case "quiz":
			return {
				...shared,
				selection: question.selection,
				choices: question.choices.map(
					({ text, textFormatting, image, correct }) => ({
						text,
						textFormatting,
						image,
						correct,
					}),
				),
			};
		case "trueFalse":
			return { ...shared, correct: question.correct };
		case "typeAnswer":
			return { ...shared, acceptedAnswers: [...question.acceptedAnswers] };
		case "slider":
			return {
				...shared,
				slider: {
					min: question.min,
					max: question.max,
					answer: question.answer,
					unit: question.unit,
					answerMargin: question.answerMargin,
				},
			};
		case "puzzle":
			return {
				...shared,
				items: [...question.items],
				itemFormatting: [...question.itemFormatting],
				itemImages: [...question.itemImages],
			};
	}
}

/**
 * What is left after the type changes: the statement, the points and the
 * image stay, the time fits the new type, and the answers start blank unless
 * the patch brings them (as the editor's type change, spec 005).
 */
function draftForType(current: Question, type: string): QuestionDraft {
	return {
		type,
		text: current.text,
		textFormatting: current.textFormatting,
		timeLimitSeconds: fitTimeLimit(
			parseQuestionType(type),
			current.timeLimitSeconds,
		),
		points: current.points,
		image: imageDraftOf(current.image),
	};
}

/** Only the fields that were sent: a missing one keeps what the question has. */
function sentFields<T extends object>(fields: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(fields).filter(([, value]) => value !== undefined),
	) as Partial<T>;
}

/**
 * The question with the patch applied through the editor's rules, under the
 * same id and keeping whether it was made with AI (spec 044, RN-21; CA-14).
 */
export function patchedQuestion(
	current: Question,
	patch: QuestionPatch,
): Question {
	const typeChanged = patch.type !== undefined && patch.type !== current.type;
	const base = typeChanged
		? draftForType(current, patch.type as string)
		: draftOf(current);
	const draft: QuestionDraft = {
		...base,
		...sentFields(patch),
		type: patch.type ?? base.type,
		// A statement sent replaces the old one whole, with its own formatting or none (spec 047, RN-29).
		textFormatting:
			patch.text !== undefined
				? (patch.textFormatting ?? NO_FORMATTING)
				: base.textFormatting,
		// Puzzle answers sent replace the old ones whole, likewise (spec 048, RN-23).
		itemFormatting:
			patch.items !== undefined ? patch.itemFormatting : base.itemFormatting,
		// And their images (spec 049).
		itemImages: patch.items !== undefined ? patch.itemImages : base.itemImages,
		slider:
			patch.slider !== undefined
				? { ...base.slider, ...sentFields(patch.slider) }
				: base.slider,
		// New answers without a selection: it follows how many are correct.
		selection:
			patch.selection ??
			(patch.choices !== undefined ? undefined : base.selection),
	};
	return buildQuestion(draft, current.id, current.aiGenerated);
}
