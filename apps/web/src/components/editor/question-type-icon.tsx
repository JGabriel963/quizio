import type { QuestionType } from "@quizio/core/quiz/domain/question";
import { cn } from "@quizio/ui/lib/utils";

/** Answer blocks of each type, in the order they appear in the question. */
const BLOCKS: Record<QuestionType, readonly string[]> = {
	quiz: [
		"bg-answer-red",
		"bg-answer-blue",
		"bg-answer-yellow",
		"bg-answer-green",
	],
	trueFalse: ["bg-answer-blue", "bg-answer-red"],
};

/** A small card with the type's answer blocks, as in Kahoot's type picker (spec 005, RN-02). */
export function QuestionTypeIcon({
	type,
	className,
}: {
	type: QuestionType;
	className?: string;
}) {
	return (
		<span
			aria-hidden="true"
			data-slot="question-type-icon"
			className={cn(
				"grid h-9 w-7 grid-cols-2 gap-0.5 rounded-sm border-2 border-foreground/80 bg-card p-0.5",
				className,
			)}
		>
			{BLOCKS[type].map((color) => (
				<span key={color} className={cn("rounded-[1px]", color)} />
			))}
		</span>
	);
}
