/**
 * The deadline as "Configurar atividade" and "Alterar o prazo" pick it (spec
 * 029, RN-07 to RN-09): a day and a full hour in the device's zone, within the
 * bounds; the server checks the bounds again by its own clock.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DeadlineBounds {
	/** The deadline must be later than this. */
	min: Date;
	/** And at most this. */
	max: Date;
}

/** Three days ahead at 12:00, as in Kahoot (RN-07). */
export function defaultDeadline(now: Date): Date {
	return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 12, 0);
}

export function deadlineBounds(now: Date, maxDays: number): DeadlineBounds {
	return { min: now, max: new Date(now.getTime() + maxDays * DAY_MS) };
}

/** The day at `hour`:00. */
export function withHour(day: Date, hour: number): Date {
	return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0);
}

function fits(deadline: Date, bounds: DeadlineBounds): boolean {
	return (
		deadline.getTime() > bounds.min.getTime() &&
		deadline.getTime() <= bounds.max.getTime()
	);
}

/** The full hours of the day that fit the bounds (RN-09). */
export function hourOptions(day: Date, bounds: DeadlineBounds): number[] {
	return Array.from({ length: 24 }, (_, hour) => hour).filter((hour) =>
		fits(withHour(day, hour), bounds),
	);
}

/** A day of the calendar can be picked when one of its hours fits. */
export function isDayAllowed(day: Date, bounds: DeadlineBounds): boolean {
	return hourOptions(day, bounds).length > 0;
}

/** The same day at the nearest hour that fits, or the first one of the day. */
export function onAllowedHour(
	day: Date,
	hour: number,
	bounds: DeadlineBounds,
): Date {
	const hours = hourOptions(day, bounds);
	const fitting = hours.includes(hour) ? hour : (hours[0] ?? hour);
	return withHour(day, fitting);
}

const longDate = new Intl.DateTimeFormat("pt-BR", {
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
});

/** "quinta-feira, 22 de outubro de 2026 às 12:00" (RN-50). */
export function formatDeadlineLong(deadline: Date): string {
	return `${longDate.format(deadline)} às ${hourLabel(deadline.getHours())}`;
}

/** "09:00". */
export function hourLabel(hour: number): string {
	return `${String(hour).padStart(2, "0")}:00`;
}
