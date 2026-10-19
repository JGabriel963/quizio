import { useQuery } from "@tanstack/react-query";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";

import {
	AssignmentLanding,
	type AssignmentLandingState,
} from "@/components/assignment/assignment-landing";
import { gameErrorCode } from "@/lib/game-error-messages";
import { useTRPC } from "@/utils/trpc";

/** How often the activity asks again: the deadline may change or end (spec 029, RN-37). */
const LANDING_CHECK_INTERVAL_MS = 30_000;

/**
 * The activity of an assignment, public and without an account (spec 029,
 * RN-19, RN-44 to RN-48): where the link and the eight-digit PIN lead.
 */
export const Route = createFileRoute("/assignment/$gameId")({
	head: () => ({ meta: [{ title: "Atividade — Quizio" }] }),
	component: AssignmentPage,
});

function AssignmentPage() {
	return (
		<ClientOnly fallback={<AssignmentLanding state={{ kind: "loading" }} />}>
			<AssignmentView />
		</ClientOnly>
	);
}

function AssignmentView() {
	const { gameId } = Route.useParams();
	const trpc = useTRPC();
	const landing = useQuery({
		...trpc.game.assignment.landing.queryOptions({ gameId }),
		refetchInterval: LANDING_CHECK_INTERVAL_MS,
		retry: (failureCount, error) =>
			gameErrorCode(error) !== "GAME.NOT_FOUND" && failureCount < 2,
		meta: { suppressErrorToast: true },
	});

	const state: AssignmentLandingState = landing.isPending
		? { kind: "loading" }
		: landing.isError
			? gameErrorCode(landing.error) === "GAME.NOT_FOUND"
				? { kind: "missing" }
				: { kind: "error", onRetry: () => landing.refetch() }
			: { kind: "ready", view: landing.data };

	return <AssignmentLanding state={state} />;
}
