import { describe, expect, it } from "vitest";

import {
	assertSourceContentType,
	assertSourceSize,
	InvalidSourceSizeError,
	SOURCE_MAX_BYTES,
	UnsupportedSourceTypeError,
} from "./source-policy";

describe("source document policy", () => {
	it("accepts only application/pdf", () => {
		expect(assertSourceContentType("application/pdf")).toBe("application/pdf");
		expect(() => assertSourceContentType("image/png")).toThrow(
			UnsupportedSourceTypeError,
		);
	});

	it("accepts up to 20 MB", () => {
		expect(SOURCE_MAX_BYTES).toBe(20 * 1024 * 1024);
		expect(() => assertSourceSize(SOURCE_MAX_BYTES)).not.toThrow();
		expect(() => assertSourceSize(SOURCE_MAX_BYTES + 1)).toThrow(
			InvalidSourceSizeError,
		);
		expect(() => assertSourceSize(0)).toThrow(InvalidSourceSizeError);
	});
});
