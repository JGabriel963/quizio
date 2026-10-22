import {
	SLIDER_NUMBER_MAX_LENGTH,
	SLIDER_UNIT_MAX_LENGTH,
} from "@quizio/core/quiz/domain/question";
import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import {
	questionIssues,
	sliderScaleOf,
} from "@quizio/core/quiz/domain/question-issues";
import {
	marginRange,
	sliderStep,
} from "@quizio/core/shared/domain/slider-scale";
import { Button } from "@quizio/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import { CirclePlusIcon, CircleQuestionMarkIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { QuestionData } from "@/lib/api-types";
import { SLIDER_MAX_HINT, SLIDER_MIN_HINT } from "@/lib/question-labels";
import { formatSliderNumber, sliderFieldText } from "@/lib/slider-format";

type SliderQuestionData = Extract<QuestionData, { type: "slider" }>;

/** A sign, digits, one separator and up to 2 decimals, as the field is typed (spec 032, RN-04). */
const TYPING = /^[-−]?\d*(?:[.,]\d{0,2})?$/;

function typeable(text: string): boolean {
	return text.length <= SLIDER_NUMBER_MAX_LENGTH && TYPING.test(text);
}

/** Hundredths, so that steps never grow ghost decimals. */
const hundredths = (value: number) => Math.round(value * 100);

/** The editor's ticks: from the min by whole steps, up to the max (RN-07). */
function editorPositions(min: number, max: number): number[] {
	const step = hundredths(sliderStep(min, max));
	const positions: number[] = [];
	for (let at = hundredths(min); at <= hundredths(max); at += step) {
		positions.push(at / 100);
	}
	return positions;
}

/**
 * The scale of a slider in the editor (spec 032, RN-06 to RN-12, RN-16), as
 * in Kahoot: the answer is typed in a floating balloon; until it is there, the
 * min and the max wait disabled, and the first answer brings its own range.
 * Pointing at a tick tells its number at once. The margin and the step show
 * below.
 */
export function SliderAnswers({
	question,
	onChange,
}: {
	question: SliderQuestionData;
	onChange: (change: QuestionChange) => void;
}) {
	const { min, max, answer, unit } = question;
	const issues = questionIssues(question);
	const validRange = !issues.includes("invalidSliderRange");
	const scale = sliderScaleOf(question);
	const range = scale && marginRange(scale);
	const step =
		validRange && min !== null && max !== null ? sliderStep(min, max) : null;
	const positions =
		validRange && min !== null && max !== null ? editorPositions(min, max) : [];
	/** "Adicionar resposta" was pressed: the balloon waits for the number. */
	const [adding, setAdding] = useState(false);
	const noAnswer = answer === null;

	// About numbers just typed, so they show at once, even in a question just
	// started, as in Kahoot (spec 032, RN-16).
	const outOfRange = issues.includes("sliderAnswerOutOfRange");
	const maxError =
		!noAnswer && (!validRange || (outOfRange && max !== null && answer > max));
	const minError = outOfRange && !noAnswer && min !== null && answer < min;

	const commitNumber = (field: "min" | "max" | "answer", text: string | null) =>
		onChange({ kind: "sliderNumber", field, value: text });

	const markerAt =
		answer !== null && min !== null && max !== null && validRange
			? Math.min(1, Math.max(0, (answer - min) / (max - min)))
			: 0.5;

	return (
		<section
			aria-label="Controle deslizante"
			className="flex flex-col items-center gap-2"
		>
			{/*
				As in Kahoot: a short card whose answer balloon floats above it, with
				room at the bottom only for the error, so it never pushes anything.
			*/}
			<div className="relative w-full rounded-md bg-card px-3 pt-3 pb-7 shadow-md sm:px-4">
				<div className="flex items-stretch gap-3">
					<SliderNumberField
						key={`min:${min}`}
						label="Mínimo"
						value={min}
						disabled={noAnswer}
						invalid={minError}
						onCommit={(text) => commitNumber("min", text)}
					/>
					<div className="relative min-h-14 flex-1">
						{noAnswer && !adding ? (
							<Button
								variant="outline"
								className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2"
								onClick={() => setAdding(true)}
							>
								<CirclePlusIcon data-icon="inline-start" aria-hidden="true" />
								Adicionar resposta
							</Button>
						) : (
							<AnswerBalloon
								key={`answer:${answer}`}
								value={answer}
								unit={unit}
								at={markerAt}
								onCommitValue={(text) => {
									setAdding(false);
									if (text !== null) {
										commitNumber("answer", text);
									}
								}}
								onCommitUnit={(text) => onChange({ kind: "sliderUnit", text })}
							/>
						)}
						<div
							data-slot="slider-track"
							className="absolute inset-0 flex items-stretch"
						>
							{(positions.length > 0
								? positions
								: Array.from({ length: 51 }, (_, i) => i)
							).map((position) => {
								const inMargin =
									range !== null &&
									position >= range.low &&
									position <= range.high;
								return (
									<Tick
										key={position}
										value={position}
										inMargin={inMargin}
										labelled={positions.length > 0}
									/>
								);
							})}
						</div>
					</div>
					<SliderNumberField
						key={`max:${max}`}
						label="Máximo"
						value={max}
						disabled={noAnswer}
						invalid={maxError}
						onCommit={(text) => commitNumber("max", text)}
					/>
				</div>
				{(maxError || minError) && (
					<p
						role="alert"
						className="absolute inset-x-0 bottom-1.5 text-center text-destructive text-sm"
					>
						{maxError ? SLIDER_MAX_HINT : SLIDER_MIN_HINT}
					</p>
				)}
			</div>
			{/* Its height is kept even before the answer: nothing moves when it fills. */}
			<div
				data-slot="slider-indicators"
				className="flex min-h-7 flex-wrap justify-center gap-2"
			>
				{scale && step !== null && range && scale.margin !== "none" && (
					<Indicator
						label={`Margem de resposta: ${formatSliderNumber(range.low, { whole: true })} a ${formatSliderNumber(range.high, { whole: true })}`}
						help="As respostas nesta faixa valem pontos. Quanto mais perto da resposta, mais pontos."
					/>
				)}
				{scale && step !== null && (
					<Indicator
						label={`Valor da etapa: ${formatSliderNumber(step)}`}
						help="A distância entre duas posições do controle. Ela é calculada a partir do mínimo e do máximo."
					/>
				)}
			</div>
		</section>
	);
}

