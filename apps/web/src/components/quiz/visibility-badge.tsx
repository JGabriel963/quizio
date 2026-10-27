import type { QuizVisibility } from "@quizio/core/quiz/domain/quiz-details";
import { Badge } from "@quizio/ui/components/badge";

export const VISIBILITY_LABELS: Record<QuizVisibility, string> = {
	private: "Privado",
	public: "Público",
};

/** What each visibility means, beside its choice (spec 039, RN-25). */
export const VISIBILITY_DESCRIPTIONS: Record<QuizVisibility, string> = {
	private: "Visível apenas para você.",
	public: "Visível para todos no seu perfil.",
};

export function VisibilityBadge({
	visibility,
}: {
	visibility: QuizVisibility;
}) {
	return <Badge variant={visibility}>{VISIBILITY_LABELS[visibility]}</Badge>;
}
