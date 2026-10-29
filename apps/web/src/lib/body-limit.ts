/**
 * The most a request to the API may send (audit L6). File bytes never come
 * through the app (they go straight to storage), so a megabyte is far more
 * than the largest quiz an agent creates in one call. Vercel stops bodies
 * past 4.5 MB itself; a server of our own reads whatever arrives.
 */
export const MAX_REQUEST_BYTES = 1024 * 1024;

function tooLarge(): Response {
	return new Response("Request body too large", { status: 413 });
}

/**
 * The request with its body read up to `maxBytes`, or a 413 answer: a body
 * that says it is larger is refused before it is read, and one sent without
 * its length is read only up to the limit.
 */
export async function limitBody(
	request: Request,
	maxBytes = MAX_REQUEST_BYTES,
): Promise<Request | Response> {
	if (!request.body) {
		return request;
	}
	const declared = Number(request.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > maxBytes) {
		return tooLarge();
	}
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		size += value.byteLength;
		if (size > maxBytes) {
			await reader.cancel();
			return tooLarge();
		}
		chunks.push(value);
	}
	const body = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new Request(request.url, {
		method: request.method,
		headers: request.headers,
		body,
		signal: request.signal,
	});
}
