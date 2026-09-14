import { displayQuizTitle } from "@quizio/core/quiz/domain/quiz-details";
import { Button } from "@quizio/ui/components/button";

import { questionCountLabel } from "@/components/library/quiz-list-item";
import type { QuizDetailsData } from "@/lib/api-types";
import { formatRelativeTime } from "@/lib/format-relative-time";

import { QuizCover } from "./quiz-cover";
import { VisibilityBadge } from "./visibility-badge";

export interface QuizDetailsActions {
	onEdit: () => void;
	onDuplicate: () => void;
	onMoveToTrash: () => void;
	onRestore: () => void;
	onDeletePermanently: () => void;
}

export function QuizDetailsView({
	quiz,
	actions,
	now = new Date(),
}: {
	quiz: QuizDetailsData;
	actions: QuizDetailsActions;
	now?: Date;
}) {
	const inTrash = quiz.trashedAt !== null;

	return (
		<article className="flex flex-col gap-6">
			{inTrash && (
				<p
					role="status"
					className="rounded-md bg-muted px-4 py-3 font-semibold text-sm"
				>
					Este quiz está na lixeira.
				</p>
			)}
			<div className="flex flex-col gap-6 rounded-lg bg-card p-5 shadow-sm md:flex-row">
				<QuizCover url={quiz.coverImageUrl} className="w-full md:w-80" />
				<div className="flex min-w-0 flex-1 flex-col gap-3">
					<h1 className="break-words font-bold text-3xl">
						{displayQuizTitle(quiz.title)}
					</h1>
					{quiz.description && (
						<p className="whitespace-pre-line text-muted-foreground">
							{quiz.description}
						</p>
					)}
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<VisibilityBadge visibility={quiz.visibility} />
						<span className="font-semibold">
							{questionCountLabel(quiz.questionCount)}
						</span>
						<span className="text-muted-foreground">
							Última modificação:{" "}
							{formatRelativeTime(new Date(quiz.updatedAt), now)}
						</span>
					</div>
					<div className="flex flex-wrap gap-2 pt-2">
						{inTrash ? (
							<>
								<Button onClick={actions.onRestore}>Restaurar</Button>
								<Button
									variant="destructive"
									onClick={actions.onDeletePermanently}
								>
									Excluir definitivamente
								</Button>
							</>
						) : (
							<>
								<Button onClick={actions.onEdit}>Editar dados</Button>
								<Button variant="secondary" onClick={actions.onDuplicate}>
									Duplicar
								</Button>
								<Button variant="ghost" onClick={actions.onMoveToTrash}>
									Mover para a lixeira
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</article>
	);
}
