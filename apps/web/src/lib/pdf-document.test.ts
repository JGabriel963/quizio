// @vitest-environment node
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
	openPdf,
	PDF_INVALID_MESSAGE,
	PDF_PASSWORD_MESSAGE,
	PdfOpenError,
} from "./pdf-document";

// The browser build needs a worker; tests read with the Node build.
const loadNodePdfJs = () => import("pdfjs-dist/legacy/build/pdf.mjs");

async function pdfWith(pages: string[][]): Promise<Uint8Array> {
	const document = await PDFDocument.create();
	const font = await document.embedFont(StandardFonts.Helvetica);
	for (const lines of pages) {
		const page = document.addPage([300, 300]);
		lines.forEach((line, index) => {
			page.drawText(line, { x: 10, y: 270 - index * 20, size: 12, font });
		});
	}
	return document.save();
}

describe("openPdf", () => {
	it("counts the pages", async () => {
		const pdf = await openPdf(
			await pdfWith([["Um"], ["Dois"], ["Tres"]]),
			loadNodePdfJs,
		);

		expect(pdf.pageCount).toBe(3);
		await pdf.destroy();
	});

	it("returns each page's text, line by line", async () => {
		const pdf = await openPdf(
			await pdfWith([["1. Qual e a capital?", "a) Rio", "b) Brasilia"], []]),
			loadNodePdfJs,
		);

		expect(await pdf.pageTexts()).toEqual([
			"1. Qual e a capital?\na) Rio\nb) Brasilia",
			"",
		]);
		await pdf.destroy();
	});

	it("tells an unreadable file", async () => {
		const opening = openPdf(new Uint8Array([1, 2, 3]), loadNodePdfJs);

		await expect(opening).rejects.toBeInstanceOf(PdfOpenError);
		await expect(opening).rejects.toThrow(PDF_INVALID_MESSAGE);
	});

	it("tells a password-protected PDF", async () => {
		// pdf.js rejects with a PasswordException before asking for the password.
		const passwordProtected = async () =>
			({
				getDocument: () => ({
					promise: Promise.reject(
						Object.assign(new Error("No password given"), {
							name: "PasswordException",
						}),
					),
				}),
			}) as unknown as Awaited<ReturnType<typeof loadNodePdfJs>>;

		await expect(
			openPdf(new Uint8Array([1]), passwordProtected),
		).rejects.toThrow(PDF_PASSWORD_MESSAGE);
	});
});
