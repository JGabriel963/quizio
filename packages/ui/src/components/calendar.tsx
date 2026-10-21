import { cn } from "@quizio/ui/lib/utils";
import { cva } from "class-variance-authority";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type * as React from "react";

const WEEKDAYS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" });
const dayName = new Intl.DateTimeFormat("pt-BR", {
	day: "numeric",
	month: "long",
	year: "numeric",
});

function sameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/** The month's days in weeks from Monday, with null before the first and after the last. */
function weeksOf(month: Date): (Date | null)[][] {
	const year = month.getFullYear();
	const index = month.getMonth();
	const days = new Date(year, index + 1, 0).getDate();
	// Sunday is 0: Monday starts the week, as in Kahoot's calendar.
	const lead = (new Date(year, index, 1).getDay() + 6) % 7;
	const cells: (Date | null)[] = [
		...Array.from({ length: lead }, () => null),
		...Array.from({ length: days }, (_, day) => new Date(year, index, day + 1)),
	];
	while (cells.length % 7 !== 0) {
		cells.push(null);
	}
	return Array.from({ length: cells.length / 7 }, (_, week) =>
		cells.slice(week * 7, week * 7 + 7),
	);
}

const dayVariants = cva(
	"inline-flex size-9 cursor-pointer items-center justify-center rounded-md font-semibold text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:text-muted-foreground/60 disabled:hover:bg-transparent",
	{
		variants: {
			selected: {
				true: "bg-primary text-primary-foreground hover:bg-primary",
				false: "hover:bg-muted",
			},
		},
		defaultVariants: { selected: false },
	},
);

/**
 * A month to pick a day in (spec 029, "Configurar atividade"): Monday first,
 * in Portuguese, with the days out of bounds disabled. Which month shows is
 * the caller's, so it can keep the bounds.
 */
function Calendar({
	month,
	onMonthChange,
	selected = null,
	onSelect,
	isDisabled,
	canGoBack = true,
	canGoForward = true,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "onSelect"> & {
	/** Any day of the month to show. */
	month: Date;
	onMonthChange: (month: Date) => void;
	selected?: Date | null;
	onSelect?: (day: Date) => void;
	isDisabled?: (day: Date) => boolean;
	canGoBack?: boolean;
	canGoForward?: boolean;
}) {
	const shift = (by: number) =>
		onMonthChange(new Date(month.getFullYear(), month.getMonth() + by, 1));

	return (
		<div
			data-slot="calendar"
			className={cn("flex flex-col gap-3", className)}
			{...props}
		>
			<div className="flex items-center justify-between gap-2">
				<p className="font-bold text-lg" aria-live="polite">
					{monthName.format(month)} {month.getFullYear()}
				</p>
				<div className="flex gap-1">
					<button
						type="button"
						aria-label="Mês anterior"
						disabled={!canGoBack}
						onClick={() => shift(-1)}
						className={dayVariants()}
					>
						<ChevronLeftIcon className="size-4" />
					</button>
					<button
						type="button"
						aria-label="Próximo mês"
						disabled={!canGoForward}
						onClick={() => shift(1)}
						className={dayVariants()}
					>
						<ChevronRightIcon className="size-4" />
					</button>
				</div>
			</div>
			<table className="w-full border-collapse text-center">
				<thead>
					<tr>
						{WEEKDAYS.map((weekday) => (
							<th
								key={weekday}
								scope="col"
								className="pb-1 font-normal text-muted-foreground text-sm"
							>
								{weekday}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{weeksOf(month).map((week) => (
						<tr key={week.find(Boolean)?.toISOString()}>
							{week.map((day, cell) =>
								day ? (
									<td key={day.toISOString()} className="p-0.5">
										<button
											type="button"
											aria-label={dayName.format(day)}
											aria-pressed={selected ? sameDay(day, selected) : false}
											disabled={isDisabled?.(day) ?? false}
											onClick={() => onSelect?.(day)}
											className={dayVariants({
												selected: selected ? sameDay(day, selected) : false,
											})}
										>
											{day.getDate()}
										</button>
									</td>
								) : (
									<td key={`empty-${cell}`} className="p-0.5" />
								),
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export { Calendar };
