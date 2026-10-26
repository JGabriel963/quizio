const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How long until a deadline, in one unit rounded to the nearest (spec 029,
 * RN-10): "3 dias", "5 horas", "40 minutos". The server sends the time left,
 * never an instant to compare with the device's clock.
 */
function duration(remainingMs: number): string {
	if (remainingMs >= DAY) {
		return plural(Math.round(remainingMs / DAY), "dia", "dias");
	}
	if (remainingMs >= HOUR) {
		return plural(Math.round(remainingMs / HOUR), "hora", "horas");
	}
	return plural(
		Math.max(1, Math.round(remainingMs / MINUTE)),
		"minuto",
		"minutos",
	);
}

function plural(count: number, one: string, many: string): string {
	return `${count} ${count === 1 ? one : many}`;
}

/** "em 3 dias": the dialogs, the list and the report. */
export function timeUntil(remainingMs: number): string {
	return `em ${duration(remainingMs)}`;
}

/** "Aberto por 2 dias": the participant's screen. */
export function openFor(remainingMs: number): string {
	return `Aberto por ${duration(remainingMs)}`;
}

/** "3 dias": the group's Atribuições tab (spec 038, RN-23). */
export function timeLeft(remainingMs: number): string {
	return duration(remainingMs);
}
