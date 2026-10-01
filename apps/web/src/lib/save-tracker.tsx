import {
	createContext,
	type ReactNode,
	use,
	useState,
	useSyncExternalStore,
} from "react";

export type SaveStatus = "saved" | "saving" | "failed";

type Operation = () => Promise<unknown>;

/**
 * Coordinates the editor's autosave (spec 003, RN-20 a RN-23): counts what is
 * on its way for the header status, keeps the latest failed operation per key
 * for "Tentar de novo", and lets the editor send everything before leaving.
 */
export interface SaveTracker {
	/** Runs `run`; resolves whether it succeeded. Never rejects. */
	track(
		key: string,
		run: Operation,
		options?: { retryable?: boolean },
	): Promise<boolean>;
	/** A change waits to be sent (debounce): counts as saving, so leaving warns. */
	markPending(key: string): void;
	clearPending(key: string): void;
	/** Debounced fields register how to send their pending value; returns the unregister. */
	registerFlusher(flush: () => Promise<void>): () => void;
	/** Sends pending values and waits for everything in flight; true when nothing failed. */
	flush(): Promise<boolean>;
	/** Resends the failed operations. */
	retry(): Promise<void>;
	getStatus(): SaveStatus;
	failedCount(): number;
	subscribe(listener: () => void): () => void;
}

export function createSaveTracker(): SaveTracker {
	const inFlight = new Set<Promise<boolean>>();
	const failed = new Map<string, Operation>();
	const flushers = new Set<() => Promise<void>>();
	const pending = new Set<string>();
	const listeners = new Set<() => void>();
	let status: SaveStatus = "saved";

	const update = () => {
		const next: SaveStatus =
			inFlight.size > 0 || pending.size > 0
				? "saving"
				: failed.size > 0
					? "failed"
					: "saved";
		if (next !== status) {
			status = next;
			for (const listener of listeners) {
				listener();
			}
		}
	};

	const tracker: SaveTracker = {
		track(key, run, { retryable = true } = {}) {
			const attempt = (async () => {
				try {
					await run();
					failed.delete(key);
					return true;
				} catch {
					if (retryable) {
						failed.set(key, run);
					}
					return false;
				}
			})();
			inFlight.add(attempt);
			update();
			return attempt.finally(() => {
				inFlight.delete(attempt);
				update();
			});
		},

		markPending(key) {
			pending.add(key);
			update();
		},

		clearPending(key) {
			pending.delete(key);
			update();
		},

		registerFlusher(flush) {
			flushers.add(flush);
			return () => {
				flushers.delete(flush);
			};
		},

		async flush() {
			await Promise.all([...flushers].map((flush) => flush()));
			await Promise.all([...inFlight]);
			return failed.size === 0;
		},

		async retry() {
			const operations = [...failed];
			failed.clear();
			await Promise.all(
				operations.map(([key, run]) => tracker.track(key, run)),
			);
		},

		getStatus: () => status,
		failedCount: () => failed.size,

		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
	return tracker;
}

const SaveTrackerContext = createContext<SaveTracker | null>(null);

/** One tracker per open editor. */
export function SaveTrackerProvider({
	tracker: providedTracker,
	children,
}: {
	tracker?: SaveTracker;
	children: ReactNode;
}) {
	const [tracker] = useState(() => providedTracker ?? createSaveTracker());
	return <SaveTrackerContext value={tracker}>{children}</SaveTrackerContext>;
}

export function useSaveTracker(): SaveTracker {
	const tracker = use(SaveTrackerContext);
	if (!tracker) {
		throw new Error("useSaveTracker must be used inside a SaveTrackerProvider");
	}
	return tracker;
}

export function useSaveStatus(): SaveStatus {
	const tracker = useSaveTracker();
	return useSyncExternalStore(
		tracker.subscribe,
		tracker.getStatus,
		tracker.getStatus,
	);
}
