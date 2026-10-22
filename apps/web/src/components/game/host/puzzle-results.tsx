import { Button } from "@quizio/ui/components/button";
import { CheckIcon, XIcon } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";

import type { HostImageData, HostStageData } from "@/lib/api-types";
import { usePrefersReducedMotion } from "@/lib/game-motion";

import { PuzzleBlock, PuzzleBlockCheck } from "../puzzle-block";
import { StageImage } from "./stage-image";

interface PuzzleChoice {
	id: string;
	shapeIndex: number;
	text: string;
}

/** How long the drawn order stays before the blocks slide into the right one. */
export const PUZZLE_REVEAL_MS = 800;

/** A puzzle's answers stacked in the drawn order, during the answers (spec 033, RN-25). */
export function PuzzleAnswering({
	choices,
}: {
	choices: readonly PuzzleChoice[];
}) {
	return (
		<ol
			aria-label="Respostas"
			className="flex w-full max-w-md flex-col justify-center gap-2"
		>
			{choices.map((choice) => (
				<li key={choice.id}>
					<PuzzleBlock
						shapeIndex={choice.shapeIndex}
						text={choice.text}
						className="min-h-[clamp(3.5rem,11svh,6rem)] text-xl sm:text-2xl"
					/>
				</li>
			))}
		</ol>
	);
}

/**
 * A puzzle's results (spec 033, RN-26, RN-27): the blocks slide from the drawn
 * order into the right one, each with the color and shape it was drawn with
 * and a ✓; beside them, how many got it right and wrong. Without `animate`
 * (reloaded in the results, reduced motion) they show in the right order at
 * once. "Mostrar mídia" swaps them for the image.
 */
export function PuzzleResults({
	choices,
	results,
	image,
	animate,
}: {
	/** In the drawn order. */
	choices: readonly PuzzleChoice[];
	results: NonNullable<HostStageData["puzzleResults"]>;
	image: HostImageData | null;
	animate: boolean;
}) {
	const reducedMotion = usePrefersReducedMotion();
	const [revealed, setRevealed] = useState(!animate || reducedMotion);
	const [mediaShown, setMediaShown] = useState(false);

	useEffect(() => {
		if (revealed) {
			return;
		}
		const timer = setTimeout(() => setRevealed(true), PUZZLE_REVEAL_MS);
		return () => clearTimeout(timer);
	}, [revealed]);

	const byId = new Map(choices.map((choice) => [choice.id, choice]));
	const shown = revealed
		? results.order.flatMap((id) => {
				const choice = byId.get(id);
				return choice ? [choice] : [];
			})
		: choices;
	const highest = Math.max(1, results.correct, results.wrong);

	return (
		<div className="flex min-w-0 flex-1 items-stretch justify-center gap-6 sm:gap-10">
			<div className="flex shrink-0 flex-col items-center justify-center gap-3">
				<ul
					aria-label="Acertos e erros"
					className="flex h-48 items-end gap-2 sm:h-72"
				>
					<ResultBar
						label={`${results.correct} acertaram`}
						count={results.correct}
						height={(results.correct / highest) * 100}
						className="bg-answer-correct"
						icon={<CheckIcon aria-hidden="true" className="size-4 stroke-3" />}
					/>
					<ResultBar
						label={`${results.wrong} erraram`}
						count={results.wrong}
						height={(results.wrong / highest) * 100}
						className="bg-answer-red"
						icon={<XIcon aria-hidden="true" className="size-4 stroke-3" />}
					/>
				</ul>
				{image && (
					<Button
						variant="game"
						size="sm"
						onClick={() => setMediaShown((current) => !current)}
					>
						{mediaShown ? "Ocultar mídia" : "Mostrar mídia"}
					</Button>
				)}
			</div>
			{mediaShown && image ? (
				<div className="flex min-w-0 flex-1 items-center justify-center">
					<StageImage image={image} />
				</div>
			) : (
				<ol
					aria-label="Ordem correta"
					className="flex w-full max-w-xl flex-col justify-center gap-2"
				>
					{shown.map((choice) => (
						<motion.li key={choice.id} layout transition={{ duration: 0.5 }}>
							<PuzzleBlock
								shapeIndex={choice.shapeIndex}
								text={choice.text}
								className="min-h-[clamp(3.5rem,11svh,6rem)] text-xl sm:text-2xl"
								end={revealed && <PuzzleBlockCheck />}
							/>
						</motion.li>
					))}
				</ol>
			)}
		</div>
	);
}

function ResultBar({
	label,
	count,
	height,
	className,
	icon,
}: {
	label: string;
	count: number;
	height: number;
	className: string;
	icon: ReactNode;
}) {
	return (
		<li
			aria-label={label}
			className="flex h-full w-16 flex-col justify-end sm:w-24"
		>
			<div
				className={`min-h-1 origin-bottom rounded-t-md motion-safe:animate-bar-grow ${className}`}
				style={{ height: `${height}%` }}
			/>
			<div
				className={`flex h-8 shrink-0 items-center justify-center gap-1 font-black text-lg text-white ${className}`}
			>
				<span>{count}</span>
				{icon}
			</div>
		</li>
	);
}
