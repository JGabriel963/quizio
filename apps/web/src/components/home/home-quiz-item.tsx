import { displayQuizTitle } from "@quizio/core/quiz/domain/quiz-details";
import { Link } from "@tanstack/react-router";

import { QuizCover } from "@/components/quiz/quiz-cover";
import type { HomeQuizView } from "@/lib/api-types";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { questionCountLabel } from "@/lib/quiz-labels";

/**
 * A quiz on the dashboard. Opening is the only action here; editing,
 * duplicating and deleting stay in the library (spec 002, RN-16).
 */
export function HomeQuizItem({
	quiz,
	now = new Date(),
}: {
	quiz: HomeQuizView;
	now?: Date;
}) {
	const title = displayQuizTitle(quiz.title);

	return (
		<li className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted">
			<QuizCover url={quiz.coverImageUrl} className="w-20 shrink-0" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<Link
					to="/quizzes/$quizId"
					params={{ quizId: quiz.id }}
					className="truncate font-bold text-sm hover:underline"
				>
					{title}
				</Link>
				<span className="flex gap-1 text-muted-foreground text-xs">
					<span>{questionCountLabel(quiz.questionCount)}</span>
					<span aria-hidden="true">·</span>
					<span>{formatRelativeTime(new Date(quiz.updatedAt), now)}</span>
				</span>
			</div>
		</li>
	);
}
