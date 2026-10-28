import { QUESTION_TEXT_MAX_LENGTH } from "@quizio/core/quiz/domain/question";
import {
	characterCount,
	truncateCharacters,
} from "@quizio/core/shared/domain/text-length";
import { Textarea } from "@quizio/ui/components/textarea";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { MISSING_QUESTION_TEXT_HINT } from "@/lib/question-labels";
import { useDebouncedAutosave } from "@/lib/use-debounced-autosave";

import { EditorHint } from "./editor-hint";

/**
 * Question text, autosaved and capped at the core's limit (spec 003, RN-10).
 * The characters left show in the corner while the field is focused, as in Kahoot.
 * A long question wraps and the box grows with it, as Kahoot's, up to a few
 * lines; past that it scrolls. It is one sentence: Enter adds no line break,
 * and the breaks of a pasted text become spaces.
 */
export function QuestionTextField({
	questionId,
	initialText,
	hint,
	tip,
	onSave,
}: {
	questionId: string;
	initialText: string | null;
	/** Shows "Nenhuma pergunta foi adicionada." while the field is empty. */
	hint: boolean;
	/** What to write, shown below while the field is edited (spec 033, RN-06). */
	tip?: string;
	onSave: (text: string | null) => Promise<unknown>;
}) {
	const hintId = useId();
	const tipId = useId();
	const [focused, setFocused] = useState(false);
	const { value, setValue, flush } = useDebouncedAutosave({
		key: `question:${questionId}:text`,
		initialValue: initialText ?? "",
		save: (text: string) => onSave(text.trim() === "" ? null : text),
	});
	const count = characterCount(value);
	const remaining = QUESTION_TEXT_MAX_LENGTH - count;

	const showHint = hint && value.trim() === "";
	const field = useRef<HTMLTextAreaElement>(null);

	// Grows with the text; `max-h-*` stops it and the rest scrolls.
	// biome-ignore lint/correctness/useExhaustiveDependencies: measured again on each text.
	useLayoutEffect(() => {
		fitToText(field.current);
	}, [value]);
	// And again when its width changes (a panel opened, the window resized)
	// or the font arrives, which change how many lines the text takes.
	useEffect(() => {
		const box = field.current;
		if (!box) {
			return;
		}
		let width = box.clientWidth;
		const observer =
			typeof ResizeObserver === "undefined"
				? null
				: new ResizeObserver(() => {
						if (box.clientWidth !== width) {
							width = box.clientWidth;
							fitToText(box);
						}
					});
		observer?.observe(box);
		void document.fonts?.ready.then(() => fitToText(box));
		return () => observer?.disconnect();
	}, []);

	return (
		<div className="relative flex w-full min-w-0 flex-1 flex-col">
			<div className="relative w-full">
				<Textarea
					ref={field}
					rows={1}
					aria-label="Pergunta"
					aria-describedby={
						[showHint && hintId, tip && focused && tipId]
							.filter(Boolean)
							.join(" ") || undefined
					}
					placeholder="Comece a digitar a pergunta"
					value={value}
					onChange={(event) =>
						setValue(
							truncateCharacters(
								event.target.value.replace(/\r?\n/g, " "),
								QUESTION_TEXT_MAX_LENGTH,
							),
						)
					}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
						}
					}}
					onFocus={() => setFocused(true)}
					onBlur={() => {
						setFocused(false);
						void flush();
					}}
					className="field-sizing-fixed block max-h-36 min-h-0 overflow-y-auto rounded-md border-0 bg-card px-4 py-4 text-center font-bold text-lg leading-snug shadow-press-light sm:max-h-44 sm:px-12 sm:text-2xl xl:max-h-52 xl:py-5 xl:text-3xl"
				/>
				{focused && (
					<span className="pointer-events-none absolute top-1.5 right-2.5 font-semibold text-muted-foreground text-xs">
						<span aria-hidden="true">{remaining}</span>
						<span className="sr-only">{`${remaining} caracteres restantes`}</span>
					</span>
				)}
			</div>
			{tip && focused && (
				<p
					id={tipId}
					className="absolute top-full left-1/2 z-10 mt-1.5 w-max max-w-sm -translate-x-1/2 rounded-md bg-foreground px-3 py-2 font-semibold text-background text-xs shadow-md"
				>
					{tip}
				</p>
			)}
			{showHint && (
				<EditorHint id={hintId}>{MISSING_QUESTION_TEXT_HINT}</EditorHint>
			)}
		</div>
	);
}

/** The box as tall as its text; CSS caps it and scrolls the rest. */
function fitToText(box: HTMLTextAreaElement | null) {
	if (box) {
		box.style.height = "auto";
		box.style.height = `${box.scrollHeight}px`;
	}
}
