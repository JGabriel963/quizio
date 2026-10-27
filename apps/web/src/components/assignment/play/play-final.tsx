import { Button } from "@quizio/ui/components/button";

import { Confetti } from "@/components/game/confetti";
import { Medal } from "@/components/game/medal";
import type {
	AssignmentPlayData,
	AssignmentScoreboardData,
} from "@/lib/api-types";

import { ActivityHeader } from "./entry-screens";
import { PlayScoreboard } from "./play-scoreboard";
import { PlayCard } from "./play-stage";

/**
 * The end of the activity (spec 030, RN-16, RN-18, RN-23), in the card the
 * game was played in: the activity's header, the medal with the place among
 * confetti beside the standings (one above the other on a phone), and
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
		<PlayCard className="mt-3 overflow-y-auto">
			<ActivityHeader
				creatorName={activity.creatorName}
				remainingMs={activity.remainingMs}
			/>
			<Confetti />
			<div className="flex flex-1 flex-col items-center gap-6 px-4 py-6 sm:px-8">
				{endedEarly && (
					<p
						role="status"
						className="rounded-md bg-game-chip px-4 py-2 text-center font-bold text-game-chip-fg"
					>
						Esta atividade foi encerrada
					</p>
				)}
				<div className="grid w-full flex-1 items-center gap-6 lg:grid-cols-[2fr_3fr]">
					<div className="flex flex-col items-center gap-3">
						<p className="text-center font-bold text-lg">{activity.name}</p>
						{place <= 3 ? (
							<Medal
								place={place as 1 | 2 | 3}
								className="size-32 text-7xl motion-safe:animate-pop-in"
							/>
						) : (
							<span
								aria-hidden="true"
								className="flex size-32 items-center justify-center rounded-full border-8 border-white/80 bg-game-accent font-black text-6xl text-game-accent-fg shadow-xl motion-safe:animate-pop-in"
							>
								{place}
							</span>
						)}
						<h1 className="font-black text-3xl">{place}º lugar</h1>
						<p className="font-bold text-xl">{total} pontos</p>
					</div>
					<PlayScoreboard
						scoreboard={scoreboard}
						viewerId={viewerId}
						className="mx-auto"
					/>
				</div>
				<Button variant="secondary" size="lg" onClick={onLeave}>
					Entrar em outro jogo
				</Button>
			</div>
		</PlayCard>
	);
}
