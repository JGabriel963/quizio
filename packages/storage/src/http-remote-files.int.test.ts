import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
	FileUrlNotPublicError,
	FileUrlTooLargeError,
	FileUrlUnreachableError,
	InvalidFileUrlError,
} from "@quizio/core/media/domain/remote-file-errors";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createHttpRemoteFiles } from "./http-remote-files";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);

describe("HttpRemoteFiles against a local HTTP server (spec 044, RN-24)", () => {
	let server: Server;
	let base: string;

	beforeAll(async () => {
		server = createServer((request, response) => {
			const path = request.url ?? "/";
			if (path === "/logo.png") {
				response.writeHead(200, { "content-type": "image/png" });
				response.end(PNG);
			} else if (path === "/download") {
				response.writeHead(200, {
					"content-type": "application/pdf",
					"content-disposition": 'attachment; filename="prova final.pdf"',
				});
				response.end("%PDF-1.7");
			} else if (path === "/big") {
				response.writeHead(200, { "content-type": "image/png" });
				response.end(Buffer.alloc(4096));
			} else if (path === "/slow") {
				// Never answers.
			} else if (path.startsWith("/hop/")) {
				const left = Number(path.split("/")[2]);
				response.writeHead(302, {
					location: left > 0 ? `/hop/${left - 1}` : "/logo.png",
				});
				response.end();
			} else if (path === "/to-ftp") {
				response.writeHead(302, { location: "ftp://example.com/a.png" });
				response.end();
			} else {
				response.writeHead(404);
				response.end();
			}
		});
		await new Promise<void>((resolve) =>
			server.listen(0, "127.0.0.1", resolve),
		);
		base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterAll(() => {
		server.closeAllConnections();
		server.close();
	});

	const files = (allowPrivateNetworks = true) =>
		createHttpRemoteFiles({
			timeoutMs: 1_000,
			maxRedirects: 3,
			allowPrivateNetworks,
		});

	it("reads the bytes, the type and the file name", async () => {
		const image = await files().fetch(`${base}/logo.png`, 1024);
		const pdf = await files().fetch(`${base}/download`, 1024);

		expect(Buffer.from(image.bytes)).toEqual(PNG);
		expect(image).toMatchObject({
			contentType: "image/png",
			fileName: "logo.png",
		});
		expect(pdf).toMatchObject({
			contentType: "application/pdf",
			fileName: "prova final.pdf",
		});
	});

	it("stops past maxBytes", async () => {
		await expect(files().fetch(`${base}/big`, 1024)).rejects.toBeInstanceOf(
			FileUrlTooLargeError,
		);
	});

	it("gives up after the timeout and after 3 redirects", async () => {
		await expect(files().fetch(`${base}/slow`, 1024)).rejects.toBeInstanceOf(
			FileUrlUnreachableError,
		);
		await expect(files().fetch(`${base}/hop/2`, 1024)).resolves.toMatchObject({
			fileName: "logo.png",
		});
		await expect(files().fetch(`${base}/hop/3`, 1024)).rejects.toBeInstanceOf(
			FileUrlUnreachableError,
		);
		await expect(files().fetch(`${base}/missing`, 1024)).rejects.toBeInstanceOf(
			FileUrlUnreachableError,
		);
	});

	it("refuses a redirect to another scheme", async () => {
		await expect(files().fetch(`${base}/to-ftp`, 1024)).rejects.toBeInstanceOf(
			InvalidFileUrlError,
		);
	});

	it("refuses private addresses, by IP or by name, when they are not allowed", async () => {
		const port = (server.address() as AddressInfo).port;

		await expect(
			files(false).fetch(`http://127.0.0.1:${port}/logo.png`, 1024),
		).rejects.toBeInstanceOf(FileUrlNotPublicError);
		await expect(
			files(false).fetch(`http://localhost:${port}/logo.png`, 1024),
		).rejects.toBeInstanceOf(FileUrlNotPublicError);
		// 127.0.0.1 as an IPv4-mapped IPv6 literal, which a URL writes in hex.
		await expect(
			files(false).fetch(`http://[::ffff:127.0.0.1]:${port}/logo.png`, 1024),
		).rejects.toBeInstanceOf(FileUrlNotPublicError);
	});
});
