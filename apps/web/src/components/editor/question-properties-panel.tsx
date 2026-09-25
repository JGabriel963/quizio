import { CopyIcon, ListChecksIcon, Trash2Icon } from "lucide-react";

import type { QuestionData } from "@/lib/api-types";
import { questionTypeLabel } from "@/lib/quiz-labels";

import { ActionButton, questionActionReasons } from "./question-actions";

/**
 * Right panel. This stage shows the type read-only; time, points and answer
 * options arrive with spec 004, changing the type with spec 005.
 */
export function QuestionPropertiesPanel({
	question,
	questionCount,
	onDelete,
	onDuplicate,
}: {
	question: QuestionData;
	questionCount: number;
	onDelete: (questionId: string) => void;
	onDuplicate: (questionId: string) => void;
}) {
	const { deleteReason, growReason } = questionActionReasons(questionCount);

	return (
		<div className="flex h-full flex-col gap-4 p-4">
			<h2 className="border-border border-b pb-3 font-bold">
				Propriedades da pergunta
			</h2>

			<div className="flex flex-col gap-2">
				<span className="flex items-center gap-2 font-bold text-sm">
					<ListChecksIcon aria-hidden="true" className="size-4" />
					Tipo de pergunta
				</span>
				<span className="rounded-md border border-input bg-muted px-3 py-2 font-semibold text-sm">
					{questionTypeLabel(question.type)}
				</span>
			</div>

			<div className="mt-auto flex justify-center gap-2 border-border border-t pt-4">
				<ActionButton
					variant="secondary"
					unavailableReason={deleteReason}
					onClick={() => onDelete(question.id)}
				>
					<Trash2Icon data-icon="inline-start" />
					Excluir
				</ActionButton>
				<ActionButton
					variant="outline"
					unavailableReason={growReason}
					onClick={() => onDuplicate(question.id)}
				>
					<CopyIcon data-icon="inline-start" />
					Duplicar
				</ActionButton>
			</div>
		</div>
	);
}
