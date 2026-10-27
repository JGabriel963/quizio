import { describe, expect, it } from "vitest";

import {
	MAX_MEDIA_BYTES,
	MEDIA_EXTENSIONS,
} from "../../media/domain/media-policy";
import { SOURCE_MAX_BYTES } from "../../media/domain/source-policy";
import {
	InvalidGroupFileSizeError,
	UnsupportedGroupFileError,
} from "./group-errors";
import {
	GROUP_IMAGE_EXTENSIONS,
	GROUP_IMAGE_MAX_BYTES,
	GROUP_PDF_MAX_BYTES,
	parseGroupFile,
} from "./group-file";

const MB = 1024 * 1024;

describe("group file (spec 036, RN-09, RN-11)", () => {
	it("accepts JPG, PNG, GIF and WebP images up to 10 MB", () => {
		for (const [contentType, extension] of [
			["image/jpeg", "jpg"],
			["image/png", "png"],
			["image/gif", "gif"],
			["image/webp", "webp"],
		] as const) {
			expect(
				parseGroupFile({
					type: "image",
					contentType,
					sizeBytes: 10 * MB,
					fileName: `foto.${extension}`,
				}),
			).toEqual({
				type: "image",
				contentType,
				extension,
				sizeBytes: 10 * MB,
				name: `foto.${extension}`,
			});
		}
	});

	it("accepts a PDF up to 20 MB", () => {
		expect(
			parseGroupFile({
				type: "pdf",
				contentType: "application/pdf",
				sizeBytes: 20 * MB,
				fileName: "apostila.pdf",
			}),
		).toMatchObject({ type: "pdf", extension: "pdf", name: "apostila.pdf" });
	});

	it("refuses a type that does not match image or pdf with GROUP.UNSUPPORTED_FILE", () => {
		const cases = [
			{ type: "image", contentType: "application/pdf" },
			{ type: "image", contentType: "text/plain" },
			{ type: "pdf", contentType: "image/png" },
		] as const;
		for (const { type, contentType } of cases) {
			expect(() =>
				parseGroupFile({ type, contentType, sizeBytes: 10, fileName: "x" }),
			).toThrow(UnsupportedGroupFileError);
		}
		expect(new UnsupportedGroupFileError().code).toBe("GROUP.UNSUPPORTED_FILE");
	});

	it("refuses 0 bytes and oversize with GROUP.INVALID_FILE_SIZE", () => {
		const cases = [
			{ type: "image", contentType: "image/png", sizeBytes: 0 },
			{ type: "image", contentType: "image/png", sizeBytes: 10 * MB + 1 },
			{ type: "pdf", contentType: "application/pdf", sizeBytes: 20 * MB + 1 },
			{ type: "pdf", contentType: "application/pdf", sizeBytes: 1.5 },
		] as const;
		for (const input of cases) {
			expect(() => parseGroupFile({ ...input, fileName: "x" })).toThrow(
				InvalidGroupFileSizeError,
			);
		}
		expect(new InvalidGroupFileSizeError().code).toBe(
			"GROUP.INVALID_FILE_SIZE",
		);
	});

	it("cleans the file name: no path, no control characters, at most 120 characters, a default when empty", () => {
		const pdf = (fileName: string) =>
			parseGroupFile({
				type: "pdf",
				contentType: "application/pdf",
				sizeBytes: 10,
				fileName,
			}).name;
		expect(pdf("C:\\Users\\ana\\apostila.pdf")).toBe("apostila.pdf");
		expect(pdf("../../a/b.pdf")).toBe("b.pdf");
		expect(pdf(" aula\u0000\u0007 1.pdf ")).toBe("aula 1.pdf");
		expect(pdf(`${"a".repeat(200)}.pdf`)).toHaveLength(120);
		expect(pdf("")).toBe("arquivo.pdf");
		expect(
			parseGroupFile({
				type: "image",
				contentType: "image/png",
				sizeBytes: 10,
				fileName: " / ",
			}).name,
		).toBe("imagem");
	});

	it("matches the media policy limits", () => {
		expect(GROUP_IMAGE_MAX_BYTES).toBe(MAX_MEDIA_BYTES);
		expect(GROUP_PDF_MAX_BYTES).toBe(SOURCE_MAX_BYTES);
		expect(GROUP_IMAGE_EXTENSIONS).toEqual(MEDIA_EXTENSIONS);
	});
});
