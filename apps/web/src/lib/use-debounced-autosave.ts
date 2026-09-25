import { useCallback, useEffect, useRef, useState } from "react";

import { useSaveTracker } from "./save-tracker";

/** Time after the last keystroke before a text is sent (plan 003). */
export const AUTOSAVE_DELAY_MS = 800;

interface AutosaveState<T> {
	pending: { value: T } | null;
	timer: ReturnType<typeof setTimeout> | undefined;
	inFlight: Promise<boolean> | null;
}

/**
 * Local value of an autosaved field (spec 003, RN-20): sent 800 ms after the
 * last change, at once on `flush` (blur), and on unmount. Only one request per
 * field is in flight; the latest value waits for it, so an older response can
 * never overwrite a newer text.
 */
export function useDebouncedAutosave<T>({
	key,
	initialValue,
	save,
	delay = AUTOSAVE_DELAY_MS,
}: {
	key: string;
	initialValue: T;
	save: (value: T) => Promise<unknown>;
	delay?: number;
}) {
	const tracker = useSaveTracker();
	const [value, setLocalValue] = useState(initialValue);
	const state = useRef<AutosaveState<T>>({
		pending: null,
		timer: undefined,
		inFlight: null,
	});
	const saveRef = useRef(save);
	useEffect(() => {
		saveRef.current = save;
	});

	const flush = useCallback(async (): Promise<void> => {
		const current = state.current;
		clearTimeout(current.timer);
		current.timer = undefined;
		if (current.inFlight) {
			await current.inFlight;
			// The latest value may have arrived meanwhile.
			return current.pending ? flush() : undefined;
		}
		if (!current.pending) {
			return;
		}
		const { value: next } = current.pending;
		current.pending = null;
		current.inFlight = tracker.track(key, () => saveRef.current(next));
		tracker.clearPending(key);
		await current.inFlight;
		current.inFlight = null;
		if (current.pending) {
			await flush();
		}
	}, [key, tracker]);

	const setValue = useCallback(
		(next: T) => {
			setLocalValue(next);
			const current = state.current;
			current.pending = { value: next };
			tracker.markPending(key);
			clearTimeout(current.timer);
			current.timer = setTimeout(() => void flush(), delay);
		},
		[delay, flush, key, tracker],
	);

	useEffect(() => {
		const unregister = tracker.registerFlusher(flush);
		return () => {
			unregister();
			// Leaving the field (or the editor) never drops a pending value.
			void flush();
		};
	}, [tracker, flush]);

	return { value, setValue, flush };
}
