import { cn } from "@quizio/ui/lib/utils";

import { percentLabel } from "@/lib/report-labels";

const SIZES = {
	sm: { box: 28, stroke: 4 },
	lg: { box: 144, stroke: 12 },
} as const;

/**
 * Right answers as a ring: green over red in the lists, as in Kahoot, and
 * green over a quiet track in the summary. The number is always written
 * beside or inside it, and the drawing itself says nothing to a screen reader
 * (spec 015, RN-55).
 */
export function AccuracyRing({
	percent,
	size = "sm",
	caption,
	className,
}: {
	/** Null when there was nothing to answer: a dash, and an empty ring. */
	percent: number | null;
	size?: keyof typeof SIZES;
	/** Under the number of the large ring: "correto". */
	caption?: string;
	className?: string;
}) {
	const { box, stroke } = SIZES[size];
	const radius = (box - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const filled = ((percent ?? 0) / 100) * circumference;
	const label = percentLabel(percent);

	const ring = (
		<svg
			data-slot="accuracy-ring"
			aria-hidden="true"
			viewBox={`0 0 ${box} ${box}`}
			width={box}
			height={box}
			className="shrink-0 -rotate-90"
		>
			<circle
				cx={box / 2}
				cy={box / 2}
				r={radius}
				fill="none"
				strokeWidth={stroke}
				className={
					size === "sm" && percent !== null
						? "stroke-destructive"
						: "stroke-muted"
				}
			/>
			{percent !== null && percent > 0 && (
				<circle
					cx={box / 2}
					cy={box / 2}
					r={radius}
					fill="none"
					strokeWidth={stroke}
					strokeLinecap={size === "lg" ? "round" : "butt"}
					strokeDasharray={`${filled} ${circumference - filled}`}
					className="stroke-success"
				/>
			)}
		</svg>
	);

	if (size === "lg") {
		return (
			<div
				className={cn("relative grid shrink-0 place-items-center", className)}
				style={{ width: box, height: box }}
			>
				{ring}
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className="font-black text-3xl leading-none">{label}</span>
					{caption && percent !== null && (
						<span className="font-bold text-sm">{caption}</span>
					)}
				</div>
			</div>
		);
	}

	return (
		<span className={cn("inline-flex items-center gap-2", className)}>
			{ring}
			<span className="min-w-9 text-sm tabular-nums">{label}</span>
		</span>
	);
}
