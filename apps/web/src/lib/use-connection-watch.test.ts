import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONNECTION_RETRY_MS } from "./connection";
import {
	type ConnectionState,
	connectionReducer,
	useConnectionWatch,
} from "./use-connection-watch";

const noAnswer = () => new TypeError("Failed to fetch");
const refusal = () =>
	Object.assign(new Error("refused"), {
		name: "TRPCClientError",
		data: { code: "BAD_REQUEST", domainCode: "GAME.STAGE_NOT_DUE" },
	});

/** Lets the time pass, with what was scheduled and awaited in it. */
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("connectionReducer (spec 013)", () => {
	const ok: ConnectionState = { status: "ok" };

	it("a loss starts the wait for the retry", () => {
		expect(connectionReducer(ok, { type: "lost", now: 1_000 })).toEqual({
			status: "lost",
			retryAt: 1_000 + CONNECTION_RETRY_MS,
		});
	});

	it("another loss does not restart the wait", () => {
		const lost = connectionReducer(ok, { type: "lost", now: 1_000 });

		expect(connectionReducer(lost, { type: "lost", now: 3_000 })).toBe(lost);
		expect(
			connectionReducer({ status: "retrying" }, { type: "lost", now: 3_000 }),
		).toEqual({ status: "retrying" });
	});

	it("a retry that fails waits again, one that is answered is back", () => {
		const retrying = connectionReducer(
			{ status: "lost", retryAt: 6_000 },
			{ type: "retry" },
		);
		expect(retrying).toEqual({ status: "retrying" });
		expect(connectionReducer(retrying, { type: "failed", now: 6_100 })).toEqual(
			{ status: "lost", retryAt: 6_100 + CONNECTION_RETRY_MS },
		);
		expect(connectionReducer(retrying, { type: "back" })).toEqual(ok);
	});

	it("only a lost connection is retried", () => {
		expect(connectionReducer(ok, { type: "retry" })).toBe(ok);
	});
});

describe("useConnectionWatch (spec 013)", () => {
	function watch(
		probe: () => Promise<unknown> = () => Promise.reject(noAnswer()),
		enabled = true,
	) {
		const onBack = vi.fn();
		const probed = vi.fn(probe);
		const view = renderHook(
			(props: { enabled: boolean }) =>
				useConnectionWatch({ enabled: props.enabled, probe: probed, onBack }),
			{ initialProps: { enabled } },
		);
		return { ...view, probe: probed, onBack };
	}

	it("starts connected", () => {
		const { result, probe } = watch();

		expect(result.current.lost).toBe(false);
		expect(result.current.retrying).toBe(false);
		expect(probe).not.toHaveBeenCalled();
	});

	it("a connection failure marks the connection lost", () => {
		const { result } = watch();

		act(() => result.current.report(noAnswer()));

		expect(result.current.lost).toBe(true);
		expect(result.current.retryInSeconds).toBe(5);
	});

	it("a refusal does not", () => {
		const { result } = watch();

		act(() => result.current.report(refusal()));

		expect(result.current.lost).toBe(false);
	});

	it("the browser going offline marks it lost", () => {
		const { result } = watch();

		act(() => {
			window.dispatchEvent(new Event("offline"));
		});

		expect(result.current.lost).toBe(true);
	});

	it("counts 5 seconds and retries, then starts the countdown again", async () => {
		const { result, probe } = watch();
		act(() => result.current.report(noAnswer()));

		await tick(1_100);
		expect(result.current.retryInSeconds).toBe(4);
		await tick(3_000);
		expect(result.current.retryInSeconds).toBe(1);
		expect(probe).not.toHaveBeenCalled();

		await tick(1_000);

		expect(probe).toHaveBeenCalledTimes(1);
		expect(result.current.lost).toBe(true);
		expect(result.current.retryInSeconds).toBe(5);

		await tick(CONNECTION_RETRY_MS);
		expect(probe).toHaveBeenCalledTimes(2);
	});

	it("tells when a retry is on its way", async () => {
		let answer: () => void = () => {};
		const { result } = watch(
			() =>
				new Promise<void>((resolve) => {
					answer = resolve;
				}),
		);
		act(() => result.current.report(noAnswer()));

		await tick(CONNECTION_RETRY_MS);

		expect(result.current.retrying).toBe(true);
		// Still lost: the dialog stays until the server answers.
		expect(result.current.lost).toBe(true);

		await act(async () => answer());

		expect(result.current.retrying).toBe(false);
		expect(result.current.lost).toBe(false);
	});

	it("comes back by itself when a retry is answered, and calls onBack", async () => {
		const { result, onBack } = watch(() => Promise.resolve());
		act(() => result.current.report(noAnswer()));
		expect(onBack).not.toHaveBeenCalled();

		await tick(CONNECTION_RETRY_MS);

		expect(result.current.lost).toBe(false);
		expect(onBack).toHaveBeenCalledTimes(1);
	});

	it("a refusal answering the retry is the server answering", async () => {
		const { result, onBack } = watch(() => Promise.reject(refusal()));
		act(() => result.current.report(noAnswer()));

		await tick(CONNECTION_RETRY_MS);

		expect(result.current.lost).toBe(false);
		expect(onBack).toHaveBeenCalledTimes(1);
	});

	it("retryNow tries at once", async () => {
		const { result, probe } = watch(() => Promise.resolve());
		act(() => result.current.report(noAnswer()));
		await tick(1_000);

		await act(async () => result.current.retryNow());

		expect(probe).toHaveBeenCalledTimes(1);
		expect(result.current.lost).toBe(false);
	});

	it("retryNow does nothing while connected or already retrying", async () => {
		const { result, probe } = watch(() => new Promise(() => {}));

		act(() => result.current.retryNow());
		expect(probe).not.toHaveBeenCalled();

		act(() => result.current.report(noAnswer()));
		act(() => result.current.retryNow());
		act(() => result.current.retryNow());

		expect(probe).toHaveBeenCalledTimes(1);
	});

	it("the browser coming online tries at once", async () => {
		const { result, probe } = watch(() => Promise.resolve());
		act(() => {
			window.dispatchEvent(new Event("offline"));
		});

		await act(async () => {
			window.dispatchEvent(new Event("online"));
		});

		expect(probe).toHaveBeenCalledTimes(1);
		expect(result.current.lost).toBe(false);
	});

	it("does nothing while disabled", async () => {
		const { result, probe } = watch(undefined, false);

		act(() => result.current.report(noAnswer()));
		act(() => {
			window.dispatchEvent(new Event("offline"));
		});
		await tick(CONNECTION_RETRY_MS * 2);

		expect(result.current.lost).toBe(false);
		expect(probe).not.toHaveBeenCalled();
	});

	it("being disabled forgets a lost connection", async () => {
		const { result, probe, rerender } = watch();
		act(() => result.current.report(noAnswer()));

		rerender({ enabled: false });
		await tick(CONNECTION_RETRY_MS * 2);

		expect(result.current.lost).toBe(false);
		expect(probe).not.toHaveBeenCalled();
	});

	it("stops when unmounted", async () => {
		const { result, probe, unmount } = watch();
		act(() => result.current.report(noAnswer()));

		unmount();
		await tick(CONNECTION_RETRY_MS * 2);

		expect(probe).not.toHaveBeenCalled();
	});
});
