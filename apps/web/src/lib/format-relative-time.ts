const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
	["year", 365 * DAY],
	["month", 30 * DAY],
	["day", DAY],
	["hour", HOUR],
	["minute", MINUTE],
];

const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** "agora", "há 5 minutos", "ontem", "há 2 meses" — like Kahoot's library dates. */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
	const elapsed = now.getTime() - date.getTime();
	for (const [unit, size] of UNITS) {
		if (elapsed >= size) {
			return formatter.format(-Math.floor(elapsed / size), unit);
		}
	}
	return "agora";
}