/**
 * A tick of the scale. Pointing at it darkens it and tells its number below
 * at once, as in Kahoot (no delay, so it is not the design system's Tooltip).
 */
function Tick({
	value,
	inMargin,
	labelled,
}: {
	value: number;
	inMargin: boolean;
	labelled: boolean;
}) {
	return (
		<span
			data-slot="slider-tick"
			data-in-margin={inMargin || undefined}
			className={cn(
				"group relative flex flex-1 justify-center py-1",
				// The margin's light band behind its ticks, as in Kahoot (RN-12).
				inMargin && "bg-answer-blue/10",
			)}
		>
			<span
				className={cn(
					"w-[3px] rounded-full",
					inMargin
						? "bg-answer-blue group-hover:bg-answer-blue/70"
						: "bg-foreground/20 group-hover:bg-foreground/70",
				)}
			/>
			{labelled && (
				<span
					data-slot="slider-tick-value"
					className="pointer-events-none absolute top-full z-10 mt-1 hidden whitespace-nowrap rounded-sm bg-foreground/70 px-1.5 py-0.5 font-bold text-background text-xs group-hover:block"
				>
					{formatSliderNumber(value)}
				</span>
			)}
		</span>
	);
}

function Indicator({ label, help }: { label: string; help: string }) {
	return (
		<p className="flex items-center gap-1 rounded-sm bg-foreground/85 px-2 py-1 text-background text-xs">
			<span className="font-bold">{label}</span>
			<Tooltip>
				<TooltipTrigger
					render={
						<button
							type="button"
							aria-label={`Sobre: ${label}`}
							className="rounded-full"
						/>
					}
				>
					<CircleQuestionMarkIcon aria-hidden="true" className="size-3.5" />
				</TooltipTrigger>
				<TooltipContent className="max-w-60">{help}</TooltipContent>
			</Tooltip>
		</p>
	);
}

