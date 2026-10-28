import type { CallToolResult } from "@modelcontextprotocol/server";
import { DomainError } from "@quizio/core/shared/domain/domain-error";

/** Plain JSON, as the agent reads it: dates become ISO strings. */
function asJson(value: unknown): Record<string, unknown> {
	const json = JSON.parse(JSON.stringify(value ?? null)) as unknown;
	return json !== null && typeof json === "object" && !Array.isArray(json)
		? (json as Record<string, unknown>)
		: { result: json };
}

/**
 * A tool's answer, as structured content and as the same JSON in text, for
 * agents that only read text.
 */
export function toolResult(value: unknown): CallToolResult {
	const data = asJson(value);
	return {
		content: [{ type: "text", text: JSON.stringify(data) }],
		structuredContent: data,
	};
}

/**
 * A refusal says why, with the domain error's stable code (spec 044, RN-11).
 * Something missing and something of another person's give the same answer,
 * since both are a `NotFoundError` with the same code. Anything that is not
 * a domain error is a bug: the agent learns nothing of it.
 */
export function toolErrorResult(
	error: unknown,
	onError?: (error: Error) => void,
): CallToolResult {
	const details =
		error instanceof DomainError
			? (error as { details?: Record<string, unknown> }).details
			: undefined;
	const failure =
		error instanceof DomainError
			? {
					code: error.code,
					message: error.message,
					...(details ? { details } : {}),
				}
			: {
					code: "INTERNAL",
					message: "Something went wrong on Quizio's side. Try again later.",
				};
	if (!(error instanceof DomainError)) {
		onError?.(error instanceof Error ? error : new Error(String(error)));
	}
	const data = { error: failure };
	return {
		content: [{ type: "text", text: JSON.stringify(data) }],
		structuredContent: data,
		isError: true,
	};
}
