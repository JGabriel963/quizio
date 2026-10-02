import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	earliestDeadline,
	msLeft,
	secondsLeft,
	useCountdown,
} from "./use-countdown";

describe("msLeft (spec 009)", () => {
	it("counts from the arrival, never below zero", () => {
		expect(msLeft(12_000, 1_000, 1_000)).toBe(12_000);
		expect(msLeft(12_000, 1_000, 4_500)).toBe(8_500);
		expect(msLeft(12_000, 1_000, 60_000)).toBe(0);
	});

	it("ignores a clock that went backwards", () => {
		expect(msLeft(12_000, 5_000, 1_000)).toBe(12_000);
	});

	it("shows whole seconds, and zero only at the end", () => {
		expect(secondsLeft(12_000)).toBe(12);
		expect(secondsLeft(11_001)).toBe(12);
		expect(secondsLeft(1)).toBe(1);
		expect(secondsLeft(0)).toBe(0);
	});
});

describe("useCountdown (spec 009)", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("starts from the time the server said was left, not the full time", () => {
		const receivedAt = Date.now();
		const { result } = renderHook(() => useCountdown(12_000, receivedAt));

		expect(result.current.seconds).toBe(12);

		act(() => void vi.advanceTimersByTime(3_000));
		expect(result.current.seconds).toBe(9);

		act(() => void vi.advanceTimersByTime(20_000));
		expect(result.current).toEqual({ ms: 0, seconds: 0 });
	});

	it("discounts the time since the data arrived", () => {
		const receivedAt = Date.now() - 4_000;

		const { result } = renderHook(() => useCountdown(12_000, receivedAt));

		expect(result.current.seconds).toBe(8);
	});

	it("restarts when the server sends a new time", () => {
		const { result, rerender } = renderHook(
			({ remainingMs, receivedAt }) => useCountdown(remainingMs, receivedAt),
			{ initialProps: { remainingMs: 5_000, receivedAt: Date.now() } },
		);
		act(() => void vi.advanceTimersByTime(5_000));
		expect(result.current.seconds).toBe(0);

		rerender({ remainingMs: 20_000, receivedAt: Date.now() });

		expect(result.current.seconds).toBe(20);
	});

	it("has nothing to count without a deadline", () => {
		const { result } = renderHook(() => useCountdown(null, 0));

		expect(result.current).toEqual({ ms: null, seconds: null });
	});
});

describe("earliestDeadline (spec 012)", () => {
	it("keeps the reading that ends first", () => {
		const shown = { remainingMs: 5_000, receivedAt: 1_000 };
		// Asked again 2 s later: the answer took 300 ms to arrive, so it says
		// there is more time left than the screen is showing.
		const late = { remainingMs: 3_000, receivedAt: 3_300 };
		const sooner = { remainingMs: 2_900, receivedAt: 3_000 };

		expect(earliestDeadline(shown, late)).toBe(shown);
		expect(earliestDeadline(shown, sooner)).toBe(sooner);
	});

	it("takes the new reading when one of them has no deadline", () => {
		const results = { remainingMs: null, receivedAt: 1_000 };
		const answering = { remainingMs: 20_000, receivedAt: 2_000 };

		expect(earliestDeadline(results, answering)).toBe(answering);
		expect(earliestDeadline(answering, results)).toBe(results);
	});
});