/** A number typed with a comma or a dot, saved when the field is left (RN-04). */
function SliderNumberField({
	label,
	value,
	disabled,
	invalid,
	onCommit,
}: {
	label: string;
	value: number | null;
	/** Until the answer is there, the range is not set by hand (RN-06). */
	disabled: boolean;
	invalid: boolean;
	onCommit: (text: string | null) => void;
}) {
	const [text, setText] = useState(sliderFieldText(value));
	const commit = () => {
		if (text === sliderFieldText(value)) {
			return;
		}
		const trimmed = text.trim();
		onCommit(
			trimmed === "" || trimmed === "-" || trimmed === "−" ? null : trimmed,
		);
	};
	return (
		<label
			className={cn(
				"flex w-20 flex-col gap-1 font-bold text-sm sm:w-24",
				disabled && "text-muted-foreground",
			)}
		>
			{label}
			<input
				inputMode="decimal"
				value={text}
				disabled={disabled}
				aria-invalid={invalid || undefined}
				className={cn(
					"h-10 w-full rounded-sm border border-input bg-card px-2 font-normal disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
					invalid &&
						"border-destructive bg-destructive/5 ring-1 ring-destructive",
				)}
				onChange={(event) => {
					if (typeable(event.target.value)) {
						setText(event.target.value);
					}
				}}
				onBlur={commit}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.currentTarget.blur();
					}
				}}
			/>
		</label>
	);
}

/**
 * The answer in a blue balloon pointing down at its tick, as in Kahoot
 * (RN-05, RN-07): its number is typed in place, the unit added under it.
 * Without an answer it opens empty and focused; leaving it empty gives the
 * "Adicionar resposta" button back.
 */
function AnswerBalloon({
	value,
	unit,
	at,
	onCommitValue,
	onCommitUnit,
}: {
	value: number | null;
	unit: string | null;
	/** From 0 (the min) to 1 (the max). */
	at: number;
	onCommitValue: (text: string | null) => void;
	onCommitUnit: (text: string | null) => void;
}) {
	const [text, setText] = useState(sliderFieldText(value));
	const [editingUnit, setEditingUnit] = useState(false);
	const [unitText, setUnitText] = useState(unit ?? "");
	const valueField = useRef<HTMLInputElement>(null);
	const unitField = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (value === null) {
			valueField.current?.focus();
		}
	}, [value]);
	useEffect(() => {
		if (editingUnit) {
			unitField.current?.focus();
		}
	}, [editingUnit]);

	// The typed unit stays on screen before its save comes back: no flicker.
	const showUnit = unit !== null || editingUnit || unitText.trim() !== "";

	return (
		<div
			data-slot="answer-balloon"
			className="absolute bottom-full z-10 mb-2 flex w-36 -translate-x-1/2 flex-col items-stretch gap-0.5 rounded-md bg-answer-blue px-2 py-1 text-white shadow-md after:absolute after:top-full after:left-1/2 after:size-2.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:bg-answer-blue"
			style={{ left: `${at * 100}%` }}
		>
			<input
				ref={valueField}
				aria-label="Resposta"
				inputMode="decimal"
				value={text}
				className="relative z-10 w-full bg-transparent text-center font-black text-xl outline-none placeholder:text-white/60"
				placeholder="0"
				onChange={(event) => {
					if (typeable(event.target.value)) {
						setText(event.target.value);
					}
				}}
				onBlur={() => {
					const trimmed = text.trim();
					if (trimmed === "" || trimmed === "-" || trimmed === "−") {
						setText(sliderFieldText(value));
						if (value === null) {
							onCommitValue(null);
						}
					} else if (trimmed !== sliderFieldText(value)) {
						onCommitValue(trimmed);
					}
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.currentTarget.blur();
					}
				}}
			/>
			{value === null ? null : showUnit ? (
				<input
					ref={unitField}
					aria-label="Unidade"
					value={unitText}
					maxLength={SLIDER_UNIT_MAX_LENGTH}
					className="relative z-10 w-full rounded-sm bg-white/15 px-1 py-0.5 text-center font-bold text-xs outline-none"
					onChange={(event) => setUnitText(event.target.value)}
					onBlur={() => {
						setEditingUnit(false);
						const next = unitText.trim() === "" ? null : unitText.trim();
						if (next !== unit) {
							onCommitUnit(next);
						}
					}}
				/>
			) : (
				<button
					type="button"
					className="relative z-10 w-full rounded-sm bg-black/20 px-1 py-0.5 font-bold text-xs hover:bg-black/30"
					onClick={() => setEditingUnit(true)}
				>
					Adicionar unidade
				</button>
			)}
		</div>
	);
}
