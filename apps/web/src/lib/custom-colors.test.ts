import { afterEach, describe, expect, it, vi } from "vitest";

import {
	CUSTOM_COLORS_LIMIT,
	loadCustomColors,
	rememberCustomColor,
} from "./custom-colors";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("custom colors (spec 043, Cores personalizadas)", () => {
	it("remembers a color first and once", () => {
		rememberCustomColor("#253e81");
		rememberCustomColor("#e66e0a");
		rememberCustomColor("#253e81");

		expect(loadCustomColors()).toEqual(["#253e81", "#e66e0a"]);
	});

	it("keeps the latest ones only", () => {
		for (let index = 0; index < CUSTOM_COLORS_LIMIT + 2; index += 1) {
			rememberCustomColor(`#0000${index.toString(16).padStart(2, "0")}`);
		}

		expect(loadCustomColors()).toHaveLength(CUSTOM_COLORS_LIMIT);
		expect(loadCustomColors()[0]).toBe("#000009");
	});

	it("ignores what is not a color and a storage that fails", () => {
		localStorage.setItem("quizio:custom-colors", '["azul", "#abcdef", 3]');
		expect(loadCustomColors()).toEqual(["#abcdef"]);

		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		expect(loadCustomColors()).toEqual([]);
	});
});
