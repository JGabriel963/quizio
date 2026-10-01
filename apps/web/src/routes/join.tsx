import { ClientOnly, createFileRoute, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { type JoinApi, JoinFlow } from "@/components/game/player/join-flow";
import { JoinLoading } from "@/components/game/player/join-forms";
import { browserPlayerSessionStore } from "@/lib/player-session";
import { useTRPCClient } from "@/utils/trpc";

/**
 * The player's screen, public and without an account (spec 008, RN-35): the
 * way in and, once the host starts, the game itself (spec 009).
 * `/join` asks for the PIN and `/join/{PIN}` is the join link; both are this
 * one screen, which stays mounted while the address follows the flow.
 */
export const Route = createFileRoute("/join")({
	head: () => ({ meta: [{ title: "Entrar no jogo — Quizio" }] }),
	component: JoinPage,
});

function JoinPage() {
	const { pin } = useParams({ strict: false });
	const navigate = Route.useNavigate();
	const client = useTRPCClient();
	const api = useMemo<JoinApi>(
		() => ({
			find: (gamePin) => client.game.join.find.mutate({ pin: gamePin }),
			enter: (input) => client.game.join.enter.mutate(input),
			session: (input) => client.game.join.session.query(input),
			answer: (input) => client.game.join.answer.mutate(input),
		}),
		[client],
	);
	const store = useMemo(() => browserPlayerSessionStore(), []);

	return (
		// The forms only show once they can be used: what is typed into a page
		// that is still loading would be lost.
		<ClientOnly fallback={<JoinLoading />}>
			<JoinFlow
				pin={pin ?? null}
				api={api}
				store={store}
				onPinChange={(next) => {
					if (next === (pin ?? null)) {
						return;
					}
					void (next
						? navigate({
								to: "/join/$pin",
								params: { pin: next },
								replace: true,
							})
						: navigate({ to: "/join", replace: true }));
				}}
			/>
		</ClientOnly>
	);
}
