/** How often a report of an open assignment asks again: participants play meanwhile (spec 030, RN-28). */
export const OPEN_ASSIGNMENT_REFRESH_MS = 30_000;

/** The report's own refetch interval: only while its assignment is open. */
export function reportRefreshInterval(
	report: { header: { assignment: { open: boolean } | null } } | undefined,
): number | false {
	return report?.header.assignment?.open ? OPEN_ASSIGNMENT_REFRESH_MS : false;
}

/** The list's: while one of its lines is an open assignment. */
export function reportListRefreshInterval(
	list: { items: readonly { open: boolean }[] } | undefined,
): number | false {
	return list?.items.some((item) => item.open)
		? OPEN_ASSIGNMENT_REFRESH_MS
		: false;
}
