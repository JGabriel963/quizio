import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	dismissBackgroundNotice,
	isBackgroundNoticeDismissed,
} from "./background-notice";

describe("background notice", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("shows until it is dismissed, then stays dismissed in this browser", () => {
		expect(isBackgroundNoticeDismissed()).toBe(false);

		dismissBackgroundNotice();

		expect(isBackgroundNoticeDismissed()).toBe(true);
	});

	it("shows again when storage is unavailable", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("blocked");
		});

		expect(() => dismissBackgroundNotice()).not.toThrow();
		expect(isBackgroundNoticeDismissed()).toBe(false);
	});
});
