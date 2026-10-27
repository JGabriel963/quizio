import { describe, expect, it } from "vitest";

import { EmptyPostError, InvalidPostMessageError } from "./group-errors";
import {
	assertPostHasContent,
	GROUP_POST_MESSAGE_MAX_LENGTH,
	parseOptionalPostMessage,
	postHeadlineOf,
} from "./group-post";

describe("post message (spec 036, RN-05)", () => {
	it("parseOptionalPostMessage: 0 to 500 characters, trimmed, keeping line breaks; empty is null", () => {
		expect(parseOptionalPostMessage(" a ")).toBe("a");
		expect(parseOptionalPostMessage("  Revisem\naté sexta \n")).toBe(
			"Revisem\naté sexta",
		);
		const longest = `${"a".repeat(GROUP_POST_MESSAGE_MAX_LENGTH - 1)}👩‍🏫`;
		expect(parseOptionalPostMessage(longest)).toBe(longest);
		expect(parseOptionalPostMessage("")).toBeNull();
		expect(parseOptionalPostMessage(" \n ")).toBeNull();
	});

	it("refuses 501 characters with GROUP.INVALID_MESSAGE", () => {
		expect(() => parseOptionalPostMessage("a".repeat(501))).toThrow(
			InvalidPostMessageError,
		);
		expect(new InvalidPostMessageError().code).toBe("GROUP.INVALID_MESSAGE");
	});

	it("assertPostHasContent refuses no text and no attachment with GROUP.EMPTY_POST", () => {
		expect(() => assertPostHasContent(null, false)).toThrow(EmptyPostError);
		expect(new EmptyPostError().code).toBe("GROUP.EMPTY_POST");
		expect(() => assertPostHasContent("Oi", false)).not.toThrow();
		expect(() => assertPostHasContent(null, true)).not.toThrow();
	});
});

describe("postHeadlineOf (spec 036, RN-17)", () => {
	const file = (type: "image" | "pdf") => ({
		type,
		key: "groups/g/f",
		name: "f",
		sizeBytes: 1,
	});

	it("message, image, file, assignment", () => {
		expect(postHeadlineOf({ kind: "message", file: null }, false)).toBe(
			"message",
		);
		expect(
			postHeadlineOf({ kind: "message", file: file("image") }, false),
		).toBe("image");
		expect(postHeadlineOf({ kind: "message", file: file("pdf") }, false)).toBe(
			"file",
		);
		expect(postHeadlineOf({ kind: "assignment", file: null }, true)).toBe(
			"assignment",
		);
	});

	it("an assignment without its card reads as a file", () => {
		expect(postHeadlineOf({ kind: "assignment", file: null }, false)).toBe(
			"file",
		);
	});
});

describe("postHeadlineOf for shared quizzes (spec 037, RN-09, RN-13)", () => {
	it("quizShare alive is quiz, without its share is file", () => {
		expect(postHeadlineOf({ kind: "quizShare", file: null }, true)).toBe(
			"quiz",
		);
		expect(postHeadlineOf({ kind: "quizShare", file: null }, false)).toBe(
			"file",
		);
	});

	it("quizzesShare is always quizzes", () => {
		expect(postHeadlineOf({ kind: "quizzesShare", file: null }, false)).toBe(
			"quizzes",
		);
		expect(postHeadlineOf({ kind: "quizzesShare", file: null }, true)).toBe(
			"quizzes",
		);
	});
});
