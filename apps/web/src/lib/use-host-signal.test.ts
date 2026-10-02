import { HOST_SIGNAL_INTERVAL_MS } from "@quizio/core/game/domain/host-presence";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHostSignal } from "./use-host-signal";

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("useHostSignal (spec 013, RN-14)", () => {
	function signalling(
		signal: () => Promise<unknown> = () => Promise.resolve(),
		enabled = true,
	) {
		const signalled = vi.fn(signal);
		const report = vi.fn();
		const view = renderHook(
			(props: { enabled: boolean }) =>
				useHostSignal({ enabled: props.enabled, signal: signalled, report }),
			{ initialProps: { enabled } },
		);
		return { ...view, signal: signalled, report };
	}

	it("signals at once and every 4 seconds", async () => {
		const { signal, report } = signalling();

		expect(signal).toHaveBeenCalledTimes(1);

		await tick(HOST_SIGNAL_INTERVAL_MS);
		expect(signal).toHaveBeenCalledTimes(2);
		await tick(HOST_SIGNAL_INTERVAL_MS * 2);
		expect(signal).toHaveBeenCalledTimes(4);
		expect(report).not.toHaveBeenCalled();
	});

	it("reports a failed signal", async () => {
		const failure = new TypeError("Failed to fetch");
		const { report } = signalling(() => Promise.reject(failure));

		await tick(0);

		expect(report).toHaveBeenCalledExactlyOnceWith(failure);
	});

	it("does not signal while disabled", async () => {
		const { signal, rerender } = signalling(undefined, false);

		await tick(HOST_SIGNAL_INTERVAL_MS * 3);
		expect(signal).not.toHaveBeenCalled();

		// Enabled again (the connection is back), it signals at once.
		rerender({ enabled: true });
		expect(signal).toHaveBeenCalledTimes(1);

		rerender({ enabled: false });
		await tick(HOST_SIGNAL_INTERVAL_MS * 3);
		expect(signal).toHaveBeenCalledTimes(1);
	});

	it("stops when unmounted, and drops what a signal on its way ends in", async () => {
		let fail: (error: unknown) => void = () => {};
		const { signal, report, unmount } = signalling(
			() =>
				new Promise((_resolve, reject) => {
					fail = reject;
				}),
		);

		unmount();
		fail(new TypeError("Failed to fetch"));
		await tick(HOST_SIGNAL_INTERVAL_MS * 3);

		expect(signal).toHaveBeenCalledTimes(1);
		expect(report).not.toHaveBeenCalled();
	});
});
