import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@quizio/ui/components/alert-dialog";
import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { cn } from "@quizio/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	CircleAlertIcon,
	EllipsisVerticalIcon,
	FileChartColumnIcon,
	HistoryIcon,
	ThumbsUpIcon,
	Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/account/user-avatar";
import { QuizCover } from "@/components/quiz/quiz-cover";
import type { GroupPostData } from "@/lib/api-types";
import { assignmentLink } from "@/lib/assignment-link";
import { formatRelativeTime } from "@/lib/format-relative-time";
import {
	likesLabel,
	postDateLabel,
	postHeadlineLabel,
} from "@/lib/group-post-labels";
import { questionCountLabel } from "@/lib/quiz-labels";
import { PostFileCard } from "./post/post-file-card";
import { PostImage } from "./post/post-image";
import { PostText } from "./post/post-text";
import { SharedQuizAttachment } from "./shared/shared-quiz-attachment";
import type { SharedQuizActions } from "./shared/shared-quiz-menu";

/**
 * A post of the feed: who posted and what (spec 036, RN-17), the text with
 * its links, the image, the PDF, the activity's card with Iniciar or the
 * shared quiz's (spec 037, RN-09), or the removed box once it is gone (spec
 * 038, RN-16; spec 037, RN-13), the likes and the ⋮.
 */
export function GroupPost({
	post,
	origin,
	quizActions,
	onLike,
	onDelete,
}: {
	post: GroupPostData;
	origin: string;
	quizActions: SharedQuizActions;
	onLike: (liked: boolean) => Promise<unknown>;
	onDelete: () => Promise<unknown>;
}) {
	const { author, attachment, file, quiz } = post;
	const isAssignment = post.kind === "assignment";
	const lostAttachment =
		(isAssignment && !attachment) || (post.kind === "quizShare" && !quiz);

	return (
		<article className="flex flex-col rounded-lg bg-card shadow-sm">
			<header className="flex items-center gap-3 px-4 pt-4">
				<UserAvatar userId={author.userId} photoUrl={author.photoUrl} />
				<p className="min-w-0 flex-1 text-sm">
					<span className="font-bold">{author.name}</span>{" "}
					{postHeadlineLabel(post.headline)}
					{post.headline === "quizzes" && (
						<>
							{" "}
							<Link
								to="/groups/$groupId"
								params={{ groupId: quizActions.groupId }}
								search={{ tab: "shared" }}
								className="text-primary hover:underline"
							>
								múltiplos kahoots
							</Link>
						</>
					)}
				</p>
				<span className="text-muted-foreground text-xs">
					{postDateLabel(new Date(post.createdAt))}
				</span>
				<PostMenu
					gameId={post.gameId}
					canSeeReport={post.canSeeReport}
					canDelete={post.canDelete}
					hasFile={file !== null}
					sharesQuizzes={
						post.kind === "quizShare" || post.kind === "quizzesShare"
					}
					onDelete={onDelete}
				/>
			</header>

			<div className="flex flex-col gap-3 px-4 pt-3 pb-4">
				{post.message && <PostText text={post.message} />}
				{file?.type === "image" && (
					<PostImage
						url={file.url}
						alt={`Imagem publicada por ${author.name}`}
					/>
				)}
				{file?.type === "pdf" && (
					<PostFileCard
						url={file.url}
						name={file.name}
						sizeBytes={file.sizeBytes}
					/>
				)}
				{quiz && <SharedQuizAttachment quiz={quiz} actions={quizActions} />}
				{lostAttachment ? (
					<p className="flex items-center justify-center gap-2 rounded-md border border-border border-dashed px-4 py-6 text-muted-foreground text-sm">
						<CircleAlertIcon aria-hidden="true" className="size-4" />
						{author.name} excluiu o anexo da publicação
					</p>
				) : isAssignment && attachment ? (
					<div className="flex items-stretch overflow-hidden rounded-md border border-border bg-card shadow-sm">
						<div className="relative w-28 shrink-0 sm:w-32">
							<QuizCover
								url={attachment.coverUrl}
								className="h-full rounded-none"
							/>
							<span className="absolute right-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 font-bold text-white text-xs">
								{questionCountLabel(attachment.questionCount)}
							</span>
						</div>
						<div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-3 sm:flex-row sm:items-center">
							<div className="min-w-0">
								<p className="truncate font-bold">{attachment.name}</p>
								<p className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-xs">
									<span>{attachment.ownerName}</span>
									<span aria-hidden="true">·</span>
									<span className="inline-flex items-center gap-1">
										<HistoryIcon aria-hidden="true" className="size-3" />
										{formatRelativeTime(new Date(post.createdAt))}
									</span>
								</p>
							</div>
							<Button
								nativeButton={false}
								className="self-start sm:self-auto"
								render={
									<a
										href={assignmentLink(origin, attachment.gameId)}
										target="_blank"
										rel="noopener noreferrer"
									/>
								}
							>
								Iniciar
							</Button>
						</div>
					</div>
				) : null}
			</div>

			<LikeRow post={post} onLike={onLike} />
		</article>
	);
}

