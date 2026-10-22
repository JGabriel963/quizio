import type { QuestionType } from "@quizio/core/quiz/domain/question";
import { cn } from "@quizio/ui/lib/utils";

/** Answer blocks of each type, in the order they appear in the question. */
const BLOCKS: Record<
	Exclude<QuestionType, "typeAnswer" | "slider" | "puzzle">,
	readonly string[]
> = {
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
	if (type === "slider") {
		// A phone with a number over a scale, as in Kahoot's picker (spec 032).
		return (
			<span
				aria-hidden="true"
				data-slot="question-type-icon"
				className={cn(
					"flex h-9 w-7 flex-col items-center gap-0.5 rounded-sm border-2 border-foreground/80 bg-card p-0.5",
					className,
				)}
			>
				<span className="flex h-3 w-4 items-center justify-center rounded-[1px] bg-answer-blue font-black text-[7px] text-white leading-none before:content-['10']" />
				<span className="flex w-full flex-1 items-end justify-between px-px">
					{["a", "b", "c", "d", "e"].map((tick) => (
						<span
							key={tick}
							className={cn(
								"w-px",
								tick === "c"
									? "h-full bg-answer-blue"
									: "h-3/4 bg-foreground/40",
							)}
						/>
					))}
				</span>
			</span>
		);
	}
	if (type === "puzzle") {
		// A phone with stacked colored blocks, one out of line (spec 033).
		return (
			<span
				aria-hidden="true"
				data-slot="question-type-icon"
				className={cn(
					"flex h-9 w-7 flex-col justify-center gap-0.5 rounded-sm border-2 border-foreground/80 bg-card p-0.5",
					className,
				)}
			>
				{[
					"bg-answer-green",
					"translate-x-0.5 bg-answer-red",
					"bg-answer-blue",
					"bg-answer-yellow",
				].map((color) => (
					<span key={color} className={cn("h-1 rounded-[1px]", color)} />
				))}
			</span>
		);
	}
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
