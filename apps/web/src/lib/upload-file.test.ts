import { describe, expect, it } from "vitest";

import { uploadFile } from "./upload-file";

class FakeXhr {
	method = "";
	url = "";
	headers: Record<string, string> = {};
	body: unknown;
	status = 0;
	upload: { onprogress: ((event: ProgressEvent) => void) | null } = {
		onprogress: null,
	};
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;

	open(method: string, url: string) {
		this.method = method;
		this.url = url;
	}

	setRequestHeader(name: string, value: string) {
		this.headers[name] = value;
	}

	send(body: unknown) {
		this.body = body;
	}

	progress(loaded: number, total: number) {
		this.upload.onprogress?.({
			lengthComputable: true,
			loaded,
			total,
		} as ProgressEvent);
	}

	respond(status: number) {
		this.status = status;
		this.onload?.();
	}
}

const presigned = {
	uploadUrl: "https://storage.test/upload/media/user-1/id-1.png",
	method: "PUT" as const,
	headers: { "content-type": "image/png" },
};

function startUpload(xhr: FakeXhr, progress: number[] = []) {
	const file = new Blob(["png-bytes"], { type: "image/png" });
	const done = uploadFile({
		file,
		upload: presigned,
		onProgress: (fraction) => progress.push(fraction),
		createRequest: () => xhr as unknown as XMLHttpRequest,
	});
	return { file, done };
}

describe("uploadFile", () => {
	it("sends the file with the presigned headers and reports progress", async () => {
		const xhr = new FakeXhr();
		const progress: number[] = [];
		const { file, done } = startUpload(xhr, progress);

		xhr.progress(50, 100);
		xhr.respond(200);
		await done;

		expect(xhr.method).toBe("PUT");
		expect(xhr.url).toBe(presigned.uploadUrl);
		expect(xhr.headers).toEqual({ "content-type": "image/png" });
		expect(xhr.body).toBe(file);
		expect(progress).toEqual([0.5, 1]);
	});

	it("rejects when storage answers with an error status", async () => {
		const xhr = new FakeXhr();
		const { done } = startUpload(xhr);

		xhr.respond(403);

		await expect(done).rejects.toThrow("403");
	});

	it("rejects on network errors", async () => {
		const xhr = new FakeXhr();
		const { done } = startUpload(xhr);

		xhr.onerror?.();

		await expect(done).rejects.toThrow();
	});
});
