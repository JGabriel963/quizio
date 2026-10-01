import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSaveTracker, SaveTrackerProvider } from "./save-tracker";
import {
	AUTOSAVE_DELAY_MS,
	useDebouncedAutosave,
} from "./use-debounced-autosave";

describe("useDebouncedAutosave", () => {
	let sent: string[];
	let release: (() => void)[];
	const tracker = () => createSaveTracker();

	beforeEach(() => {
		vi.useFakeTimers();
		sent = [];
		release = [];
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function setUp(options: { slow?: boolean } = {}) {
		const saveTracker = tracker();
		const wrapper = ({ children }: { children: ReactNode }) => (
			<SaveTrackerProvider tracker={saveTracker}>
				{children}
			</SaveTrackerProvider>
		);
		const save = (value: string) => {
			sent.push(value);
			return options.slow
				? new Promise<void>((resolve) => release.push(resolve))
				: Promise.resolve();
		};
		const hook = renderHook(
			() =>
				useDebouncedAutosave({
					key: "question:a:text",
					initialValue: "",
					save,
				}),
			{ wrapper },
		);
		return { hook, saveTracker };
	}

	it("sends 800 ms after the last change", async () => {
		const { hook } = setUp();

		act(() => hook.result.current.setValue("Cap"));
		await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1));
		act(() => hook.result.current.setValue("Capital?"));
		await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1));
		expect(sent).toEqual([]);
		await act(() => vi.advanceTimersByTimeAsync(1));

		expect(AUTOSAVE_DELAY_MS).toBe(800);
		expect(hook.result.current.value).toBe("Capital?");
		expect(sent).toEqual(["Capital?"]);
	});

	it("reports saving from the first keystroke, before the debounce ends", async () => {
		const { hook, saveTracker } = setUp();

		act(() => hook.result.current.setValue("C"));
		expect(saveTracker.getStatus()).toBe("saving");
		await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS));

		expect(saveTracker.getStatus()).toBe("saved");
	});

	it("sends immediately on blur", async () => {
		const { hook } = setUp();

		act(() => hook.result.current.setValue("Capital?"));
		await act(() => hook.result.current.flush());

		expect(sent).toEqual(["Capital?"]);
	});

	it("keeps one request in flight per key and sends the latest value next", async () => {
		const { hook } = setUp({ slow: true });

		act(() => hook.result.current.setValue("C"));
		await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS));
		act(() => hook.result.current.setValue("Ca"));
		await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS));
		act(() => hook.result.current.setValue("Cap"));
		await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS));
		expect(sent).toEqual(["C"]);

		await act(async () => release.shift()?.());
		await act(() => vi.advanceTimersByTimeAsync(0));

		expect(sent).toEqual(["C", "Cap"]);
	});

	it("flushes pending changes on unmount", async () => {
		const { hook } = setUp();

		act(() => hook.result.current.setValue("Capital?"));
		hook.unmount();
		await act(() => vi.advanceTimersByTimeAsync(0));

		expect(sent).toEqual(["Capital?"]);
	});

	it("the tracker's flush sends the pending value", async () => {
		const { hook, saveTracker } = setUp();

		act(() => hook.result.current.setValue("Capital?"));
		let flushed = false;
		await act(async () => {
			flushed = await saveTracker.flush();
		});

		expect(flushed).toBe(true);
		expect(sent).toEqual(["Capital?"]);
	});
});
