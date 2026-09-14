import { describe, expect, it } from "vitest";

import {
	assertCreatorName,
	InvalidCreatorNameError,
	normalizeCreatorName,
	normalizeEmail,
	PASSWORD_LENGTH,
} from "./sign-up-rules";

describe("sign-up rules", () => {
	it("accepts names of 2 and 50 characters and rejects 1 and 51", () => {
		expect(() => assertCreatorName("Al")).not.toThrow();
		expect(() => assertCreatorName("a".repeat(50))).not.toThrow();
		expect(() => assertCreatorName("A")).toThrow(InvalidCreatorNameError);
		expect(() => assertCreatorName("a".repeat(51))).toThrow(
			InvalidCreatorNameError,
		);
	});

	it("measures the name after trimming surrounding spaces", () => {
		expect(() => assertCreatorName("  A  ")).toThrow(InvalidCreatorNameError);
	});

	it("trims names and lowercases trimmed emails", () => {
		expect(normalizeCreatorName("  Ana Souza ")).toBe("Ana Souza");
		expect(normalizeEmail(" Ana@Exemplo.com ")).toBe("ana@exemplo.com");
	});

	it("exposes password limits of 8 to 128", () => {
		expect(PASSWORD_LENGTH).toEqual({ min: 8, max: 128 });
	});
});
