import { Button } from "@quizio/ui/components/button";

import { Confetti } from "@/components/game/confetti";
import { Medal } from "@/components/game/medal";
import type {
	AssignmentPlayData,
	AssignmentScoreboardData,
} from "@/lib/api-types";

import { ActivityHeader } from "./entry-screens";
import { PlayScoreboard } from "./play-scoreboard";

/**
 * The end of the activity (spec 030, RN-16, RN-18, RN-23): the activity's
 * header, the medal with the place among confetti, the standings and
 * "Entrar em outro jogo". An activity ended with the participant in the
 * middle says so.
 */
export function PlayFinal({
	activity,
	place,
	total,
	scoreboard,
	viewerId,
	endedEarly,
	onLeave,
}: {
	activity: AssignmentPlayData["activity"];
	place: number;
	total: number;
	scoreboard: AssignmentScoreboardData;
	viewerId: string;
	endedEarly: boolean;
	onLeave: () => void;
}) {
	return (
		<main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto">
			<ActivityHeader
				creatorName={activity.creatorName}
				remainingMs={activity.remainingMs}
			/>
			<div className="flex flex-1 flex-col items-center gap-5 px-4 py-6">
				<Confetti />
				{endedEarly && (
					<p
						role="status"
						className="rounded-md bg-black/50 px-4 py-2 text-center font-bold"
					>
						Esta atividade foi encerrada
					</p>
				)}
				<p className="text-center font-bold text-lg">{activity.name}</p>
				{place <= 3 ? (
					<Medal
						place={place as 1 | 2 | 3}
						className="size-32 text-7xl motion-safe:animate-pop-in"
					/>
				) : (
					<span
						aria-hidden="true"
						className="flex size-32 items-center justify-center rounded-full border-8 border-white/80 bg-brand-strong font-black text-6xl shadow-xl motion-safe:animate-pop-in"
					>
						{place}
					</span>
				)}
				<h1 className="font-black text-3xl">{place}º lugar</h1>
				<p className="font-bold text-xl">{total} pontos</p>
				<PlayScoreboard scoreboard={scoreboard} viewerId={viewerId} />
				<Button
					variant="secondary"
					size="lg"
					className="mt-2"
					onClick={onLeave}
				>
					Entrar em outro jogo
				</Button>
			</div>
		</main>
	);
}
