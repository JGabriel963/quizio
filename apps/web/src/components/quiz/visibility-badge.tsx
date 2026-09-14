import type { QuizVisibility } from "@quizio/core/quiz/domain/quiz-details";
import { Badge } from "@quizio/ui/components/badge";

export const VISIBILITY_LABELS: Record<QuizVisibility, string> = {
	private: "Privado",
	unlisted: "Não listado",
};

export function VisibilityBadge({
	visibility,
}: {
	visibility: QuizVisibility;
}) {
	return <Badge variant={visibility}>{VISIBILITY_LABELS[visibility]}</Badge>;
}
