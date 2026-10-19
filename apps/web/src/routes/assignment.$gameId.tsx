import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { AssignmentLanding } from "@/components/assignment/assignment-landing";
import {
	type AssignmentPlayApi,
	AssignmentPlayFlow,
} from "@/components/assignment/play/assignment-play-flow";
import { browserAssignmentSessionStore } from "@/lib/assignment-session";
import { withTimeout } from "@/lib/connection";
import { useTRPCClient } from "@/utils/trpc";

/**
 * The activity of an assignment, public and without an account (spec 029,
 * RN-19, RN-44 to RN-48): where the link and the eight-digit PIN lead, and
 * where the participant plays it at their own pace (spec 030).
 */
export const Route = createFileRoute("/assignment/$gameId")({
	head: () => ({ meta: [{ title: "Atividade — Quizio" }] }),
	component: AssignmentPage,
});

function AssignmentPage() {
	const { gameId } = Route.useParams();
	const navigate = Route.useNavigate();
	const client = useTRPCClient();
	const api = useMemo<AssignmentPlayApi>(
		() => ({
			cover: (id) => client.game.assignment.cover.query({ gameId: id }),
			join: (input) => client.game.assignment.join.mutate(input),
			// Without an answer in time, the device takes the connection as lost
			// (spec 013): the server refuses a step that already happened.
			play: (input) => withTimeout(client.game.assignment.play.query(input)),
			start: (input) => withTimeout(client.game.assignment.start.mutate(input)),
			answer: (input) =>
				withTimeout(client.game.assignment.answer.mutate(input)),
			advance: (input) =>
				withTimeout(client.game.assignment.advance.mutate(input)),
			setAvatar: (input) =>
				withTimeout(client.game.assignment.setAvatar.mutate(input)),
		}),
		[client],
	);
	const store = useMemo(() => browserAssignmentSessionStore(), []);

	return (
		<ClientOnly fallback={<AssignmentLanding state={{ kind: "loading" }} />}>
			<AssignmentPlayFlow
				key={gameId}
				gameId={gameId}
				api={api}
				store={store}
				onLeave={() => navigate({ to: "/join" })}
			/>
		</ClientOnly>
	);
}
