import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

import type { LobbyPlayerData } from "@/lib/api-types";

import { Avatar } from "../avatar";

/**
 * Who is in, in order of arrival, each with the avatar when the characters are
 * on (spec 028). Each card is a button: hovering, focusing or touching it
 * offers to remove the player (spec 008, RN-17, RN-18, RN-27).
 */
export function PlayerGrid({
	players,
	onRemove,
}: {
	players: readonly LobbyPlayerData[];
	onRemove: (player: LobbyPlayerData) => void;
}) {
	const announcement = useArrivals(players);

	return (
		<>
			{players.length === 0 ? (
				<p className="rounded-md bg-game-chip px-4 py-1.5 text-center text-2xl text-game-chip-fg sm:text-3xl">
					Aguardando os participantes
				</p>
			) : (
				<ul
					aria-label="Participantes"
					className="flex flex-wrap justify-center gap-3"
				>
					{players.map((player) => (
						// Each one pops in as it arrives (spec 011, RN-35).
						<li key={player.id} className="motion-safe:animate-pop-in">
							<Tooltip>
								<TooltipTrigger
									render={
										<button
											type="button"
											onClick={() => onRemove(player)}
											className={cn(
												"flex items-center overflow-hidden rounded-md bg-game-accent font-bold text-game-accent-fg text-xl shadow-press outline-none hover:line-through focus-visible:line-through focus-visible:ring-3 focus-visible:ring-white/60 sm:text-2xl",
												player.avatar ? "pr-5" : "px-5 py-3",
											)}
										/>
									}
								>
									{/* The avatar beside the nickname (spec 028, RN-16, RN-21). */}
									{player.avatar && (
										<span className="mr-4 flex self-stretch bg-black/20 p-1.5">
											<Avatar
												avatar={player.avatar}
												animateOnChange
												className="size-12 sm:size-14"
											/>
										</span>
									)}
									{player.nickname}
									<span className="sr-only">, remover participante</span>
								</TooltipTrigger>
								<TooltipContent>Remover participante</TooltipContent>
							</Tooltip>
						</li>
					))}
				</ul>
			)}
			<p role="status" className="sr-only">
				{announcement}
			</p>
		</>
	);
}

/** Tells screen readers who just came in; the first list is not news. */
function useArrivals(players: readonly LobbyPlayerData[]): string {
	const known = useRef<Set<string> | null>(null);
	const [announcement, setAnnouncement] = useState("");

	useEffect(() => {
		const previous = known.current;
		known.current = new Set(players.map((player) => player.id));
		if (!previous) {
			return;
		}
		const arrived = players.filter((player) => !previous.has(player.id));
		if (arrived.length > 0) {
			setAnnouncement(
				`${arrived.map((player) => player.nickname).join(", ")} entrou`,
			);
		}
	}, [players]);

	return announcement;
}
