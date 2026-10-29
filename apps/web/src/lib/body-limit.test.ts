import { describe, expect, it } from "vitest";

import { limitBody } from "./body-limit";

const url = "http://localhost:3001/api/trpc/quiz.create";

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		},
	});
}

describe("limitBody (audit L6)", () => {
	it("passes a body within the limit on, with the request as it was", async () => {
		const request = new Request(url, {
			method: "POST",
			headers: { "content-type": "application/json", cookie: "a=b" },
			body: JSON.stringify({ title: "Capitais" }),
		});

		const limited = await limitBody(request, 1024);

		expect(limited).toBeInstanceOf(Request);
		const passed = limited as Request;
		expect(passed.method).toBe("POST");
		expect(passed.url).toBe(url);
		expect(passed.headers.get("cookie")).toBe("a=b");
		expect(await passed.json()).toEqual({ title: "Capitais" });
	});

	it("answers 413 for a body that says it is too large, before reading it", async () => {
		const request = new Request(url, {
			method: "POST",
			headers: { "content-length": "5000" },
			body: "x".repeat(5000),
		});

		const limited = await limitBody(request, 1024);

		expect(limited).toBeInstanceOf(Response);
		expect((limited as Response).status).toBe(413);
	});

	it("stops reading a body sent without its length once it passes the limit", async () => {
		const request = new Request(url, {
			method: "POST",
			body: streamOf("x".repeat(800), "x".repeat(800)),
			duplex: "half",
		} as RequestInit);

		const limited = await limitBody(request, 1024);

		expect((limited as Response).status).toBe(413);
	});

	it("leaves a request without a body alone", async () => {
		const request = new Request(`${url}?input=%7B%7D`);

		expect(await limitBody(request, 1024)).toBe(request);
	});
});
