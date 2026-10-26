import { normalizeSearchText } from "@quizio/core/shared/domain/search-text";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { Input } from "@quizio/ui/components/input";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { HistoryIcon, SearchIcon, UserIcon } from "lucide-react";
import { useState } from "react";

import { QuizCover } from "@/components/quiz/quiz-cover";
import { VISIBILITY_LABELS } from "@/components/quiz/visibility-badge";
import type { LibraryItemView } from "@/lib/api-types";
import { formatRelativeTime } from "@/lib/format-relative-time";
import type { PickedQuiz } from "@/lib/group-assign-state";
import { questionCountLabel } from "@/lib/quiz-labels";

/**
 * "Selecionar kahoot" (spec 038, RN-04 to RN-06): the caller's quizzes that
 * can be played, newest first, searched by title.
 */
export function SelectQuizDialog({
	open,
	quizzes,
	ownerName,
	onPick,
	onClose,
}: {
	open: boolean;
	/** The library's recent section; undefined while it loads. */
	quizzes: readonly LibraryItemView[] | undefined;
	ownerName: string;
	onPick: (quiz: PickedQuiz) => void;
	onClose: () => void;
}) {
	const [search, setSearch] = useState("");
	const playable = (quizzes ?? []).filter(
		(quiz) => quiz.status === "published",
	);
	const wanted = normalizeSearchText(search);
	const shown = playable.filter((quiz) =>
		normalizeSearchText(quiz.title ?? "").includes(wanted),
	);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onClose();
				}
			}}
		>
			<DialogContent className="sm:max-w-2xl" showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Selecionar kahoot</DialogTitle>
				</DialogHeader>
				<div className="relative">
					<SearchIcon
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						type="search"
						aria-label="Pesquisar kahoots"
						placeholder="Pesquisar kahoots"
						value={search}
						autoFocus
						onChange={(event) => setSearch(event.target.value)}
					/>
				</div>
				<div className="flex max-h-[50vh] min-h-48 flex-col gap-2 overflow-y-auto rounded-md bg-muted p-3">
					{quizzes === undefined ? (
						["a", "b", "c"].map((key) => (
							<Skeleton key={key} className="h-20 w-full rounded-md" />
						))
					) : playable.length === 0 ? (
						<div className="flex flex-col items-center gap-3 py-8 text-center">
							<p className="text-sm">
								Você ainda não tem quizzes salvos para atribuir.
							</p>
							<Button
								variant="outline"
								nativeButton={false}
								render={<Link to="/library" search={{ section: "recent" }} />}
							>
								Ir para a biblioteca
							</Button>
						</div>
					) : shown.length === 0 ? (
						<p className="py-8 text-center text-sm">Nenhum quiz encontrado.</p>
					) : (
						shown.map((quiz) => (
							<button
								key={quiz.id}
								type="button"
								onClick={() =>
									onPick({
										id: quiz.id,
										title: quiz.title ?? "",
										coverImageUrl: quiz.coverImageUrl,
										questionCount: quiz.questionCount,
										ownerName,
									})
								}
								className="flex items-stretch overflow-hidden rounded-md bg-card text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
							>
								<div className="relative w-32 shrink-0">
									<QuizCover
										url={quiz.coverImageUrl}
										className="h-full rounded-none"
									/>
									<span className="absolute right-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 font-bold text-white text-xs">
										{questionCountLabel(quiz.questionCount)}
									</span>
								</div>
								<div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
									<span className="truncate font-bold">{quiz.title}</span>
									{quiz.description && (
										<span className="truncate text-muted-foreground text-xs">
											{quiz.description.split("\n")[0]}
										</span>
									)}
									<span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
										<span>{ownerName}</span>
										<span aria-hidden="true">·</span>
										<span className="inline-flex items-center gap-1">
											<UserIcon aria-hidden="true" className="size-3" />
											{VISIBILITY_LABELS[quiz.visibility]}
										</span>
										<span aria-hidden="true">·</span>
										<span className="inline-flex items-center gap-1">
											<HistoryIcon aria-hidden="true" className="size-3" />
											{formatRelativeTime(new Date(quiz.updatedAt))}
										</span>
									</span>
								</div>
							</button>
						))
					)}
				</div>
				<DialogFooter className="sm:justify-center">
					<Button variant="secondary" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
