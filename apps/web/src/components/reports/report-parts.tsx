import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import {
	CheckIcon,
	CircleHelpIcon,
	CircleSlashIcon,
	type LucideIcon,
	MinusIcon,
	XIcon,
} from "lucide-react";

import type { AnswerResultData } from "@/lib/api-types";
import { RESULT_LABELS } from "@/lib/report-labels";

/** The tabs of an open report and the two lists inside two of them (RN-33). */
export const REPORT_TABS = ["summary", "participants", "questions"] as const;
export type ReportTab = (typeof REPORT_TABS)[number];
/** `flagged` is "Ajuda necessária" or "Perguntas difíceis". */
export const REPORT_VIEWS = ["all", "flagged"] as const;
export type ReportView = (typeof REPORT_VIEWS)[number];

/** How many lines a table of the report shows before "Mostrar mais" (RN-41). */
export const REPORT_TABLE_PAGE = 10;

/** Points as the game shows them: "10.895". */
export function pointsLabel(points: number): string {
	return points.toLocaleString("pt-BR");
}

const RESULT_STYLE: Record<
	AnswerResultData,
	{ icon: LucideIcon; tone: string }
> = {
	correct: { icon: CheckIcon, tone: "text-success" },
	partiallyCorrect: { icon: CircleSlashIcon, tone: "text-amber-700" },
	wrong: { icon: XIcon, tone: "text-destructive" },
	unanswered: { icon: MinusIcon, tone: "text-muted-foreground" },
};

/** What a participant did in a question, in words and with an icon (RN-55). */
export function ResultBadge({
	result,
	className,
}: {
	result: AnswerResultData;
	className?: string;
}) {
	const { icon: Icon, tone } = RESULT_STYLE[result];
	return (
		<span
			data-result={result}
			className={cn(
				"inline-flex items-center gap-1 font-semibold text-sm",
				tone,
				className,
			)}
		>
			<Icon aria-hidden="true" className="size-4" />
			{RESULT_LABELS[result]}
		</span>
	);
}

/** An answer with the shape and the color it had in the game. */
export function ChoiceChip({
	shapeIndex,
	text,
	className,
}: {
	shapeIndex: number;
	text: string;
	className?: string;
}) {
	const shape = answerShapeAt(shapeIndex);
	return (
		<span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
			<span
				className={cn(
					"grid size-6 shrink-0 place-items-center rounded text-white",
					ANSWER_COLOR_CLASSES[shape],
				)}
			>
				<AnswerShape shape={shape} className="size-3.5" />
			</span>
			<span className="min-w-0 break-words">{text}</span>
		</span>
	);
}

/** The "?" beside a card's title: the rule behind its numbers. */
export function HelpTip({ text }: { text: string }) {
	return (
		<Tooltip>
			<TooltipTrigger
				aria-label={text}
				className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
			>
				<CircleHelpIcon aria-hidden="true" className="size-5" />
			</TooltipTrigger>
			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
	);
}
