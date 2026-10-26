import { describe, expect, it } from "vitest";

import { InvalidPostMessageError } from "./group-errors";
import { GROUP_POST_MESSAGE_MAX_LENGTH, parsePostMessage } from "./group-post";

describe("post message (spec 038, RN-12)", () => {
	it("a message has 1 to 500 characters, trimmed, keeping line breaks", () => {
		expect(parsePostMessage(" a ")).toBe("a");
		expect(parsePostMessage("  Revisem\naté sexta \n")).toBe(
			"Revisem\naté sexta",
		);
		const longest = `${"a".repeat(GROUP_POST_MESSAGE_MAX_LENGTH - 1)}👩‍🏫`;
		expect(parsePostMessage(longest)).toBe(longest);
	});

	it("refuses an empty message and one of 501 with GROUP.INVALID_MESSAGE", () => {
		for (const message of ["", " \n ", "a".repeat(501)]) {
			expect(() => parsePostMessage(message)).toThrow(InvalidPostMessageError);
		}
		expect(new InvalidPostMessageError().code).toBe("GROUP.INVALID_MESSAGE");
	});
});
