import { act, renderHook } from "@testing-library/react";
import type { PointerEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HOLD_DELAY_MS, HOLD_EVERY_MS, useHoldRepeat } from "./use-hold-repeat";

const press = { button: 0 } as PointerEvent<HTMLElement>;

describe("useHoldRepeat (spec 032, RN-25)", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("repeats while held and stops on release", () => {
		const step = vi.fn(() => true);
		const { result } = renderHook(() => useHoldRepeat(step));

		act(() => result.current.onPointerDown(press));
		expect(step).toHaveBeenCalledTimes(1);
		act(() => vi.advanceTimersByTime(HOLD_DELAY_MS + 3 * HOLD_EVERY_MS));
		expect(step).toHaveBeenCalledTimes(4);

		act(() => result.current.onPointerUp());
		act(() => vi.advanceTimersByTime(10 * HOLD_EVERY_MS));
		expect(step).toHaveBeenCalledTimes(4);
	});

	it("stops at the end", () => {
		let left = 2;
		const step = vi.fn(() => {
			if (left === 0) {
				return false;
			}
			left -= 1;
			return true;
		});
		const { result } = renderHook(() => useHoldRepeat(step));

		act(() => result.current.onPointerDown(press));
		act(() => vi.advanceTimersByTime(HOLD_DELAY_MS + 10 * HOLD_EVERY_MS));

		expect(step).toHaveBeenCalledTimes(3);
		expect(left).toBe(0);
	});

	it("a keyboard press acts once; a pointer's click does not act again", () => {
		const step = vi.fn(() => true);
		const { result } = renderHook(() => useHoldRepeat(step));

		act(() => result.current.onClick({ detail: 0 }));
		act(() => result.current.onClick({ detail: 1 }));

		expect(step).toHaveBeenCalledTimes(1);
	});
});
