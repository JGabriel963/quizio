import { Button } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";
import { HistoryIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { QuizCover } from "@/components/quiz/quiz-cover";
import type { SharedQuizCardData } from "@/lib/api-types";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { questionCountLabel } from "@/lib/quiz-labels";

import { type SharedQuizActions, SharedQuizMenu } from "./shared-quiz-menu";

/**
 * Where a shared quiz opens (spec 037, RN-10): its page in the group, or the
 * quiz's own page for its owner.
 */
export function SharedQuizLink({
	groupId,
	quiz,
	...props
}: {
	groupId: string;
	quiz: Pick<SharedQuizCardData, "quizId" | "ownedByViewer">;
} & Omit<ComponentProps<"a">, "href">) {
	return quiz.ownedByViewer ? (
		<Link {...props} to="/quizzes/$quizId" params={{ quizId: quiz.quizId }} />
	) : (
		<Link
			{...props}
			to="/groups/$groupId/quizzes/$quizId"
			params={{ groupId, quizId: quiz.quizId }}
		/>
	);
}

/**
 * The card of "compartilhou um kahoot" (spec 037, RN-09): the cover with its
 * question count, the title, the owner, how long ago it was shared, Iniciar
 * and the ⋮.
 */
export function SharedQuizAttachment({
	quiz,
	actions,
}: {
	quiz: SharedQuizCardData;
	actions: SharedQuizActions;
}) {
	return (
		<div className="flex items-stretch overflow-hidden rounded-md border border-border bg-card shadow-sm">
			<div className="relative w-28 shrink-0 sm:w-32">
				<QuizCover url={quiz.coverUrl} className="h-full rounded-none" />
				<span className="absolute right-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 font-bold text-white text-xs">
					{questionCountLabel(quiz.questionCount)}
				</span>
			</div>
			<div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-3 sm:flex-row sm:items-center">
				<div className="min-w-0">
					<p className="truncate font-bold">{quiz.title}</p>
					<p className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-xs">
						<span>{quiz.owner.name}</span>
						<span aria-hidden="true">·</span>
						<span className="inline-flex items-center gap-1">
							<HistoryIcon aria-hidden="true" className="size-3" />
							{formatRelativeTime(new Date(quiz.sharedAt))}
						</span>
					</p>
				</div>
				<div className="flex items-center gap-1 self-start sm:self-auto">
					<Button
						nativeButton={false}
						render={<SharedQuizLink groupId={actions.groupId} quiz={quiz} />}
					>
						Iniciar
					</Button>
					<SharedQuizMenu quiz={quiz} actions={actions} />
				</div>
			</div>
		</div>
	);
}
