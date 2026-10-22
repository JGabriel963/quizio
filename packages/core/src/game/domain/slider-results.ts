import { marginRange } from "../../shared/domain/slider-scale";
import type { Answer } from "./answer";
import type { GameSlider } from "./game-question";

/**
 * A slider's results (spec 032, RN-31): the answer, the margin range and how
 * many picked each position, only the positions somebody picked, by value.
 */
export interface SliderResults {
	answer: number;
	low: number;
	high: number;
	unit: string | null;
	counts: { value: number; count: number }[];
}

export function sliderResultsOf(
	slider: GameSlider,
	answers: readonly Pick<Answer, "value">[],
): SliderResults {
	const counts = new Map<number, number>();
	for (const { value } of answers) {
		if (value !== null) {
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}
	}
	return {
		answer: slider.answer,
		...marginRange(slider),
		unit: slider.unit,
		counts: [...counts]
			.map(([value, count]) => ({ value, count }))
			.sort((a, b) => a.value - b.value),
	};
}
