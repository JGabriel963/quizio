import { describe, expect, it } from "vitest";

import {
	isMediaKeyOwnedBy,
	isSourceKeyOwnedBy,
	mediaKeyExtension,
	mediaKeyFor,
	sourceKeyFor,
} from "./media-key";

describe("media keys", () => {
	it("builds owner-scoped keys, detects ownership and reads the extension", () => {
		const key = mediaKeyFor("user-1", "abc", "png");

		expect(key).toBe("media/user-1/abc.png");
		expect(isMediaKeyOwnedBy(key, "user-1")).toBe(true);
		expect(isMediaKeyOwnedBy(key, "user-10")).toBe(false);
		expect(mediaKeyExtension(key)).toBe("png");
	});

	it.each([
		"other/user-1/abc.png",
		"media/user-1/nested/abc.png",
		"media/user-1/..",
		"media/user-1/",
		"media/user-12/abc.png",
	])("does not treat %s as owned by user-1", (key) => {
		expect(isMediaKeyOwnedBy(key, "user-1")).toBe(false);
	});

	it("returns null for keys without an extension", () => {
		expect(mediaKeyExtension("media/user-1/abc")).toBeNull();
	});
});

describe("source keys", () => {
	it("a source key lives under sources/{owner}", () => {
		const key = sourceKeyFor("user-1", "abc");

		expect(key).toBe("sources/user-1/abc.pdf");
		expect(isSourceKeyOwnedBy(key, "user-1")).toBe(true);
	});

	it.each([
		"sources/user-10/abc.pdf",
		"sources/user-1/nested/abc.pdf",
		"sources/user-1/",
		"sources/user-1/..",
	])("a source key of another owner or path is refused: %s", (key) => {
		expect(isSourceKeyOwnedBy(key, "user-1")).toBe(false);
	});

	it("a media key is not a source key, nor the other way round", () => {
		expect(
			isSourceKeyOwnedBy(mediaKeyFor("user-1", "abc", "pdf"), "user-1"),
		).toBe(false);
		expect(isMediaKeyOwnedBy(sourceKeyFor("user-1", "abc"), "user-1")).toBe(
			false,
		);
	});
});
