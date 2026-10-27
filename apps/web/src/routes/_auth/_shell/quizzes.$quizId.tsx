import { createFileRoute } from "@tanstack/react-router";

import { QuizDetailsPanel } from "@/components/quiz/quiz-details-panel";

/**
 * The quiz's page. From the library it opens as a drawer over the list with
 * this address masked in (`QuizDrawer`); a reload or a link lands here.
 */
export const Route = createFileRoute("/_auth/_shell/quizzes/$quizId")({
	component: QuizDetailsPage,
});

// `overflow-clip`, not `hidden`: a box that hides its overflow becomes the
// scroller its sticky header and side column would stick to. The shell's
// content scrolls with a 1.5rem padding on top, which the header goes over.
function QuizDetailsPage() {
	const { quizId } = Route.useParams();
	const navigate = Route.useNavigate();

	return (
		<main className="mx-auto w-full max-w-[110rem] overflow-clip rounded-lg shadow-sm [--quiz-sticky-top:-1.5rem]">
			<QuizDetailsPanel
				quizId={quizId}
				onDeleted={() =>
					navigate({ to: "/library", search: { section: "trash" } })
				}
			/>
		</main>
	);
}
