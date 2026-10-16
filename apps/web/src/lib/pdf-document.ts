/**
 * A PDF read in the browser with pdf.js (spec 027): the page count and the
 * thumbnails of "Selecione páginas", and each page's text for "already has
 * questions?" (RN-16). Loaded on demand and only in the browser.
 */

type PdfJs = typeof import("pdfjs-dist");

export const PDF_PASSWORD_MESSAGE = "Esse PDF está protegido por senha.";
export const PDF_INVALID_MESSAGE = "Não foi possível abrir esse PDF.";

export class PdfOpenError extends Error {}

export interface PdfDocumentHandle {
	pageCount: number;
	/** One text per page, with a line break where pdf.js ends a line. */
	pageTexts(): Promise<string[]>;
	/** Draws a page `width` pixels wide into the canvas. */
	renderPage(
		page: number,
		canvas: HTMLCanvasElement,
		width: number,
	): Promise<void>;
	destroy(): Promise<void>;
}

/** The browser build, with its worker served by Vite. */
async function loadBrowserPdfJs(): Promise<PdfJs> {
	const [pdfjs, worker] = await Promise.all([
		import("pdfjs-dist"),
		import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
	]);
	pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
	return pdfjs;
}

export async function openPdf(
	data: Uint8Array,
	loadPdfJs: () => Promise<PdfJs> = loadBrowserPdfJs,
): Promise<PdfDocumentHandle> {
	const pdfjs = await loadPdfJs();
	// pdf.js takes the buffer over: it gets a copy.
	const loading = pdfjs.getDocument({ data: data.slice() });
	let document: Awaited<typeof loading.promise>;
	try {
		document = await loading.promise;
	} catch (error) {
		throw new PdfOpenError(
			(error as { name?: string })?.name === "PasswordException"
				? PDF_PASSWORD_MESSAGE
				: PDF_INVALID_MESSAGE,
		);
	}

	return {
		pageCount: document.numPages,

		async pageTexts() {
			const texts: string[] = [];
			for (let number = 1; number <= document.numPages; number++) {
				const page = await document.getPage(number);
				const content = await page.getTextContent();
				texts.push(
					content.items
						.map((item) =>
							"str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
						)
						.join("")
						.trim(),
				);
			}
			return texts;
		},

		async renderPage(number, canvas, width) {
			const page = await document.getPage(number);
			const base = page.getViewport({ scale: 1 });
			const viewport = page.getViewport({ scale: width / base.width });
			canvas.width = Math.floor(viewport.width);
			canvas.height = Math.floor(viewport.height);
			await page.render({ canvas, viewport }).promise;
		},

		destroy: () => loading.destroy(),
	};
}
