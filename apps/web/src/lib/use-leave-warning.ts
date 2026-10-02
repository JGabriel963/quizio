import { useEffect } from "react";

/**
 * While `active`, the browser asks before the tab is closed, reloaded or
 * taken to another site ("Sair do site?"), as Kahoot does on a game's screen.
 * The words are the browser's own: a page cannot choose them. Moving inside
 * the app does not go through here.
 */
export function useLeaveWarning(active: boolean): void {
	useEffect(() => {
		if (!active) {
			return;
		}
		const warn = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			// Older browsers only ask when this is set.
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [active]);
}
