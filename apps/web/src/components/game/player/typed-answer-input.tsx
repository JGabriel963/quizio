import { TYPED_ANSWER_MAX_LENGTH } from "@quizio/core/game/domain/answer";
import {
	characterCount,
	truncateCharacters,
} from "@quizio/core/shared/domain/text-length";
import { Button } from "@quizio/ui/components/button";
import { useState } from "react";

/**
 * The answer of a type answer on a device (spec 031, RN-17): a blue field
 * with what still fits, and "Enviar", which waits for something besides
 * spaces. Enter sends too. `initialText` gives back an answer that was not sent.
 */
export function TypedAnswerInput({
	initialText = "",
	onSubmit,
}: {
	initialText?: string;
	onSubmit: (text: string) => void;
}) {
	const [text, setText] = useState(initialText);
	const left = TYPED_ANSWER_MAX_LENGTH - characterCount(text);
	const ready = text.trim() !== "";

	return (
		<form
			className="flex w-full flex-col items-center gap-3"
			onSubmit={(event) => {
				event.preventDefault();
				if (ready) {
					onSubmit(text.trim());
				}
			}}
		>
			<div className="relative w-full rounded-md bg-answer-blue px-4 py-5 text-answer-foreground shadow-press">
				<input
					aria-label="Sua resposta"
					// The keyboard opens over the bottom: keep the field in sight.
					onFocus={(event) =>
						event.currentTarget.scrollIntoView?.({ block: "center" })
					}
					value={text}
					onChange={(event) =>
						setText(
							truncateCharacters(event.target.value, TYPED_ANSWER_MAX_LENGTH),
						)
					}
					placeholder="Digite sua resposta aqui"
					autoComplete="off"
					autoCapitalize="off"
					spellCheck={false}
					enterKeyHint="send"
					className="w-full bg-transparent text-center font-black text-2xl outline-none placeholder:text-answer-foreground/80"
				/>
				<span className="absolute top-1.5 right-2.5 font-bold text-sm">
					<span aria-hidden="true">{left}</span>
					<span className="sr-only">{left} caracteres restantes</span>
				</span>
			</div>
			<Button type="submit" variant="secondary" size="lg" disabled={!ready}>
				Enviar
			</Button>
		</form>
	);
}
