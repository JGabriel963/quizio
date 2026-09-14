import type { LibrarySection } from "@quizio/core/library/domain/library-section";
import { Skeleton } from "@quizio/ui/components/skeleton";

import type { LibraryItemView } from "@/lib/api-types";

import { type QuizItemActions, QuizListItem } from "./quiz-list-item";

export function QuizList({
	items,
	section,
	actions,
}: {
	items: LibraryItemView[];
	section: LibrarySection;
	actions: QuizItemActions;
}) {
	const now = new Date();
	return (
		<ul className="flex flex-col gap-3" aria-label="Quizzes">
			{items.map((item) => (
				<QuizListItem
					key={item.id}
					item={item}
					section={section}
					actions={actions}
					now={now}
				/>
			))}
		</ul>
	);
}

/** Placeholder rows shaped like the list while it loads. */
export function QuizListSkeleton({ rows = 3 }: { rows?: number }) {
	return (
		<ul
			className="flex flex-col gap-3"
			aria-busy="true"
			aria-label="Carregando quizzes"
		>
			{Array.from({ length: rows }, (_, index) => (
				<li
					key={index}
					className="flex items-center gap-4 rounded-lg bg-card p-3 shadow-sm"
				>
					<Skeleton className="aspect-video w-24 sm:w-32" />
					<div className="flex flex-1 flex-col gap-2">
						<Skeleton className="h-4 w-1/2" />
						<Skeleton className="h-3 w-20" />
					</div>
				</li>
			))}
		</ul>
	);
}
