import {
	EncryptedSourceError,
	InvalidSourceError,
	InvalidSourcePagesError,
} from "@quizio/core/quiz/domain/generation";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { createPdfLibPdfPages } from "./pdf-lib-pdf-pages";

/** A PDF whose page N is 100 + N points wide, to tell the pages apart. */
async function pdfWithPages(count: number): Promise<Uint8Array> {
	const document = await PDFDocument.create();
	for (let page = 1; page <= count; page++) {
		document.addPage([100 + page, 200]);
	}
	return document.save({ useObjectStreams: false });
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
});
