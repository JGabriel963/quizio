import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import type { HostImageData, TypedAnswerTagData } from "@/lib/api-types";
import { usePrefersReducedMotion } from "@/lib/game-motion";
import { scatterTags, tagColorAt } from "@/lib/typed-answers-reveal";

import { StageImage } from "./stage-image";

/** How long every answer stays on the screen before the wrong ones leave (RN-23). */
export const REVEAL_WRONG_MS = 1_500;

/**
 * The results of a type answer (spec 031, RN-23 to RN-25): every answer sent
 * comes in scattered over the screen, the wrong ones leave, and the correct
 * ones gather under "As respostas corretas são:" with how many sent each.
 * Without `animate` (reloaded in the results, reduced motion) it goes
 * straight to the correct ones. "Mostrar mídia" swaps them for the image.
 */
export function TypedAnswersReveal({
	tags,
	image,
	seed,
	animate,
}: {
	tags: TypedAnswerTagData[];
	image: HostImageData | null;
	/** Names the question: the same one always scatters the same way. */
	seed: string;
	animate: boolean;
}) {
	const reducedMotion = usePrefersReducedMotion();
	const [showAll, setShowAll] = useState(animate && !reducedMotion);
	const [mediaShown, setMediaShown] = useState(false);

	useEffect(() => {
		if (!showAll) {
			return;
		}
		const timer = setTimeout(() => setShowAll(false), REVEAL_WRONG_MS);
		return () => clearTimeout(timer);
	}, [showAll]);

	const places = scatterTags(tags.length, seed);
	const correct = tags.filter((tag) => tag.correct);

	return (
		<div className="flex min-w-0 flex-1 flex-col items-center gap-3">
			{mediaShown && image ? (
				<div className="flex min-h-0 flex-1 items-center justify-center">
					<StageImage image={image} />
				</div>
			) : showAll ? (
				<ul
					aria-label="Respostas enviadas"
					className="relative min-h-48 w-full flex-1"
				>
					<AnimatePresence>
						{tags.map((tag, index) => {
							const place = places[index];
							return (
								<motion.li
									key={tag.text}
									initial={{ opacity: 0, scale: 0.6 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.6 }}
									style={{
										left: `${place?.x ?? 0}%`,
										top: `${place?.y ?? 0}%`,
										rotate: place?.rotate ?? 0,
									}}
									className={cn(
										"absolute -translate-x-1/2 -translate-y-1/2 rounded-sm px-4 py-2 font-black text-2xl text-white shadow-lg sm:text-4xl",
										tagColorAt(index),
									)}
								>
									{tag.text}
								</motion.li>
							);
						})}
					</AnimatePresence>
				</ul>
			) : (
				<section
					aria-labelledby="correct-answers"
					className="flex min-h-0 w-full flex-1 flex-col items-center gap-4"
				>
					<h2 id="correct-answers" className="font-bold text-lg">
						As respostas corretas são:
					</h2>
					<ul className="flex flex-wrap justify-center gap-x-6 gap-y-8 pt-4">
						{correct.map((tag, index) => (
							<motion.li
								key={tag.text}
								layout
								initial={animate ? { scale: 0.8 } : false}
								animate={{ scale: 1 }}
								className={cn(
									"relative rounded-sm px-5 py-3 font-black text-3xl text-white shadow-lg sm:text-5xl",
									tagColorAt(index),
								)}
							>
								<span
									className={cn(
										"absolute -top-5 -left-3 flex items-center gap-1 rounded-full px-3 py-0.5 text-2xl ring-2 ring-white/40",
										tagColorAt(index),
									)}
								>
									<span aria-hidden="true">{tag.count}</span>
									<span className="sr-only">
										{tag.count} {tag.count === 1 ? "jogador" : "jogadores"}
									</span>
									<CheckIcon aria-hidden="true" className="size-6 stroke-3" />
								</span>
								{tag.text}
							</motion.li>
						))}
					</ul>
				</section>
			)}
			{image && (
				<Button
					variant="game"
					size="sm"
					onClick={() => setMediaShown((shown) => !shown)}
				>
					{mediaShown ? "Ocultar mídia" : "Mostrar mídia"}
				</Button>
			)}
		</div>
	);
}
