const STORAGE_KEY = "quizio:editor:background-notice-dismissed";

/**
 * "Não mostrar essa mensagem novamente" of the background notice is kept in
 * this browser (spec 007, RN-26). Storage may be unavailable (private mode,
 * blocked site data): then the notice simply shows again.
 */
export function isBackgroundNoticeDismissed(): boolean {
	try {
		return window.localStorage.getItem(STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}

export function dismissBackgroundNotice(): void {
	try {
		window.localStorage.setItem(STORAGE_KEY, "1");
	} catch {
		// Nothing to do: the notice will show again.
	}
}
