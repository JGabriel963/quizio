/** The screens that open a quiz in a drawer under `/quizzes/{id}`. */
const DRAWER_SCREENS = ["/", "/library"] as const;

export type DrawerScreen = {
	to: (typeof DRAWER_SCREENS)[number];
	search: Record<string, string>;
};

/**
 * The drawer a history entry showed, when Back lands on `/quizzes/{id}`
 * from another document (a screen reloaded after the drawer opened).
 * The router restores a masked entry only in the document that made it, so
 * without this the page would show instead of the drawer; reloading the page
 * itself still shows the page (`unmaskOnReload`).
 */
export function drawerBehindPage({
	state,
	quizId,
	documentUrl,
	currentUrl,
}: {
	/** `history.state` of the entry. */
	state: unknown;
	quizId: string;
	/** The address this document was loaded from. */
	documentUrl: string;
	currentUrl: string;
}): DrawerScreen | null {
	if (documentUrl === currentUrl) {
		return null;
	}
	const behind = (state as { __tempLocation?: unknown } | null)
		?.__tempLocation as { pathname?: unknown; search?: unknown } | undefined;
	const screen = DRAWER_SCREENS.find((path) => path === behind?.pathname);
	// The router keeps the search as the address wrote it, `?a=1&b=2`.
	const search = Object.fromEntries(
		new URLSearchParams(
			typeof behind?.search === "string" ? behind.search : "",
		),
	);
	if (!screen || search.quiz !== quizId) {
		return null;
	}
	return { to: screen, search };
}
