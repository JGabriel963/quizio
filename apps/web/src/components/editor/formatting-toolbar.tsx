import type { TextMark } from "@quizio/core/shared/domain/text-formatting";
import { Toggle } from "@quizio/ui/components/toggle";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import type { MouseEvent, ReactElement, ReactNode } from "react";

const MARK_BUTTONS: { mark: TextMark; label: string; glyph: ReactNode }[] = [
	{
		mark: "bold",
		label: "Negrito",
		glyph: <span className="font-extrabold">B</span>,
	},
	{
		mark: "italic",
		label: "Itálico",
		glyph: <span className="font-extrabold italic">I</span>,
	},
	{
		mark: "subscript",
		label: "Subscrito",
		glyph: (
			<span className="font-extrabold">
				X<sub>2</sub>
			</span>
		),
	},
	{
		mark: "superscript",
		label: "Sobrescrito",
		glyph: (
			<span className="font-extrabold">
				X<sup>2</sup>
			</span>
		),
	},
];

/** The editor's field keeps the focus: a click on the bar never takes it (RN-01). */
const keepFocus = (event: MouseEvent) => event.preventDefault();

function WithTooltip({
	label,
	children,
}: {
	label: string;
	children: ReactElement;
}) {
	return (
		<Tooltip>
			<TooltipTrigger delay={150} render={children} />
			<TooltipContent side="bottom">{label}</TooltipContent>
		</Tooltip>
	);
}

/**
 * The bar over the statement (spec 047, RN-01 to RN-05): Negrito, Itálico,
 * Subscrito and Sobrescrito, lit while their mark is on, a separator and
 * Símbolos. Kahoot's f(x) is not here (out of scope).
 */
export function FormattingToolbar({
	active,
	onToggle,
	onSymbols,
	className,
}: {
	active: Record<TextMark, boolean>;
	onToggle: (mark: TextMark) => void;
	onSymbols: () => void;
	className?: string;
}) {
	return (
		<div
			role="toolbar"
			aria-label="Formatação do enunciado"
			className={cn(
				"inline-flex items-center gap-0.5 rounded-md bg-neutral-300 p-1 text-neutral-800 shadow-md",
				className,
			)}
		>
			{MARK_BUTTONS.map(({ mark, label, glyph }) => (
				<WithTooltip key={mark} label={label}>
					<Toggle
						variant="toolbar"
						aria-label={label}
						pressed={active[mark]}
						onPressedChange={() => onToggle(mark)}
						onMouseDown={keepFocus}
					>
						{glyph}
					</Toggle>
				</WithTooltip>
			))}
			<hr
				aria-orientation="vertical"
				className="mx-1 h-6 w-px border-0 bg-neutral-500"
			/>
			<WithTooltip label="Símbolos">
				<button
					type="button"
					aria-label="Símbolos"
					onMouseDown={keepFocus}
					onClick={onSymbols}
					className="inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md px-2 font-extrabold text-base outline-none transition-colors hover:bg-white/60 focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					Ω
				</button>
			</WithTooltip>
		</div>
	);
}
