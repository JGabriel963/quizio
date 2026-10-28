import { describe, expect, it } from "vitest";

import {
	ACCESS_KEY_NAME_MAX_LENGTH,
	isAccessKeyToken,
	parseAccessKeyName,
} from "./access-key";
import { InvalidAccessKeyNameError } from "./agent-errors";

describe("parseAccessKeyName (spec 044, RN-05)", () => {
	it("a key name has 1 to 50 characters, trimmed", () => {
		expect(parseAccessKeyName("  Script da escola ")).toBe("Script da escola");
		expect(parseAccessKeyName("🤖")).toBe("🤖");
		expect(
			parseAccessKeyName("a".repeat(ACCESS_KEY_NAME_MAX_LENGTH)),
		).toHaveLength(50);
	});

	it("refuses an empty or 51-character name (AGENT.INVALID_KEY_NAME)", () => {
		expect(() => parseAccessKeyName("   ")).toThrow(InvalidAccessKeyNameError);
		expect(() => parseAccessKeyName("a".repeat(51))).toThrow(
			InvalidAccessKeyNameError,
		);
	});
});

describe("isAccessKeyToken", () => {
	it("isAccessKeyToken recognizes the qz_ prefix", () => {
		expect(isAccessKeyToken("qz_AbCdEf")).toBe(true);
		expect(isAccessKeyToken("eyJhbGciOiJFZERTQSJ9.payload.signature")).toBe(
			false,
		);
		expect(isAccessKeyToken("")).toBe(false);
	});
});
