import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useLeaveWarning } from "./use-leave-warning";

/** Whether the browser would ask before closing the tab right now. */
function wouldAsk(): boolean {
	const event = new Event("beforeunload", { cancelable: true });
	window.dispatchEvent(event);
	return event.defaultPrevented;
}

describe("useLeaveWarning", () => {
	it("asks before the tab is closed while active", () => {
		renderHook(() => useLeaveWarning(true));

		expect(wouldAsk()).toBe(true);
	});

	it("does not ask while inactive", () => {
		renderHook(() => useLeaveWarning(false));

		expect(wouldAsk()).toBe(false);
	});

	it("follows the flag as it changes", () => {
		const { rerender } = renderHook(({ active }) => useLeaveWarning(active), {
			initialProps: { active: false },
		});
		expect(wouldAsk()).toBe(false);

		rerender({ active: true });
		expect(wouldAsk()).toBe(true);

		rerender({ active: false });
		expect(wouldAsk()).toBe(false);
	});

	it("stops asking once the screen is gone", () => {
		const { unmount } = renderHook(() => useLeaveWarning(true));

		unmount();

		expect(wouldAsk()).toBe(false);
	});
});
