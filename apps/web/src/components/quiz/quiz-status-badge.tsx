import type { QuizPublishState } from "@quizio/core/quiz/domain/quiz";
import { Badge } from "@quizio/ui/components/badge";

export const PUBLISH_STATE_LABELS: Record<QuizPublishState, string> = {
	draft: "Rascunho",
	published: "Publicado",
	unpublishedChanges: "Alterações não salvas",
};

const VARIANTS = {
	draft: "draft",
	published: "published",
	unpublishedChanges: "unsaved",
} as const satisfies Record<QuizPublishState, string>;

/**
 * Whether a quiz is a draft or has changes its playable version does not have
 * yet (spec 006, RN-30). A published quiz without changes shows nothing, except
 * in the editor header, which always tells the state (RN-22).
 */
export function QuizStatusBadge({
	state,
	showPublished = false,
	className,
}: {
	state: QuizPublishState;
	showPublished?: boolean;
	className?: string;
}) {
	if (state === "published" && !showPublished) {
		return null;
	}
	return (
		<Badge variant={VARIANTS[state]} className={className}>
			{PUBLISH_STATE_LABELS[state]}
		</Badge>
	);
}
