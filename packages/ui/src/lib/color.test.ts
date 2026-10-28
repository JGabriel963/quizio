import { describe, expect, it } from "vitest";

import { hexToHsv, hsvToHex, parseHexInput } from "./color";

describe("color math (ColorPicker)", () => {
	it("hsvToHex gives the pure hues and the grays", () => {
		expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe("#ff0000");
		expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe("#00ff00");
		expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe("#0000ff");
		expect(hsvToHex({ h: 0, s: 0, v: 1 })).toBe("#ffffff");
		expect(hsvToHex({ h: 0, s: 0, v: 0 })).toBe("#000000");
	});

	it("hexToHsv and back keeps the color", () => {
		for (const hex of ["#253e81", "#e66e0a", "#1368ce", "#46178f", "#7a7a7a"]) {
			expect(hsvToHex(hexToHsv(hex))).toBe(hex);
		}
	});

	it("a gray keeps no saturation", () => {
		expect(hexToHsv("#808080")).toMatchObject({ s: 0 });
	});

	it("parseHexInput takes 3 or 6 digits, with or without #", () => {
		expect(parseHexInput("fff")).toBe("#ffffff");
		expect(parseHexInput("#253E81")).toBe("#253e81");
		expect(parseHexInput("253e81")).toBe("#253e81");
		expect(parseHexInput("#12345")).toBeNull();
		expect(parseHexInput("azul")).toBeNull();
	});
});
