import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { UnsupportedMediaTypeError } from "../domain/media-policy";
import {
	FileUrlTooLargeError,
	FileUrlUnreachableError,
	InvalidFileUrlError,
} from "../domain/remote-file-errors";
import { FakeRemoteFiles } from "../testing/fake-remote-files";
import {
	createImportRemoteFile,
	type ImportRemoteFile,
} from "./import-remote-file";
import type { RemoteFileUploads } from "./ports/remote-file-uploads";
import { createRequestMediaUpload } from "./request-media-upload";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const png = (size = 1024) => {
	const bytes = new Uint8Array(size);
	bytes.set(PNG);
	return bytes;
};
const ascii = (text: string) =>
	Uint8Array.from(text, (char) => char.charCodeAt(0));
const pdf = () => ascii("%PDF-1.7\n...");

describe("importRemoteFile (spec 044, RN-24, CA-16)", () => {
	let storage: InMemoryObjectStorage;
	let remote: FakeRemoteFiles;
	let asked: Parameters<RemoteFileUploads["keyFor"]>[0][];
	let importFile: ImportRemoteFile;

	beforeEach(() => {
		storage = new InMemoryObjectStorage();
		remote = new FakeRemoteFiles();
		asked = [];
		const requestMediaUpload = createRequestMediaUpload({
			storage,
			ids: new SequentialIdGenerator("file"),
		});
		importFile = createImportRemoteFile({
			remoteFiles: remote,
			storage,
			uploads: {
				maxBytesFor: (target) =>
					target.kind === "groupFile" ? 20 * 1024 * 1024 : 10 * 1024 * 1024,
				// Media goes through its real policy; the others only record.
				keyFor: async (input) => {
					asked.push(input);
					if (input.target.kind === "media") {
						return requestMediaUpload(input);
					}
					return {
						key:
							input.target.kind === "groupFile"
								? `groups/${input.target.groupId}/upload.pdf`
								: `themes/${input.ownerId}/upload.png`,
					};
				},
			},
		});
	});

	it("imports a public PNG as the owner's media and returns its key", async () => {
		remote.serve("https://example.com/capa.png", { bytes: png() });

		const { key } = await importFile({
			ownerId: "ana",
			url: "https://example.com/capa.png",
			target: { kind: "media" },
		});

		expect(key).toBe("media/ana/file-1.png");
		expect(await storage.read(key)).toEqual(png());
	});

	it("uses the type the bytes show, not the one the server declared", async () => {
		remote.serve("https://example.com/foto", {
			bytes: png(),
			contentType: "text/html",
		});

		await importFile({
			ownerId: "ana",
			url: "https://example.com/foto",
			target: { kind: "media" },
		});

		expect(asked[0]).toMatchObject({ contentType: "image/png" });
	});

	it("refuses a PDF as an image, an 11 MB image and an HTML page without writing", async () => {
		remote.serve("https://example.com/doc.pdf", { bytes: pdf() });
		remote.serve("https://example.com/big.png", {
			bytes: png(11 * 1024 * 1024),
		});
		remote.serve("https://example.com/page", {
			bytes: ascii("<!doctype html>"),
		});
		const media = { kind: "media" } as const;

		await expect(
			importFile({
				ownerId: "ana",
				url: "https://example.com/doc.pdf",
				target: media,
			}),
		).rejects.toBeInstanceOf(UnsupportedMediaTypeError);
		await expect(
			importFile({
				ownerId: "ana",
				url: "https://example.com/big.png",
				target: media,
			}),
		).rejects.toBeInstanceOf(FileUrlTooLargeError);
		await expect(
			importFile({
				ownerId: "ana",
				url: "https://example.com/page",
				target: media,
			}),
		).rejects.toBeInstanceOf(UnsupportedMediaTypeError);
		expect(storage.keys()).toEqual([]);
	});

	it("passes the URL errors through", async () => {
		await expect(
			importFile({
				ownerId: "ana",
				url: "ftp://example.com/a.png",
				target: { kind: "media" },
			}),
		).rejects.toBeInstanceOf(InvalidFileUrlError);
		await expect(
			importFile({
				ownerId: "ana",
				url: "not a url",
				target: { kind: "media" },
			}),
		).rejects.toBeInstanceOf(InvalidFileUrlError);
		await expect(
			importFile({
				ownerId: "ana",
				url: "https://example.com/missing.png",
				target: { kind: "media" },
			}),
		).rejects.toBeInstanceOf(FileUrlUnreachableError);
	});

	it("a group file gets the group's key and pending upload; a theme file the theme's", async () => {
		remote.serve("https://example.com/prova.pdf", {
			bytes: pdf(),
			fileName: "prova.pdf",
		});
		remote.serve("https://example.com/logo.png", { bytes: png(1024) });

		const group = await importFile({
			ownerId: "ana",
			url: "https://example.com/prova.pdf",
			target: { kind: "groupFile", groupId: "turma" },
		});
		const theme = await importFile({
			ownerId: "ana",
			url: "https://example.com/logo.png",
			target: { kind: "themeFile" },
		});

		expect(group.key).toBe("groups/turma/upload.pdf");
		expect(theme.key).toBe("themes/ana/upload.png");
		expect(asked).toEqual([
			expect.objectContaining({
				contentType: "application/pdf",
				fileName: "prova.pdf",
				target: { kind: "groupFile", groupId: "turma" },
			}),
			expect.objectContaining({ contentType: "image/png", sizeBytes: 1024 }),
		]);
		expect(storage.keys()).toEqual([
			"groups/turma/upload.pdf",
			"themes/ana/upload.png",
		]);
	});
});
