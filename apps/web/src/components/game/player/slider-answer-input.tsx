import type { PublicSliderScale } from "@quizio/core/game/domain/public-stage";
import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon, PointerIcon } from "lucide-react";
import {
	type KeyboardEvent,
	type PointerEvent,
	useMemo,
	useRef,
	useState,
} from "react";

import {
	formatSliderNumber,
	sliderMarkIndexes,
	sliderPositions,
} from "@/lib/slider-format";
import { useHoldRepeat } from "@/lib/use-hold-repeat";

/** The width of one position on the zoomed scale, wide enough for a thumb. */
const TICK_PX = 22;
/** Page Up and Page Down move this many positions (spec 032, RN-25). */
const PAGE = 10;

/**
 * A slider's answer on a device (spec 032, RN-24 to RN-26): a big marker with
 * the number and the unit over a zoomed scale that runs under it while it is
 * dragged; buttons with the limits that move one position (and keep going
 * while held); arrows and Page keys; and "Enviar", which sends the marker's
 * position. A hand shows the gesture until the scale is first touched.
 */
export function SliderAnswerInput({
	scale,
	onSubmit,
}: {
	scale: PublicSliderScale;
	onSubmit: (value: number) => void;
}) {
	const positions = useMemo(() => sliderPositions(scale), [scale]);
	const marks = useMemo(() => sliderMarkIndexes(scale), [scale]);
	const last = positions.length - 1;
	const [index, setIndex] = useState(() =>
		Math.max(0, positions.indexOf(scale.start)),
	);
	const indexRef = useRef(index);
	const [touched, setTouched] = useState(false);
	const drag = useRef<{ x: number; from: number } | null>(null);
	const value = positions[index] ?? scale.start;

	/** Moves by `delta` positions; false when it was already at that end. */
	const move = (delta: number): boolean => {
		const next = Math.min(last, Math.max(0, indexRef.current + delta));
		if (next === indexRef.current) {
			return false;
		}
		indexRef.current = next;
		setIndex(next);
		return true;
	};
	const left = useHoldRepeat(() => move(-1));
	const right = useHoldRepeat(() => move(1));

	function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		const delta = {
			ArrowLeft: -1,
			ArrowDown: -1,
			ArrowRight: 1,
			ArrowUp: 1,
			PageDown: -PAGE,
			PageUp: PAGE,
			Home: -last,
			End: last,
		}[event.key];
		if (delta !== undefined) {
			event.preventDefault();
			setTouched(true);
			move(delta);
		}
	}

	function onPointerDown(event: PointerEvent<HTMLDivElement>) {
		event.currentTarget.setPointerCapture?.(event.pointerId);
		setTouched(true);
		drag.current = { x: event.clientX, from: indexRef.current };
	}

	function onPointerMove(event: PointerEvent<HTMLDivElement>) {
		if (drag.current) {
			// Dragging left brings the higher numbers under the marker.
			const steps = Math.round((drag.current.x - event.clientX) / TICK_PX);
			move(drag.current.from + steps - indexRef.current);
		}
	}

	const text = formatSliderNumber(value);
	const unit = scale.unit;

	return (
		// Room on top for the tag, which floats over the scale.
		<div className="flex w-full flex-col items-center gap-4 pt-24">
			<div className="relative w-full">
				{/* The tag, as the host's, pointing down at its tick (spec 032, RN-24). */}
				<div
					data-slot="slider-tag"
					className="absolute bottom-full left-1/2 z-10 mb-1 flex -translate-x-1/2 flex-col items-center"
				>
					<div className="flex min-w-24 flex-col items-center rounded-sm bg-answer-blue px-3 py-1 text-white shadow-md">
						<span className="font-black text-4xl leading-tight">{text}</span>
						{unit && <span className="font-bold text-sm">{unit}</span>}
					</div>
					<span
						aria-hidden="true"
						className="-mt-1.5 size-3 rotate-45 bg-answer-blue"
					/>
				</div>
				<div
					role="slider"
					tabIndex={0}
					aria-label="Sua resposta"
					aria-valuemin={scale.first}
					aria-valuemax={scale.last}
					aria-valuenow={value}
					aria-valuetext={unit ? `${text} ${unit}` : text}
					className="relative h-28 w-full touch-none overflow-hidden bg-white shadow-md outline-none focus-visible:ring-4 focus-visible:ring-ring/60"
					onKeyDown={onKeyDown}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={() => {
						drag.current = null;
					}}
					onPointerCancel={() => {
						drag.current = null;
					}}
				>
					<div
						aria-hidden="true"
						className="absolute inset-y-2 left-1/2 flex transition-transform duration-75 motion-reduce:transition-none"
						style={{
							transform: `translateX(${-(index * TICK_PX + TICK_PX / 2)}px)`,
						}}
					>
						{positions.map((position, at) => {
							// A number under every tenth tick, as in Kahoot.
							const marked = marks.has(at);
							return (
								<span
									key={position}
									// Fixed: a number under it never widens the column and
									// moves the ticks off the tag.
									className="flex min-w-0 shrink-0 flex-col items-center gap-1"
									style={{ width: TICK_PX }}
								>
									<span
										className={cn(
											"w-1.5 flex-1 rounded-full",
											at === index
												? "bg-answer-blue"
												: marked
													? "bg-neutral-500"
													: "bg-neutral-300",
										)}
									/>
									<span
										data-slot="slider-mark"
										className="h-4 whitespace-nowrap font-bold text-neutral-500 text-xs"
									>
										{marked ? formatSliderNumber(position) : null}
									</span>
								</span>
							);
						})}
					</div>
				</div>
				{!touched && (
					<PointerIcon
						aria-hidden="true"
						data-slot="slider-hint"
						className="absolute top-1/2 left-1/2 size-12 fill-white text-neutral-900 motion-safe:animate-slider-hint"
					/>
				)}
			</div>
			<div className="flex w-full justify-between">
				<Button
					variant="game"
					aria-label={`Diminuir, até ${formatSliderNumber(scale.min)}`}
					{...left}
				>
					<ChevronLeftIcon data-icon="inline-start" aria-hidden="true" />
					{formatSliderNumber(scale.min)}
				</Button>
				<Button
					variant="game"
					aria-label={`Aumentar, até ${formatSliderNumber(scale.max)}`}
					{...right}
				>
					{formatSliderNumber(scale.max)}
					<ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
				</Button>
			</div>
			<Button variant="secondary" size="lg" onClick={() => onSubmit(value)}>
				Enviar
			</Button>
		</div>
	);
}
