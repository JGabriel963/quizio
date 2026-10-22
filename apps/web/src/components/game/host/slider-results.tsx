import type { PublicSliderScale } from "@quizio/core/game/domain/public-stage";
import type { SliderResults as SliderResultsData } from "@quizio/core/game/domain/slider-results";
import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, UserIcon } from "lucide-react";
import {
	type PointerEvent,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

import type { HostImageData } from "@/lib/api-types";
import { formatSliderNumber } from "@/lib/slider-format";
import {
	clampStripOffset,
	columnAtCenter,
	type SliderColumnKind,
	sliderColumns,
	stripOffsetFor,
} from "@/lib/slider-results";

import { StageImage } from "./stage-image";

/** The width of a column, as wide as a finger on a touch screen. */
const COLUMN_PX = 36;
/** The card's room on each side of the first and the last column. */
const CARD_PADDING_PX = 24;
/** A move shorter than this is a tap on a column, not a drag. */
const DRAG_SLOP_PX = 4;
/** After the wheel stops, the card settles on the nearest column. */
const WHEEL_SETTLE_MS = 150;
/** A column's foot under its dot (room for the numbers), the dot, and its bars' room. */
const FOOT_PX = 48;
const DOT_PX = 20;
const BAR_ROOM_PX = 128;
/** The tag sits right under the dots, over the card's bottom edge. */
const TAG_TOP_PX = 240 - 44;

const TAG_COLORS: Record<SliderColumnKind, string> = {
	answer: "bg-success",
	margin: "bg-answer-blue",
	outside: "bg-destructive",
};

const BAR_COLORS: Record<SliderColumnKind, string> = {
	answer: "bg-success",
	margin: "bg-answer-blue",
	outside: "bg-neutral-400",
};

/**
 * The host's scale while the players answer (spec 032, RN-30): the ends of
 * the scale and a "?" that wanders over it, which says nothing about the
 * answers.
 */
export function SliderAnswering({ scale }: { scale: PublicSliderScale }) {
	return (
		<div
			data-slot="slider-answering"
			className="mx-auto mb-3 w-full max-w-md rounded-md bg-white px-6 pt-12 pb-2 text-neutral-900 shadow-lg"
		>
			<div className="relative flex h-16 items-end justify-between">
				<span
					aria-hidden="true"
					className="absolute bottom-full left-1/2 mb-1 flex size-10 -translate-x-1/2 items-center justify-center rounded-sm bg-answer-blue font-black text-2xl text-white motion-safe:animate-slider-wander"
				>
					?
				</span>
				{Array.from({ length: 21 }, (_, index) => (
					<span
						key={index}
						aria-hidden="true"
						className={cn(
							"h-full w-1 rounded-full",
							index === 0 || index === 20 ? "bg-neutral-700" : "bg-neutral-300",
						)}
					/>
				))}
			</div>
			<p className="mt-1 flex justify-between font-bold text-sm">
				<span>{formatSliderNumber(scale.first)}</span>
				<span>{formatSliderNumber(scale.last)}</span>
			</p>
		</div>
	);
}

/**
 * A slider's results on the host's screen, as in Kahoot (spec 032, RN-31,
 * RN-32): a white card with one column per position (bars where players
 * answered, dots where nobody did; blue in the margin over a light band, gray
 * outside it, the answer in green) and a number under every tenth position.
 * The card runs to the screen's edges and is dragged sideways, never with a
 * scroll bar; neither end of the scale passes the middle. The tag stays in the
 * middle and tells the column under it: its number, its unit and how many sent
 * it, in its color. It opens on the answer; letting go settles on the nearest
 * column, and a click brings that column to the middle. Pointing at a column
 * shows its number small, right over it. "Mostrar mídia" swaps it for the
 * image.
 */
export function SliderResults({
	scale,
	results,
	image,
}: {
	scale: PublicSliderScale;
	results: SliderResultsData;
	image: HostImageData | null;
}) {
	const columns = sliderColumns(scale, results);
	const answerIndex = Math.max(
		0,
		columns.findIndex(({ kind }) => kind === "answer"),
	);
	/** Pointed at: its number shows small right over it, as in Kahoot. */
	const [pointed, setPointed] = useState<number | null>(null);
	const [mediaShown, setMediaShown] = useState(false);
	const view = useRef<HTMLDivElement>(null);
	const [viewWidth, setViewWidth] = useState(0);
	const [offset, setOffset] = useState<number | null>(null);
	const [dragging, setDragging] = useState(false);
	const drag = useRef<{ x: number; from: number; moved: boolean } | null>(null);
	/** The last press was a drag: the click that ends it brings nothing. */
	const dragged = useRef(false);
	const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
	const unit = results.unit;
	const layout = {
		viewWidth,
		columnCount: columns.length,
		columnWidth: COLUMN_PX,
		padding: CARD_PADDING_PX,
	};

	// The view's width decides where the middle is; it follows the window.
	useLayoutEffect(() => {
		const element = view.current;
		if (!element) {
			return;
		}
		const measure = () => setViewWidth(element.clientWidth);
		measure();
		const observer =
			typeof ResizeObserver === "undefined"
				? null
				: new ResizeObserver(measure);
		observer?.observe(element);
		return () => observer?.disconnect();
	}, []);

	useEffect(
		() => () => {
			if (settle.current) {
				clearTimeout(settle.current);
			}
		},
		[],
	);

	const shownOffset =
		offset === null
			? stripOffsetFor({ ...layout, index: answerIndex })
			: clampStripOffset(offset, layout);
	const centered = columnAtCenter(shownOffset, layout);
	const current = columns[centered];

	const moveTo = (next: number) => setOffset(clampStripOffset(next, layout));
	/** Brings a column to the middle, where the tag is. */
	const bring = (index: number) =>
		setOffset(stripOffsetFor({ ...layout, index }));

	function onPointerDown(event: PointerEvent<HTMLDivElement>) {
		drag.current = { x: event.clientX, from: shownOffset, moved: false };
	}

	function onPointerMove(event: PointerEvent<HTMLDivElement>) {
		const pressed = drag.current;
		if (!pressed) {
			return;
		}
		const distance = event.clientX - pressed.x;
		if (!pressed.moved && Math.abs(distance) < DRAG_SLOP_PX) {
			return;
		}
		if (!pressed.moved) {
			pressed.moved = true;
			setDragging(true);
			event.currentTarget.setPointerCapture?.(event.pointerId);
		}
		moveTo(pressed.from + distance);
	}

	function onPointerEnd() {
		dragged.current = drag.current?.moved ?? false;
		drag.current = null;
		if (dragged.current) {
			setDragging(false);
			bring(centered);
		}
	}

	function onWheel(delta: number) {
		setDragging(true);
		moveTo(shownOffset - delta);
		if (settle.current) {
			clearTimeout(settle.current);
		}
		settle.current = setTimeout(() => {
			setDragging(false);
			setOffset((now) => {
				const at = now === null ? shownOffset : clampStripOffset(now, layout);
				return stripOffsetFor({ ...layout, index: columnAtCenter(at, layout) });
			});
		}, WHEEL_SETTLE_MS);
	}

	const told = (value: number) =>
		unit ? `${formatSliderNumber(value)} ${unit}` : formatSliderNumber(value);

	return (
		<div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3">
			{mediaShown && image ? (
				<div className="flex min-h-0 flex-1 items-center justify-center">
					<StageImage image={image} />
				</div>
			) : (
				<section
					aria-label="Respostas no controle deslizante"
					className="w-full"
				>
					<div
						ref={view}
						data-slot="slider-results-view"
						// Not clipped here: the card runs to the screen's edges, and the
						// game screen keeps the page from scrolling sideways.
						className="relative h-80 w-full cursor-grab touch-pan-y active:cursor-grabbing"
						onPointerDown={onPointerDown}
						onPointerMove={onPointerMove}
						onPointerUp={onPointerEnd}
						onPointerCancel={onPointerEnd}
						onWheel={(event) => onWheel(event.deltaX || event.deltaY)}
					>
						<ol
							data-slot="slider-results-card"
							className={cn(
								"absolute top-0 left-0 flex h-60 items-end rounded-xl bg-white text-neutral-900 shadow-lg",
								!dragging && "transition-transform duration-300 ease-out",
							)}
							style={{
								transform: `translateX(${shownOffset}px)`,
								paddingInline: CARD_PADDING_PX,
							}}
						>
							{columns.map(({ value, count, kind, height, marked }, index) => {
								const bar = count > 0;
								// How high the bar or the dot reaches, from the column's foot.
								const reach =
									FOOT_PX +
									(bar ? Math.max(height, 0.12) * BAR_ROOM_PX : DOT_PX);
								return (
									<li
										key={value}
										data-kind={kind}
										className={cn(
											"relative flex h-44 justify-center pb-12",
											// The margin's light band, from the top to just under the dots.
											kind !== "outside" &&
												"before:absolute before:inset-x-0 before:top-0 before:bottom-9 before:bg-answer-blue/15",
											kind !== "outside" &&
												columns[index - 1]?.kind === "outside" &&
												"before:rounded-l-sm",
											kind !== "outside" &&
												columns[index + 1]?.kind === "outside" &&
												"before:rounded-r-sm",
										)}
										style={{ width: COLUMN_PX }}
									>
										{kind === "answer" && (
											<CheckIcon
												aria-hidden="true"
												data-slot="slider-answer-check"
												// Right over its bar or dot: the bars never grow past the card.
												className="absolute z-10 size-6 rounded-full bg-success p-1 text-white"
												style={{ bottom: reach + 4 }}
											/>
										)}
										<button
											type="button"
											aria-label={`${told(value)}: ${count} ${count === 1 ? "resposta" : "respostas"}`}
											aria-pressed={index === centered}
											className="relative flex h-full w-full items-end justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
											onMouseEnter={() => setPointed(value)}
											onMouseLeave={() => setPointed(null)}
											onFocus={(event) => {
												if (event.currentTarget.matches(":focus-visible")) {
													bring(index);
												}
											}}
											onClick={() => {
												if (dragged.current) {
													dragged.current = false;
													return;
												}
												bring(index);
											}}
										>
											{bar ? (
												<span
													data-slot="slider-bar"
													className={cn(
														"w-5 origin-bottom rounded-full motion-safe:animate-bar-grow",
														BAR_COLORS[kind],
														// Under the tag, outside the margin: red, as the tag (RN-31).
														kind === "outside" &&
															index === centered &&
															"bg-destructive",
													)}
													style={{
														height: `${Math.max(height, 0.12) * 100}%`,
													}}
												/>
											) : (
												<span
													data-slot="slider-dot"
													className={cn(
														"relative size-5 rounded-full",
														kind === "answer"
															? "bg-success"
															: kind === "margin"
																? "bg-answer-blue"
																: index === centered
																	? "bg-destructive"
																	: marked
																		? "bg-neutral-500"
																		: "bg-neutral-300",
													)}
												/>
											)}
										</button>
										{marked && index !== centered && (
											<span
												data-slot="slider-mark"
												aria-hidden="true"
												className="pointer-events-none absolute bottom-4 font-bold text-neutral-500 text-sm"
											>
												{formatSliderNumber(value)}
											</span>
										)}
										{pointed === value && index !== centered && (
											<span
												data-slot="slider-pointed"
												aria-hidden="true"
												className={cn(
													"pointer-events-none absolute z-10 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-bold text-white text-xs",
													TAG_COLORS[kind],
												)}
												style={{ bottom: reach + 6 }}
											>
												{formatSliderNumber(value)}
											</span>
										)}
									</li>
								);
							})}
						</ol>
						{current && (
							<span
								data-slot="slider-tag"
								data-kind={current.kind}
								className="pointer-events-none absolute left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1"
								style={{ top: TAG_TOP_PX }}
							>
								<span
									aria-hidden="true"
									className={cn(
										// The same transition as the tag's body: they change together.
										"-mb-2.5 size-3 rotate-45 transition-colors",
										TAG_COLORS[current.kind],
									)}
								/>
								<span
									className={cn(
										"flex flex-col items-center whitespace-nowrap rounded-sm px-3 py-1 font-black text-3xl text-white shadow-md transition-colors",
										TAG_COLORS[current.kind],
									)}
								>
									{formatSliderNumber(current.value)}
									{unit && <span className="font-bold text-sm">{unit}</span>}
								</span>
								<span className="flex items-center gap-1 rounded-sm bg-neutral-800 px-2 font-bold text-sm text-white">
									<UserIcon aria-hidden="true" className="size-3.5" />
									{current.count}
								</span>
							</span>
						)}
					</div>
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
