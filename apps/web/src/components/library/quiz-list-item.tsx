import type { LibrarySection } from "@quizio/core/library/domain/library-section";
import { quizPublishState } from "@quizio/core/quiz/domain/quiz";
import {
	displayQuizTitle,
	QUIZ_VISIBILITIES,
	type QuizVisibility,
} from "@quizio/core/quiz/domain/quiz-details";
import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import {
	CopyIcon,
	EllipsisVerticalIcon,
	EyeIcon,
	InfoIcon,
	LayoutGridIcon,
	PencilIcon,
	RotateCcwIcon,
	Trash2Icon,
	UserPlusIcon,
} from "lucide-react";

import { QuizCover } from "@/components/quiz/quiz-cover";
import { QuizStatusBadge } from "@/components/quiz/quiz-status-badge";
import {
	VISIBILITY_DESCRIPTIONS,
	VISIBILITY_LABELS,
	VisibilityBadge,
} from "@/components/quiz/visibility-badge";
import type { LibraryItemView } from "@/lib/api-types";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { questionCountLabel } from "@/lib/quiz-labels";

export interface QuizItemActions {
	/** "Atribuir" (spec 029, RN-02). */
	onAssign: (item: LibraryItemView) => void;
	/** "Organizar ao vivo" (spec 008). */
	onHost: (item: LibraryItemView) => void;
	onEdit: (item: LibraryItemView) => void;
	onDuplicate: (item: LibraryItemView) => void;
	onMoveToTrash: (item: LibraryItemView) => void;
	onRestore: (item: LibraryItemView) => void;
	onDeletePermanently: (item: LibraryItemView) => void;
	/** "Visibilidade" without opening the quiz's settings (spec 039, RN-25a). */
	onSetVisibility: (item: LibraryItemView, visibility: QuizVisibility) => void;
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
	// Only what can be played gets the buttons (spec 029, RN-03).
	const playable = section !== "trash" && item.status === "published";

	return (
		<li className="group relative flex items-center gap-4 rounded-lg bg-card p-3 shadow-sm">
			<QuizCover url={item.coverImageUrl} className="w-24 shrink-0 sm:w-32" />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				{/* Opens the drawer over the list, as Kahoot does: the address shows
				    the quiz's own page, which a reload or a new tab opens. */}
				<Link
					from="/library"
					search={(previous) => ({ ...previous, quiz: item.id })}
					mask={{
						to: "/quizzes/$quizId",
						params: { quizId: item.id },
						// A reload opens the page itself, not the drawer again.
						unmaskOnReload: true,
					}}
					resetScroll={false}
					className="truncate font-bold hover:underline"
				>
					{title}
				</Link>
				<span className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
					{questionCountLabel(item.questionCount)}
					<QuizStatusBadge state={quizPublishState(item)} />
				</span>
			</div>
			<VisibilityBadge visibility={item.visibility} />
			<span className="hidden w-28 text-muted-foreground text-xs sm:block">
				{formatRelativeTime(new Date(item.updatedAt), now)}
			</span>
			{playable && (
				// Over the visibility and the date, as in Kahoot's library: on hover
				// or when the keyboard reaches the row; on a phone, in the menu.
				// biome-ignore lint/a11y/useSemanticElements: a group of two buttons, not a form fieldset.
				<div
					role="group"
					aria-label={`Jogar ${title}`}
					className="absolute top-1/2 right-14 hidden -translate-y-1/2 gap-2 rounded-md bg-card pl-2 opacity-0 transition-opacity focus-within:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 sm:flex"
				>
					<Button
						variant="outline"
						size="sm"
						onClick={() => actions.onAssign(item)}
					>
						Atribuir
					</Button>
					<Button size="sm" onClick={() => actions.onHost(item)}>
						Organizar ao vivo
					</Button>
				</div>
			)}
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
								<RotateCcwIcon />
								Restaurar
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => actions.onDeletePermanently(item)}
							>
								<Trash2Icon />
								Excluir definitivamente
							</DropdownMenuItem>
						</>
					) : (
						<>
							{playable && (
								<>
									<DropdownMenuItem
										className="sm:hidden"
										onClick={() => actions.onAssign(item)}
									>
										<UserPlusIcon />
										Atribuir
									</DropdownMenuItem>
									<DropdownMenuItem
										className="sm:hidden"
										onClick={() => actions.onHost(item)}
									>
										<LayoutGridIcon />
										Organizar ao vivo
									</DropdownMenuItem>
								</>
							)}
							<DropdownMenuItem onClick={() => actions.onEdit(item)}>
								<PencilIcon />
								Editar dados
							</DropdownMenuItem>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>
									<EyeIcon />
									Visibilidade
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent>
									<DropdownMenuRadioGroup
										value={item.visibility}
										onValueChange={(value) =>
											actions.onSetVisibility(item, value as QuizVisibility)
										}
									>
										{QUIZ_VISIBILITIES.map((option) => (
											<DropdownMenuRadioItem
												key={option}
												value={option}
												closeOnClick
											>
												{VISIBILITY_LABELS[option]}
												<InfoIcon
													role="img"
													aria-label={VISIBILITY_DESCRIPTIONS[option]}
													className="ml-auto text-muted-foreground"
												>
													<title>{VISIBILITY_DESCRIPTIONS[option]}</title>
												</InfoIcon>
											</DropdownMenuRadioItem>
										))}
									</DropdownMenuRadioGroup>
								</DropdownMenuSubContent>
							</DropdownMenuSub>
							<DropdownMenuItem onClick={() => actions.onDuplicate(item)}>
								<CopyIcon />
								Duplicar
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => actions.onMoveToTrash(item)}
							>
								<Trash2Icon />
								Mover para a lixeira
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</li>
	);
}
