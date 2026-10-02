/** How long a screen that lost its connection waits before trying again (spec 013, RN-06). */
export const CONNECTION_RETRY_MS = 5_000;

/** A request without an answer for this long counts as a lost connection. */
export const CONNECTION_TIMEOUT_MS = 5_000;

/** The server did not answer in time. */
export class ConnectionTimeoutError extends Error {
	constructor() {
		super("The server did not answer in time");
		this.name = "ConnectionTimeoutError";
	}
}

/**
 * Whether a request failed for lack of an answer from the server: the network,
 * not a refusal (spec 013, RN-04). An error the API answered with carries
 * `data`; what `fetch` threw, or a reply that was not the API's, does not.
 */
export function isConnectionFailure(error: unknown): boolean {
	if (error instanceof ConnectionTimeoutError) {
		return true;
	}
	if (!(error instanceof Error)) {
		return false;
	}
	if (error.name === "TRPCClientError") {
		return (error as { data?: unknown }).data == null;
	}
	// What `fetch` itself throws when the server is out of reach.
	return error instanceof TypeError;
}

/**
 * The request, or a connection failure once it takes longer than `ms`. The
 * request is not aborted: the client sends requests in batches, so it may
 * still reach the server, and whoever calls must be safe to repeat.
 */
export function withTimeout<T>(
	request: Promise<T>,
	ms: number = CONNECTION_TIMEOUT_MS,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new ConnectionTimeoutError()), ms);
		request.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error: unknown) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});
}
