import { cn } from "@quizio/ui/lib/utils";
import { MoveUpIcon } from "lucide-react";

import { Avatar } from "@/components/game/avatar";
import type { AssignmentScoreboardData } from "@/lib/api-types";
import { CountUp } from "@/lib/count-up";

type Entry = AssignmentScoreboardData["top"][number];

/**
 * "Pontuações" of the activity (spec 030, RN-14, RN-15): everybody by their
 * current total, the first five and the viewer's own row below when outside
 * them, highlighted. The totals count from where they were.
 */
export function PlayScoreboard({
	scoreboard,
	viewerId,
	className,
}: {
	scoreboard: AssignmentScoreboardData;
	viewerId: string;
	className?: string;
}) {
	const rows = scoreboard.viewer
		? [...scoreboard.top, scoreboard.viewer]
		: scoreboard.top;

	return (
		<ol
			aria-label="Pontuações"
			className={cn("flex w-full max-w-2xl flex-col gap-2", className)}
		>
			{rows.map((row) => (
				<Row
					key={row.playerId}
					row={row}
					viewer={row.playerId === viewerId}
					apart={row === scoreboard.viewer}
				/>
			))}
		</ol>
	);
}

function Row({
	row,
	viewer,
	apart,
}: {
	row: Entry;
	viewer: boolean;
	/** The viewer's row out of the five: a gap above it. */
	apart: boolean;
}) {
	return (
		<li
			data-viewer={viewer}
			className={cn(
				"flex h-14 items-center gap-3 rounded-md px-4 font-black text-lg shadow-lg motion-safe:animate-stage-in sm:text-2xl",
				viewer ? "bg-white text-neutral-900" : "bg-brand-strong text-white",
				apart && "mt-4",
			)}
		>
			<span className="w-8 shrink-0 text-center">{row.rank}</span>
			<span className="flex min-w-0 flex-1 items-center gap-3">
				{row.avatar && <Avatar avatar={row.avatar} className="size-10" />}
				<span className="truncate">{row.nickname}</span>
			</span>
			<CountUp from={row.previous?.total ?? 0} value={row.total} />
			<span className="flex size-6 shrink-0 items-center justify-center">
				{row.climbed && (
					<>
						<MoveUpIcon
							aria-hidden="true"
							className="size-5 stroke-3 motion-safe:animate-pop-in"
						/>
						<span className="sr-only">Subiu</span>
					</>
				)}
			</span>
		</li>
	);
}
