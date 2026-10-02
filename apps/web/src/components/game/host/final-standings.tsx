import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { ChevronLeftIcon } from "lucide-react";

import type { FinalStandingData } from "@/lib/api-types";

/**
 * Everybody who played, from the first to the last (spec 011, RN-14). It is
 * what the host has until the reports exist.
 */
export function FinalStandings({
	standings,
	onBack,
}: {
	standings: readonly FinalStandingData[];
	onBack: () => void;
}) {
	return (
		<main className="relative flex min-h-0 flex-1 flex-col motion-safe:animate-stage-in">
			<div className="flex p-2 sm:p-4">
				<Button variant="game" onClick={onBack}>
					<ChevronLeftIcon aria-hidden="true" />
					Voltar ao pódio
				</Button>
			</div>
			<h1 className="px-4 pb-3 text-center font-black text-3xl sm:text-4xl">
				Classificação final
			</h1>
			<div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 pb-6">
				<ol
					aria-label="Classificação final"
					className="flex h-fit w-full max-w-3xl flex-col gap-2"
				>
					{standings.map((standing) => (
						<li
							key={standing.playerId}
							data-slot="standing"
							className={cn(
								"flex h-14 shrink-0 items-center gap-4 rounded-md px-4 font-black text-xl shadow-lg sm:text-2xl",
								standing.rank === 1
									? "bg-white text-neutral-900"
									: "bg-brand-strong text-white",
							)}
						>
							<span data-slot="standing-rank" className="w-12 shrink-0">
								{standing.rank}º
							</span>
							<span className="min-w-0 flex-1 truncate">
								{standing.nickname}
							</span>
							<span className="sr-only">Pontos: </span>
							<span data-slot="standing-total">{standing.total}</span>
						</li>
					))}
				</ol>
			</div>
		</main>
	);
}
