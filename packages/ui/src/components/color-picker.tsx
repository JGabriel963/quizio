import { Button } from "@quizio/ui/components/button";
import { Input } from "@quizio/ui/components/input";
import {
	type Hsv,
	hexToHsv,
	hsvToHex,
	parseHexInput,
} from "@quizio/ui/lib/color";
import { cn } from "@quizio/ui/lib/utils";
import {
	type KeyboardEvent,
	type PointerEvent,
	useId,
	useRef,
	useState,
} from "react";

const clamp = (value: number) => Math.min(1, Math.max(0, value));
/** Keyboard steps land on whole hundredths, never on 0.4999…. */
const stepped = (value: number) => clamp(Math.round(value * 100) / 100);

/**
 * A free color, as Kahoot's "Cores personalizadas" picker: the square for
 * saturation (sideways) and brightness (up and down), the hue bar, and the
 * hex code, confirmed with Ok. The square is a slider for the keyboard: the
 * arrows move it a step, with Shift ten.
 */
function ColorPicker({
	value,
	onConfirm,
	onCancel,
	className,
}: {
	/** `#rrggbb`. */
	value: string;
	onConfirm: (hex: string) => void;
	onCancel: () => void;
	className?: string;
}) {
	const hexId = useId();
	const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
	const [code, setCode] = useState(value.slice(1));
	const square = useRef<HTMLDivElement>(null);
	const hex = hsvToHex(hsv);

	const choose = (next: Hsv) => {
		setHsv(next);
		setCode(hsvToHex(next).slice(1));
	};

	const pickAt = (event: PointerEvent<HTMLDivElement>) => {
		const box = square.current?.getBoundingClientRect();
		if (!box || box.width === 0 || box.height === 0) {
			return;
		}
		choose({
			...hsv,
			s: clamp((event.clientX - box.left) / box.width),
			v: clamp(1 - (event.clientY - box.top) / box.height),
		});
	};

	const onSquareKey = (event: KeyboardEvent<HTMLDivElement>) => {
		const step = event.shiftKey ? 0.1 : 0.01;
		const moves: Record<string, Partial<Hsv>> = {
			ArrowLeft: { s: stepped(hsv.s - step) },
			ArrowRight: { s: stepped(hsv.s + step) },
			ArrowUp: { v: stepped(hsv.v + step) },
			ArrowDown: { v: stepped(hsv.v - step) },
		};
		const move = moves[event.key];
		if (move) {
			event.preventDefault();
			choose({ ...hsv, ...move });
		}
	};

	return (
		<div
			data-slot="color-picker"
			className={cn("flex w-64 flex-col gap-3", className)}
		>
			<div
				ref={square}
				role="slider"
				tabIndex={0}
				aria-label="Saturação e brilho"
				aria-valuetext={hex}
				aria-valuenow={Math.round(hsv.s * 100)}
				aria-valuemin={0}
				aria-valuemax={100}
				onKeyDown={onSquareKey}
				onPointerDown={(event) => {
					event.currentTarget.setPointerCapture?.(event.pointerId);
					pickAt(event);
				}}
				onPointerMove={(event) => {
					if (event.buttons === 1) {
						pickAt(event);
					}
				}}
				className="relative aspect-square w-full cursor-crosshair touch-none rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				style={{
					backgroundColor: `hsl(${hsv.h} 100% 50%)`,
					backgroundImage:
						"linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
				}}
			>
				<span
					aria-hidden="true"
					className="pointer-events-none absolute size-5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.4)]"
					style={{
						left: `${hsv.s * 100}%`,
						bottom: `${hsv.v * 100}%`,
						backgroundColor: hex,
					}}
				/>
			</div>
			<input
				type="range"
				aria-label="Matiz"
				min={0}
				max={359}
				step={1}
				value={Math.round(hsv.h)}
				onChange={(event) => choose({ ...hsv, h: Number(event.target.value) })}
				className="h-4 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgb(0_0_0/0.4)]"
				style={{
					background:
						"linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
				}}
			/>
			<div className="flex items-center gap-3">
				<label htmlFor={hexId} className="font-bold text-sm">
					Hex
				</label>
				<Input
					id={hexId}
					value={code}
					maxLength={7}
					spellCheck={false}
					onChange={(event) => {
						setCode(event.target.value);
						const typed = parseHexInput(event.target.value);
						if (typed) {
							setHsv(hexToHsv(typed));
						}
					}}
					className="font-mono"
				/>
			</div>
			<div className="grid grid-cols-2 gap-2">
				<Button type="button" variant="secondary" onClick={onCancel}>
					Cancelar
				</Button>
				<Button type="button" onClick={() => onConfirm(hex)}>
					Ok
				</Button>
			</div>
		</div>
	);
}

export { ColorPicker };
