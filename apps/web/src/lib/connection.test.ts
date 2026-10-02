import { TRPCClientError } from "@trpc/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	CONNECTION_TIMEOUT_MS,
	ConnectionTimeoutError,
	isConnectionFailure,
	withTimeout,
} from "./connection";

/** What the tRPC client throws when the server answered with an error. */
const answered = (code: string, domainCode: string | null = null) =>
	Object.assign(new TRPCClientError(code), { data: { code, domainCode } });

afterEach(() => {
	vi.useRealTimers();
});

describe("isConnectionFailure (spec 013, RN-04)", () => {
	it("a request that got no answer is a connection failure", () => {
		expect(isConnectionFailure(new TypeError("Failed to fetch"))).toBe(true);
		// The client wraps what `fetch` threw, and what was not the API's JSON.
		expect(
			isConnectionFailure(
				TRPCClientError.from(new TypeError("Failed to fetch")),
			),
		).toBe(true);
		expect(
			isConnectionFailure(new TRPCClientError("Unexpected token '<'")),
		).toBe(true);
		expect(isConnectionFailure(new ConnectionTimeoutError())).toBe(true);
	});

	it("a refusal of the server is not a connection failure", () => {
		expect(
			isConnectionFailure(answered("BAD_REQUEST", "GAME.STAGE_NOT_DUE")),
		).toBe(false);
		expect(isConnectionFailure(answered("BAD_REQUEST", "GAME.ENDED"))).toBe(
			false,
		);
		expect(isConnectionFailure(answered("INTERNAL_SERVER_ERROR"))).toBe(false);
	});

	it("not found and unauthorized are not connection failures", () => {
		expect(isConnectionFailure(answered("NOT_FOUND", "GAME.NOT_FOUND"))).toBe(
			false,
		);
		expect(isConnectionFailure(answered("UNAUTHORIZED"))).toBe(false);
	});

	it("what is not an error of a request is not a connection failure", () => {
		expect(isConnectionFailure(null)).toBe(false);
		expect(isConnectionFailure(undefined)).toBe(false);
		expect(isConnectionFailure(new Error("a bug"))).toBe(false);
	});
});

describe("withTimeout (spec 013)", () => {
	it("rejects with a connection failure after the limit", async () => {
		vi.useFakeTimers();
		const never = new Promise<string>(() => {});
		const outcome = withTimeout(never).catch((error: unknown) => error);

		await vi.advanceTimersByTimeAsync(CONNECTION_TIMEOUT_MS - 1);
		let settled = false;
		void outcome.then(() => {
			settled = true;
		});
		await Promise.resolve();
		expect(settled).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		const error = await outcome;
		expect(error).toBeInstanceOf(ConnectionTimeoutError);
		expect(isConnectionFailure(error)).toBe(true);
	});

	it("passes the answer and the error through", async () => {
		vi.useFakeTimers();
		const refusal = answered("BAD_REQUEST", "GAME.ENDED");

		await expect(withTimeout(Promise.resolve("ok"))).resolves.toBe("ok");
		await expect(withTimeout(Promise.reject(refusal))).rejects.toBe(refusal);
		// Nothing is left waiting behind an answered request.
		expect(vi.getTimerCount()).toBe(0);
	});

	it("takes another limit", async () => {
		vi.useFakeTimers();
		const outcome = withTimeout(new Promise(() => {}), 200).catch(
			(error: unknown) => error,
		);

		await vi.advanceTimersByTimeAsync(200);

		expect(await outcome).toBeInstanceOf(ConnectionTimeoutError);
	});
});
