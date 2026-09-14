import { describe, expect, it } from "vitest";

import { isMediaKeyOwnedBy, mediaKeyExtension, mediaKeyFor } from "./media-key";

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
