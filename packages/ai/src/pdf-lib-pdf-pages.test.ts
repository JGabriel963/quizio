import { deflateSync } from "node:zlib";
import {
	EncryptedSourceError,
	InvalidSourceError,
	InvalidSourcePagesError,
} from "@quizio/core/quiz/domain/generation";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { createPdfLibPdfPages } from "./pdf-lib-pdf-pages";

/** A PDF whose page N is 100 + N points wide, to tell the pages apart. */
async function pdfWithPages(
	count: number,
	{ useObjectStreams = false } = {},
): Promise<Uint8Array> {
	const document = await PDFDocument.create();
	for (let page = 1; page <= count; page++) {
		document.addPage([100 + page, 200]);
	}
	return document.save({ useObjectStreams });
}

/**
 * A valid one-page PDF plus an object stream that decodes to about `size`
 * bytes, Flate-compressed `layers` times: a few KB that pdf-lib would inflate
 * in full while loading.
 */
async function pdfWithObjectStream(
	size: number,
	layers = 1,
): Promise<Uint8Array> {
	const text = new TextDecoder("latin1").decode(await pdfWithPages(1));
	// The cross-reference table, not the `startxref` after it.
	const xref = text.lastIndexOf("\nxref") + 1;
	// Object 999 is `null`, followed by spaces up to the size.
	let data = Buffer.from(`999 0 null${" ".repeat(size)}`, "latin1");
	for (let layer = 0; layer < layers; layer++) {
		data = deflateSync(data);
	}
	const filter =
		layers === 1 ? "/FlateDecode" : `[${" /FlateDecode".repeat(layers)} ]`;
	return Buffer.concat([
		Buffer.from(text.slice(0, xref), "latin1"),
		Buffer.from(
			`998 0 obj\n<< /Type /ObjStm /N 1 /First 6 /Filter ${filter} /Length ${data.length} >>\nstream\n`,
			"latin1",
		),
		data,
		Buffer.from(`\nendstream\nendobj\n${text.slice(xref)}`, "latin1"),
	]);
}

/** The same PDF with an /Encrypt entry in its trailer, as a password-protected one has. */
async function encryptedPdf(): Promise<Uint8Array> {
	const text = new TextDecoder("latin1").decode(await pdfWithPages(1));
	const encrypted = text.replace(
		/trailer\s*<</,
		"trailer\n<<\n/Encrypt << /Filter /Standard /V 1 /R 2 >>",
	);
	return Uint8Array.from(encrypted, (char) => char.charCodeAt(0));
}

async function pageWidths(bytes: Uint8Array): Promise<number[]> {
	const document = await PDFDocument.load(bytes);
	return document.getPages().map((page) => page.getWidth());
}

describe("PdfLibPdfPages", () => {
	const pdfPages = createPdfLibPdfPages();

	it("copies the chosen pages in order", async () => {
		const selected = await pdfPages.select(await pdfWithPages(5), [4, 1, 2]);

		expect(await pageWidths(selected)).toEqual([104, 101, 102]);
	});

	it("reports a password-protected PDF", async () => {
		await expect(pdfPages.select(await encryptedPdf(), [1])).rejects.toThrow(
			EncryptedSourceError,
		);
	});

	it("reports a corrupt PDF", async () => {
		await expect(
			pdfPages.select(new Uint8Array([1, 2, 3, 4, 5]), [1]),
		).rejects.toThrow(InvalidSourceError);
	});

	it("refuses a page outside the document", async () => {
		await expect(pdfPages.select(await pdfWithPages(2), [3])).rejects.toThrow(
			InvalidSourcePagesError,
		);
	});

	describe("streams decoded while loading", () => {
		const limited = createPdfLibPdfPages({ maxDecodedBytes: 1024 * 1024 });

		it("reads object streams within the limit", async () => {
			const selected = await limited.select(
				await pdfWithPages(3, { useObjectStreams: true }),
				[2],
			);
			const small = await limited.select(
				await pdfWithObjectStream(100 * 1024),
				[1],
			);

			expect(await pageWidths(selected)).toEqual([102]);
			expect(await pageWidths(small)).toEqual([101]);
		});

		it("refuses an object stream that decodes past the limit", async () => {
			await expect(
				limited.select(await pdfWithObjectStream(4 * 1024 * 1024), [1]),
			).rejects.toThrow(InvalidSourceError);
		});

		it("refuses one compressed in layers, whose last layer is the big one", async () => {
			await expect(
				limited.select(await pdfWithObjectStream(4 * 1024 * 1024, 2), [1]),
			).rejects.toThrow(InvalidSourceError);
		});
	});
});
