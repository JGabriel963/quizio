import { createFileRoute } from "@tanstack/react-router";

import { QuizDetailsPanel } from "@/components/quiz/quiz-details-panel";

/**
 * The quiz's page. From the library it opens as a drawer over the list with
 * this address masked in (`QuizDrawer`); a reload or a link lands here.
 */
export const Route = createFileRoute("/_auth/_shell/quizzes/$quizId")({
	component: QuizDetailsPage,
});

function QuizDetailsPage() {
	const { quizId } = Route.useParams();
	const navigate = Route.useNavigate();

	return (
		<main className="mx-auto w-full max-w-[110rem] overflow-hidden rounded-lg shadow-sm">
			<QuizDetailsPanel
				quizId={quizId}
				onDeleted={() =>
					navigate({ to: "/library", search: { section: "trash" } })
				}
			/>
		</main>
	);
}
