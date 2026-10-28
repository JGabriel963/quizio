import { createFileRoute, redirect } from "@tanstack/react-router";

import { QuizDetailsPanel } from "@/components/quiz/quiz-details-panel";
import { drawerBehindPage } from "@/lib/quiz-drawer-return";

/**
 * The quiz's page. From the library it opens as a drawer over the list with
 * this address masked in (`QuizDrawer`); a reload or a link lands here.
 * Coming back to that drawer from another document opens the drawer again.
 */
export const Route = createFileRoute("/_auth/_shell/quizzes/$quizId")({
	// Back to a drawer from another document opens the drawer, not the page.
	beforeLoad: ({ params }) => {
		if (typeof window === "undefined") {
			return;
		}
		const screen = drawerBehindPage({
			state: window.history.state,
			quizId: params.quizId,
			documentUrl: performance.getEntriesByType("navigation")[0]?.name ?? "",
			currentUrl: window.location.href,
		});
		if (screen) {
			throw redirect({
				to: screen.to,
				search: screen.search as never,
				mask: {
					to: "/quizzes/$quizId",
					params: { quizId: params.quizId },
					unmaskOnReload: true,
				},
				replace: true,
			});
		}
	},
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
