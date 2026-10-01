import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { ChevronRightIcon, MoveUpIcon } from "lucide-react";

import type { ScoreboardEntryData } from "@/lib/api-types";

/**
 * The scoreboard between questions: the first five by total, the leader in
 * white and an arrow by who climbed (spec 010, RN-17 to RN-21). It stays until
 * the host advances.
 */
export function Scoreboard({
	entries,
	busy,
	onAdvance,
}: {
	entries: ScoreboardEntryData[];
	busy: boolean;
	onAdvance: () => void;
}) {
	return (
		<main className="relative flex min-h-0 flex-1 flex-col">
			<div className="flex justify-end p-2 sm:p-4">
				<Button variant="secondary" disabled={busy} onClick={onAdvance}>
					Avançar
					<ChevronRightIcon aria-hidden="true" />
				</Button>
			</div>
			<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 pb-8">
				<h1 className="sr-only">Placar</h1>
				<ol
					aria-label="Placar"
					className="flex w-full max-w-3xl flex-col gap-2"
				>
					{entries.map((entry) => (
						<li
							key={entry.playerId}
							data-slot="scoreboard-entry"
							data-leader={entry.rank === 1}
							className={cn(
								"flex h-16 items-center gap-4 rounded-md px-5 font-black text-2xl shadow-lg sm:h-20 sm:text-4xl",
								entry.rank === 1
									? "bg-white text-neutral-900"
									: "bg-brand-strong text-white",
							)}
						>
							<span className="min-w-0 flex-1 truncate">{entry.nickname}</span>
							<span data-slot="scoreboard-total">{entry.total}</span>
							<span className="flex size-8 shrink-0 items-center justify-center">
								{entry.climbed && (
									<>
										<MoveUpIcon
											data-slot="scoreboard-climbed"
											aria-hidden="true"
											className="size-7 stroke-3"
										/>
										<span className="sr-only">subiu de posição</span>
									</>
								)}
							</span>
						</li>
					))}
				</ol>
			</div>
		</main>
	);
}
