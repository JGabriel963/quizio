import type { QuestionType } from "@quizio/core/quiz/domain/question";
import { cn } from "@quizio/ui/lib/utils";

/** Answer blocks of each type, in the order they appear in the question. */
const BLOCKS: Record<Exclude<QuestionType, "typeAnswer">, readonly string[]> = {
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
	if (type === "typeAnswer") {
		// A phone with a text field and a keyboard, as in Kahoot's picker (spec 031).
		return (
			<span
				aria-hidden="true"
				data-slot="question-type-icon"
				className={cn(
					"flex h-9 w-7 flex-col gap-0.5 rounded-sm border-2 border-foreground/80 bg-card p-0.5",
					className,
				)}
			>
				<span className="flex h-3 items-center justify-center rounded-[1px] bg-answer-blue font-black text-[8px] text-white leading-none before:content-['T']" />
				<span className="grid flex-1 grid-cols-3 gap-px">
					{["a", "b", "c", "d", "e", "f"].map((key) => (
						<span key={key} className="rounded-[1px] bg-foreground/25" />
					))}
				</span>
			</span>
		);
	}
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
