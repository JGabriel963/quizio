import { AnswerShape, answerShapeAt } from "@quizio/ui/components/answer-shape";
import { Badge } from "@quizio/ui/components/badge";
import { cn } from "@quizio/ui/lib/utils";
import { ImageIcon } from "lucide-react";

import type { QuestionData } from "@/lib/api-types";

import { QuestionTextField } from "./question-text-field";

const SHAPE_COLORS = [
	"bg-answer-red",
	"bg-answer-blue",
	"bg-answer-yellow",
	"bg-answer-green",
] as const;

/** Fixed answer slots; editing them arrives with spec 004. */
const ANSWER_SLOTS = [
	"Adicionar resposta 1",
	"Adicionar resposta 2",
	"Adicionar resposta 3 (opcional)",
	"Adicionar resposta 4 (opcional)",
];

/** The selected question in the middle of the editor (spec 003). */
export function QuestionCanvas({
	question,
	onSaveText,
}: {
	question: QuestionData;
	onSaveText: (text: string | null) => Promise<unknown>;
}) {
	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6">
			{/* Keyed by question so switching questions never mixes their texts. */}
			<QuestionTextField
				key={question.id}
				questionId={question.id}
				initialText={question.text}
				onSave={onSaveText}
			/>

			<section
				aria-label="Mídia"
				className="mx-auto flex aspect-video w-full max-w-xl flex-col items-center justify-center gap-3 rounded-md bg-card/70 p-6 text-center"
			>
				<ImageIcon
					aria-hidden="true"
					className="size-10 text-muted-foreground"
				/>
				<p className="font-semibold text-muted-foreground">
					Encontre e insira mídia
				</p>
				<Badge variant="soon">Em breve</Badge>
			</section>

			<div className="flex flex-col gap-2">
				<ul
					aria-label="Respostas"
					className="grid grid-cols-1 gap-2 sm:grid-cols-2"
				>
					{ANSWER_SLOTS.map((label, index) => (
						<li
							key={label}
							className="flex min-h-16 items-center gap-3 rounded-md bg-card p-2 text-muted-foreground shadow-press-light sm:min-h-20"
						>
							<span
								className={cn(
									"flex h-full min-h-12 w-10 shrink-0 items-center justify-center rounded-md text-answer-foreground",
									SHAPE_COLORS[index],
								)}
							>
								<AnswerShape shape={answerShapeAt(index)} className="size-5" />
							</span>
							{label}
						</li>
					))}
				</ul>
				<Badge variant="soon" className="self-center">
					Em breve
				</Badge>
			</div>
		</div>
	);
}
