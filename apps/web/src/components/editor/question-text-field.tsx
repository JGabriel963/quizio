import { QUESTION_TEXT_MAX_LENGTH } from "@quizio/core/quiz/domain/question";
import {
	characterCount,
	truncateCharacters,
} from "@quizio/core/shared/domain/text-length";
import { Input } from "@quizio/ui/components/input";

import { useDebouncedAutosave } from "@/lib/use-debounced-autosave";

/** The counter appears once the text gets close to the limit. */
const SHOW_REMAINING_FROM = 100;

/** Question text, autosaved and capped at 120 characters (spec 003, RN-10). */
export function QuestionTextField({
	questionId,
	initialText,
	onSave,
}: {
	questionId: string;
	initialText: string | null;
	onSave: (text: string | null) => Promise<unknown>;
}) {
	const { value, setValue, flush } = useDebouncedAutosave({
		key: `question:${questionId}:text`,
		initialValue: initialText ?? "",
		save: (text: string) => onSave(text.trim() === "" ? null : text),
	});
	const count = characterCount(value);
	const remaining = QUESTION_TEXT_MAX_LENGTH - count;

	return (
		<div className="relative w-full">
			<Input
				aria-label="Pergunta"
				placeholder="Comece a digitar a pergunta"
				value={value}
				onChange={(event) =>
					setValue(
						truncateCharacters(event.target.value, QUESTION_TEXT_MAX_LENGTH),
					)
				}
				onBlur={() => void flush()}
				className="h-auto rounded-md border-0 bg-card px-4 py-4 text-center font-bold text-lg shadow-press-light sm:px-12 sm:text-2xl"
			/>
			{count >= SHOW_REMAINING_FROM && (
				<span className="absolute top-1/2 right-3 -translate-y-1/2 font-bold text-muted-foreground text-sm">
					<span aria-hidden="true">{remaining}</span>
					<span className="sr-only">{`${remaining} caracteres restantes`}</span>
				</span>
			)}
		</div>
	);
}
