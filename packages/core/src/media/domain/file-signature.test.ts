import { describe, expect, it } from "vitest";

import { sniffFileType } from "./file-signature";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) =>
	Uint8Array.from(value, (char) => char.charCodeAt(0));

describe("sniffFileType (spec 044, RN-24)", () => {
	it("recognizes JPEG, PNG, GIF, WebP and PDF by their first bytes", () => {
		expect(sniffFileType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00))).toBe(
			"image/jpeg",
		);
		expect(
			sniffFileType(
				bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00),
			),
		).toBe("image/png");
		expect(sniffFileType(text("GIF89a......"))).toBe("image/gif");
		expect(sniffFileType(text("GIF87a......"))).toBe("image/gif");
		expect(sniffFileType(text("RIFF\u0000\u0000\u0000\u0000WEBPVP8 "))).toBe(
			"image/webp",
		);
		expect(sniffFileType(text("%PDF-1.7\n"))).toBe("application/pdf");
	});

	it("returns null for HTML, text and empty bytes", () => {
		expect(sniffFileType(text("<!doctype html><html>"))).toBeNull();
		expect(sniffFileType(text("just some text"))).toBeNull();
		expect(sniffFileType(new Uint8Array())).toBeNull();
		expect(
			sniffFileType(text("RIFF\u0000\u0000\u0000\u0000WAVEfmt ")),
		).toBeNull();
	});
});
