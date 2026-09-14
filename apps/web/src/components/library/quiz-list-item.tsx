import type { LibrarySection } from "@quizio/core/library/domain/library-section";
import { displayQuizTitle } from "@quizio/core/quiz/domain/quiz-details";
import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { EllipsisVerticalIcon } from "lucide-react";

import { QuizCover } from "@/components/quiz/quiz-cover";
import { VisibilityBadge } from "@/components/quiz/visibility-badge";
import type { LibraryItemView } from "@/lib/api-types";
import { formatRelativeTime } from "@/lib/format-relative-time";

export interface QuizItemActions {
	onEdit: (item: LibraryItemView) => void;
	onDuplicate: (item: LibraryItemView) => void;
	onMoveToTrash: (item: LibraryItemView) => void;
	onRestore: (item: LibraryItemView) => void;
	onDeletePermanently: (item: LibraryItemView) => void;
}

export function questionCountLabel(count: number): string {
	return `${count} ${count === 1 ? "pergunta" : "perguntas"}`;
}

export function QuizListItem({
	item,
	section,
	actions,
	now = new Date(),
}: {
	item: LibraryItemView;
	section: LibrarySection;
	actions: QuizItemActions;
	now?: Date;
}) {
	const title = displayQuizTitle(item.title);

	return (
		<li className="flex items-center gap-4 rounded-lg bg-card p-3 shadow-sm">
			<QuizCover url={item.coverImageUrl} className="w-24 shrink-0 sm:w-32" />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<Link
					to="/quizzes/$quizId"
					params={{ quizId: item.id }}
					className="truncate font-bold hover:underline"
				>
					{title}
				</Link>
				<span className="text-muted-foreground text-xs">
					{questionCountLabel(item.questionCount)}
				</span>
			</div>
			<VisibilityBadge visibility={item.visibility} />
			<span className="hidden w-28 text-muted-foreground text-xs sm:block">
				{formatRelativeTime(new Date(item.updatedAt), now)}
			</span>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							size="icon"
							aria-label={`Ações para ${title}`}
						/>
					}
				>
					<EllipsisVerticalIcon />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{section === "trash" ? (
						<>
							<DropdownMenuItem onClick={() => actions.onRestore(item)}>
								Restaurar
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => actions.onDeletePermanently(item)}
							>
								Excluir definitivamente
							</DropdownMenuItem>
						</>
					) : (
						<>
							<DropdownMenuItem onClick={() => actions.onEdit(item)}>
								Editar dados
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => actions.onDuplicate(item)}>
								Duplicar
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => actions.onMoveToTrash(item)}
							>
								Mover para a lixeira
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</li>
	);
}
