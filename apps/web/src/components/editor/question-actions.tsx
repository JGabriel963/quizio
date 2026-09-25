import { QUIZ_MAX_QUESTIONS } from "@quizio/core/quiz/domain/question-list";
import { Button } from "@quizio/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { type ComponentProps, useId } from "react";

export const LAST_QUESTION_REASON = "Não é possível excluir todo o conteúdo";
export const QUESTION_LIMIT_REASON = `Limite de ${QUIZ_MAX_QUESTIONS} perguntas atingido`;

/** Why deleting or growing the list is unavailable (spec 003, RN-15, RN-16). */
export function questionActionReasons(questionCount: number) {
	return {
		deleteReason: questionCount <= 1 ? LAST_QUESTION_REASON : null,
		growReason:
			questionCount >= QUIZ_MAX_QUESTIONS ? QUESTION_LIMIT_REASON : null,
	};
}

/**
 * A button that, when unavailable, stays focusable and explains why: in a
 * tooltip on hover and focus, and as its accessible description.
 */
export function ActionButton({
	unavailableReason,
	...props
}: ComponentProps<typeof Button> & { unavailableReason: string | null }) {
	const reasonId = useId();

	if (!unavailableReason) {
		return <Button {...props} />;
	}
	return (
		<>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							{...props}
							onClick={undefined}
							disabled
							focusableWhenDisabled
							aria-describedby={reasonId}
						/>
					}
				/>
				<TooltipContent>{unavailableReason}</TooltipContent>
			</Tooltip>
			<span id={reasonId} hidden>
				{unavailableReason}
			</span>
		</>
	);
}
