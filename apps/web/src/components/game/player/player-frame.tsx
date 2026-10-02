import type { ReactNode } from "react";

import { QuestionTypeIcon } from "@/components/editor/question-type-icon";
import type { PlayerQuestionData } from "@/lib/api-types";
import { CountUp } from "@/lib/count-up";
import { questionTypeLabel } from "@/lib/quiz-labels";

import { GameScreen } from "../game-screen";
import { JoinNotice } from "./join-forms";

/**
 * The frame of the player's game screens: the question on top, the nickname
 * and the total of points at the bottom (spec 010, RN-16). The total counts
 * up when it changes (spec 011, RN-35).
 */
export function PlayerFrame({
	nickname,
	total,
	questionNumber,
	question,
	notice = null,
	children,
}: {
	nickname: string;
	/** Null where there is no game going on to have points in. */
	total: number | null;
	questionNumber?: number;
	question?: PlayerQuestionData | null;
	notice?: string | null;
	children: ReactNode;
}) {
	return (
		<GameScreen className="relative flex h-svh flex-col overflow-hidden">
			{question && questionNumber !== undefined && (
				<header className="flex h-14 shrink-0 items-center justify-between px-3">
					<span
						data-slot="question-number"
						aria-hidden="true"
						className="flex size-9 items-center justify-center rounded-full bg-white/90 font-black text-neutral-800"
					>
						{questionNumber}
					</span>
					<span className="flex items-center gap-2 rounded-full bg-white/90 py-1 pr-4 pl-2 font-bold text-neutral-800 text-sm">
						<QuestionTypeIcon type={question.type} className="h-7 w-5" />
						{questionTypeLabel(question.type)}
					</span>
					<span className="size-9" />
				</header>
			)}
			{children}
			<footer className="flex h-12 shrink-0 items-center gap-3 bg-black/40 px-4">
				<span data-slot="player-nickname" className="truncate font-bold">
					{nickname}
				</span>
				{total !== null && (
					<span className="rounded bg-black/40 px-2 py-0.5 font-bold text-sm">
						<span className="sr-only">Pontos: </span>
						<CountUp data-slot="player-total" value={total} />
					</span>
				)}
			</footer>
			<JoinNotice message={notice} />
		</GameScreen>
	);
}

/** The middle of a player's screen. `key` it by what it shows to replay the entrance. */
export function Centered({ children }: { children: ReactNode }) {
	return (
		<main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-6 text-center motion-safe:animate-stage-in">
			{children}
		</main>
	);
}
