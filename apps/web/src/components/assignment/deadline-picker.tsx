import { Button } from "@quizio/ui/components/button";
import { Calendar } from "@quizio/ui/components/calendar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@quizio/ui/components/select";
import { useId, useState } from "react";

import {
	type DeadlineBounds,
	hourLabel,
	hourOptions,
	isDayAllowed,
	onAllowedHour,
	withHour,
} from "@/lib/assignment-deadline";

function monthOf(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * "Editar" of the deadline (spec 029, RN-09): a day of the calendar and a full
 * hour, within the bounds; "Definir" applies, "Cancelar" keeps the deadline.
 */
export function DeadlinePicker({
	value,
	bounds,
	onApply,
	onCancel,
	applyLabel = "Definir",
}: {
	value: Date;
	bounds: DeadlineBounds;
	onApply: (deadline: Date) => void;
	onCancel: () => void;
	applyLabel?: string;
}) {
	const [picked, setPicked] = useState(value);
	const [month, setMonth] = useState(monthOf(value));
	const hourLabelId = useId();
	const hours = hourOptions(picked, bounds);
	const items = hours.map((hour) => ({ value: hour, label: hourLabel(hour) }));

	return (
		<div className="flex flex-col gap-4">
			<Calendar
				month={month}
				onMonthChange={setMonth}
				selected={picked}
				onSelect={(day) =>
					setPicked(onAllowedHour(day, picked.getHours(), bounds))
				}
				isDisabled={(day) => !isDayAllowed(day, bounds)}
				canGoBack={month > monthOf(bounds.min)}
				canGoForward={month < monthOf(bounds.max)}
			/>
			<div className="flex flex-col gap-1.5 border-t pt-3">
				<p id={hourLabelId} className="font-bold text-sm">
					Tempo
				</p>
				<Select
					items={items}
					value={picked.getHours()}
					onValueChange={(hour) => setPicked(withHour(picked, hour as number))}
				>
					<SelectTrigger aria-labelledby={hourLabelId} className="h-11">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{items.map((item) => (
							<SelectItem key={item.value} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex justify-center gap-2">
				<Button variant="secondary" onClick={onCancel}>
					Cancelar
				</Button>
				<Button
					disabled={!hours.includes(picked.getHours())}
					onClick={() => onApply(picked)}
				>
					{applyLabel}
				</Button>
			</div>
		</div>
	);
}
