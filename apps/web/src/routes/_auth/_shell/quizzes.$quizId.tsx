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
// scroller its sticky header and side column would stick to. From `md` the
// shell's content is the scroller, with a 1.5rem padding on top that the
// header goes over; below it the window scrolls and there is none.
function QuizDetailsPage() {
	const { quizId } = Route.useParams();
	const navigate = Route.useNavigate();

	return (
		<main className="mx-auto w-full max-w-[110rem] overflow-clip rounded-lg shadow-sm md:[--quiz-sticky-top:-1.5rem]">
			<QuizDetailsPanel
				quizId={quizId}
				onDeleted={() =>
					navigate({ to: "/library", search: { section: "trash" } })
				}
			/>
		</main>
	);
}
