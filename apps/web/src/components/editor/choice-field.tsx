import {
	CHOICE_TEXT_MAX_LENGTH,
	type Choice,
} from "@quizio/core/quiz/domain/question";
import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import { characterCount } from "@quizio/core/shared/domain/text-length";
import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { Checkbox } from "@quizio/ui/components/checkbox";
import { cn } from "@quizio/ui/lib/utils";
import { ImageIcon } from "lucide-react";
import { useId, useState } from "react";

import { answerPlaceholder, missingAnswerHint } from "@/lib/question-labels";
import { useDebouncedAutosave } from "@/lib/use-debounced-autosave";

import { AnswerImageField } from "./answer-image-field";
import { EditorHint } from "./editor-hint";
import { FormattedTextField, type SavedText } from "./formatted-text-field";

/**
 * Where an answer's formatting bar goes (spec 048, RN-01a): above the answers
 * of the first row, below the others so it does not cover the one above. The
 * second answer is in the first row only when the answers sit in two columns,
 * which the same container query decides.
 */
function toolbarPlacement(index: number): string | undefined {
	if (index === 0) {
		return undefined;
	}
	return index === 1
		? "top-full mt-2 @xl:top-auto @xl:bottom-full @xl:mt-0 @xl:mb-2"
		: "top-full mt-2";
}

/**
 * One answer block (spec 004): color and shape of its position, the autosaved
 * text capped at 75 characters with its formatting (spec 048), and the
 * "correct" mark, which an empty answer cannot have (RN-04, RN-06). The text
 * wraps and the block grows to show all of it; while it has the focus, the
 * formatting bar floats by it and the corner counts what is left, text only
 * (as Kahoot).
 */
export function ChoiceField({
	questionId,
	choice,
	index,
	hint,
	imageUrl = null,
	onSaveText,
	onCorrectChange,
	onPickImage,
	onImageChange,
}: {
	questionId: string;
	choice: Choice;
	index: number;
	/** Shows "A resposta N não foi adicionada" while the field is empty (RN-16). */
	hint: boolean;
	onSaveText: (answer: SavedText) => Promise<unknown>;
	onCorrectChange: (correct: boolean) => void;
	/** The public URL of the answer's image (spec 049). */
	imageUrl?: string | null;
	/** Opens the upload for this answer; without it there is no image button. */
	onPickImage?: () => void;
	/** Crop, alt text or removal of the answer's image. */
	onImageChange?: (change: QuestionChange) => void;
}) {
	const position = index + 1;
	const shape = answerShapeAt(index);
	const hintId = useId();
	const [focused, setFocused] = useState(false);
	const { value, setValue, flush } = useDebouncedAutosave({
		key: `question:${questionId}:choice:${choice.id}`,
		initialValue: {
			text: choice.text ?? "",
			formatting: choice.textFormatting,
		},
		save: ({ text, formatting }) =>
			onSaveText(
				text.trim() === ""
					? { text: null, formatting: {} }
					: { text, formatting },
			),
	});
	const { image } = choice;
	const filled = image !== null || value.text.trim() !== "";
	const showHint = hint && !filled;
	const answer = { choiceId: choice.id };
	// A text still on its way goes first: the image then replaces it (RN-07).
	const pickImage = onPickImage && (() => void flush().then(onPickImage));
	const left = CHOICE_TEXT_MAX_LENGTH - characterCount(value.text);

	return (
		<li className="relative flex flex-col">
			<div
				className={cn(
					"relative flex min-h-16 flex-1 items-center @4xl:gap-4 gap-3 rounded-md p-2 shadow-press-light transition-colors sm:min-h-[clamp(4.5rem,11svh,7rem)]",
					filled
						? [ANSWER_COLOR_CLASSES[shape], "text-answer-foreground"]
						: "bg-card",
				)}
			>
				<span
					className={cn(
						"flex min-h-12 @4xl:w-12 w-10 shrink-0 items-center justify-center self-stretch rounded-md text-answer-foreground",
						ANSWER_COLOR_CLASSES[shape],
					)}
				>
					<AnswerShape shape={shape} className="@4xl:size-7 size-5" />
				</span>
				{image ? (
					<AnswerImageField
						image={image}
						url={imageUrl}
						label={`Resposta ${position}`}
						onRemove={() =>
							onImageChange?.({ kind: "answerImage", answer, key: null })
						}
						onCrop={(crop) =>
							onImageChange?.({ kind: "answerImageCrop", answer, crop })
						}
						onAltText={(altText) =>
							onImageChange?.({ kind: "answerImageAltText", answer, altText })
						}
					/>
				) : (
					<FormattedTextField
						initialValue={{
							text: choice.text ?? "",
							formatting: choice.textFormatting,
						}}
						maxLength={CHOICE_TEXT_MAX_LENGTH}
						placeholder={answerPlaceholder(index)}
						label={`Resposta ${position}`}
						describedBy={showHint ? hintId : undefined}
						toolbarLabel={`Formatação da resposta ${position}`}
						toolbarClassName={toolbarPlacement(index)}
						className="flex-1"
						fieldClassName="wrap-break-word font-normal @4xl:text-lg outline-none"
						onChange={setValue}
						onFocusChange={setFocused}
						onBlur={() => void flush()}
						onImage={pickImage}
					/>
				)}
				{!filled && !focused && pickImage && (
					<button
						type="button"
						aria-label={`Adicionar imagem à resposta ${position}`}
						title="Adicione imagem como resposta alternativa"
						onClick={pickImage}
						className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						<ImageIcon aria-hidden="true" className="size-6" />
					</button>
				)}
				{focused && !image && (
					<span className="pointer-events-none absolute top-1 right-2 font-bold text-xs">
						<span aria-hidden="true">{left}</span>
						<span className="sr-only">{left} caracteres restantes</span>
					</span>
				)}
				<Checkbox
					variant="answer"
					aria-label={`Resposta ${position} correta`}
					checked={choice.correct}
					disabled={!filled}
					onCheckedChange={async (checked) => {
						// The answer must reach the server before it can be correct.
						await flush();
						onCorrectChange(checked);
					}}
					className={cn(
						"@4xl:mr-1 @4xl:size-11",
						!filled && (pickImage ? "hidden" : "invisible"),
					)}
				/>
			</div>
			{showHint && (
				<EditorHint id={hintId}>{missingAnswerHint(position)}</EditorHint>
			)}
		</li>
	);
}
