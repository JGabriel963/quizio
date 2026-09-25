import { QUIZ_TITLE_MAX_LENGTH } from "@quizio/core/quiz/domain/quiz-details";
import { truncateCharacters } from "@quizio/core/shared/domain/text-length";
import { Input } from "@quizio/ui/components/input";

import { useDebouncedAutosave } from "@/lib/use-debounced-autosave";

/** Title typed straight in the editor header, autosaved (spec 003, RN-18). */
export function QuizTitleField({
	initialTitle,
	onSave,
}: {
	initialTitle: string | null;
	onSave: (title: string | null) => Promise<unknown>;
}) {
	const { value, setValue, flush } = useDebouncedAutosave({
		key: "quiz:title",
		initialValue: initialTitle ?? "",
		save: (title: string) => onSave(title.trim() === "" ? null : title),
	});

	return (
		<Input
			aria-label="Título do quiz"
			placeholder="Inserir título do quiz…"
			value={value}
			onChange={(event) =>
				setValue(truncateCharacters(event.target.value, QUIZ_TITLE_MAX_LENGTH))
			}
			onBlur={() => void flush()}
			className="h-9 w-40 min-w-0 border-0 bg-transparent font-semibold shadow-none sm:w-64"
		/>
	);
}
