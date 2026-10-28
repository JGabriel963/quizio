import { describe, expect, it } from "vitest";

import { connectTestClient } from "../testing/connect-test-client";

const png = (size = 1024) => {
	const bytes = new Uint8Array(size);
	bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	return bytes;
};

describe("file tools and sources (spec 044, RN-24, CA-16)", () => {
	it("request_upload for media returns the URL, the headers and a curl example", async () => {
		const { ok } = await connectTestClient({ userId: "ana" });

		const upload = await ok("request_upload", {
			purpose: "quizImage",
			contentType: "image/png",
			sizeBytes: 2048,
		});

		expect(upload).toMatchObject({
			uploadKey: expect.stringMatching(/^media\/ana\//),
			method: "PUT",
			headers: { "content-type": "image/png" },
		});
		expect(upload.curl).toContain("curl -X PUT");
		expect(upload.curl).toContain(String(upload.uploadUrl));
	});

	it("create_quiz takes a cover from a public link", async () => {
		const { api, ok } = await connectTestClient({ userId: "ana" });
		api.remoteFiles.serve("https://example.com/capa.png", { bytes: png() });

		const created = await ok("create_quiz", {
			title: "Com capa",
			cover: { url: "https://example.com/capa.png" },
		});

		expect(created.quiz).toMatchObject({
			coverImageUrl: expect.stringMatching(
				/^https:\/\/media\.test\/media\/ana\//,
			),
		});
	});

	it("update_question takes an image by uploadKey, as background with alt text", async () => {
		const { api, ok } = await connectTestClient({ userId: "ana" });
		const created = await ok("create_quiz", {
			title: "Mapa",
			questions: [{ type: "trueFalse", text: "?", correct: true }],
		});
		const quizId = (created.quiz as { id: string }).id;
		const [question] = (await ok("get_quiz", { quizId })).questions as {
			id: string;
		}[];
		const upload = await ok("request_upload", {
			purpose: "quizImage",
			contentType: "image/png",
			sizeBytes: 1024,
		});
		api.storage.simulateUpload(String(upload.uploadKey));

		const updated = await ok("update_question", {
			quizId,
			questionId: question?.id,
			changes: {
				image: {
					source: { uploadKey: upload.uploadKey },
					placement: "background",
					altText: "Mapa da França",
				},
			},
		});

		expect(updated.question).toMatchObject({
			image: {
				key: upload.uploadKey,
				placement: "background",
				altText: "Mapa da França",
			},
			imageUrl: expect.stringContaining(String(upload.uploadKey)),
		});
	});

	it("an internal-network link, an unreachable one, a PDF as image and an 11 MB image are refused and nothing changes", async () => {
		const { api, call, ok } = await connectTestClient({ userId: "ana" });
		const { FileUrlNotPublicError } = await import(
			"@quizio/core/media/domain/remote-file-errors"
		);
		api.remoteFiles.fail(
			"http://169.254.169.254/latest",
			new FileUrlNotPublicError(),
		);
		api.remoteFiles.serve("https://example.com/doc.pdf", {
			bytes: Uint8Array.from("%PDF-1.7", (char) => char.charCodeAt(0)),
		});
		api.remoteFiles.serve("https://example.com/big.png", {
			bytes: png(11 * 1024 * 1024),
		});

		const codes: string[] = [];
		for (const url of [
			"http://169.254.169.254/latest",
			"https://example.com/missing.png",
			"https://example.com/doc.pdf",
			"https://example.com/big.png",
		]) {
			const result = await call("create_quiz", {
				title: "Recusado",
				cover: { url },
			});
			expect(result.isError, url).toBe(true);
			codes.push((result.data.error as { code: string }).code);
		}

		expect(codes).toEqual([
			"MEDIA.URL_NOT_PUBLIC",
			"MEDIA.URL_UNREACHABLE",
			"MEDIA.UNSUPPORTED_TYPE",
			"MEDIA.URL_TOO_LARGE",
		]);
		expect((await ok("list_quizzes", { section: "recent" })).quizzes).toEqual(
			[],
		);
	});
});