/** "N curtidas" and Curtir / Curtida, changed at once and back on failure (RN-17, RN-18). */
function LikeRow({
	post,
	onLike,
}: {
	post: GroupPostData;
	onLike: (liked: boolean) => Promise<unknown>;
}) {
	const [liked, setLiked] = useState(post.liked);
	const [count, setCount] = useState(post.likeCount);

	// A refetch brings what the server has.
	useEffect(() => {
		setLiked(post.liked);
		setCount(post.likeCount);
	}, [post.liked, post.likeCount]);

	async function toggle() {
		const next = !liked;
		setLiked(next);
		setCount((current) => current + (next ? 1 : -1));
		try {
			await onLike(next);
		} catch {
			setLiked(!next);
			setCount((current) => current + (next ? -1 : 1));
		}
	}

	return (
		<div className="flex flex-col">
			<p className="px-4 pb-3 text-muted-foreground text-sm">
				{likesLabel(count)}
			</p>
			<div className="border-border border-t px-2 py-1">
				<Button
					variant="ghost"
					aria-pressed={liked}
					onClick={() => void toggle()}
					className={cn("gap-1.5", liked && "text-primary")}
				>
					<ThumbsUpIcon aria-hidden="true" />
					{liked ? "Curtida" : "Curtir"}
				</Button>
			</div>
		</div>
	);
}

/**
 * The ⋮ of a post and of an Atribuições card: "Ver relatório" while the
 * report exists and "Excluir publicação", which asks first (spec 038, RN-20,
 * RN-21; spec 036, RN-19, RN-20). Nothing at all for who may do neither.
 */
export function PostMenu({
	gameId,
	canSeeReport,
	canDelete,
	hasFile = false,
	sharesQuizzes = false,
	onDelete,
}: {
	gameId: string | null;
	canSeeReport: boolean;
	canDelete: boolean;
	/** Its image or PDF goes with it. */
	hasFile?: boolean;
	/** Its quizzes stay in the group (spec 037, RN-12). */
	sharesQuizzes?: boolean;
	onDelete: () => Promise<unknown>;
}) {
	const [deleting, setDeleting] = useState(false);
	if (!(canSeeReport && gameId) && !canDelete) {
		return null;
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							size="icon"
							aria-label="Opções da publicação"
						/>
					}
				>
					<EllipsisVerticalIcon />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{canSeeReport && gameId && (
						<DropdownMenuItem
							render={<Link to="/reports/$gameId" params={{ gameId }} />}
						>
							<FileChartColumnIcon />
							Ver relatório
						</DropdownMenuItem>
					)}
					{canDelete && (
						<DropdownMenuItem
							variant="destructive"
							onClick={() => setDeleting(true)}
						>
							<Trash2Icon />
							Excluir publicação
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			<AlertDialog open={deleting} onOpenChange={setDeleting}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir a publicação?</AlertDialogTitle>
						<AlertDialogDescription>
							{gameId
								? "Ela some do mural e das atribuições do grupo, mas a atividade continua aberta para quem tem o link, até o prazo."
								: hasFile
									? "Ela some do mural para todos, com o arquivo."
									: sharesQuizzes
										? "Ela some do mural para todos. Os kahoots continuam em Compartilhado."
										: "Ela some do mural para todos."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								setDeleting(false);
								void onDelete();
							}}
						>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
