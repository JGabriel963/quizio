import { describe, expect, it } from "vitest";

import {
	groupFileKeyFor,
	isGroupFileKeyOf,
	isMediaKeyOwnedBy,
	isProfilePhotoKeyOwnedBy,
	isSourceKeyOwnedBy,
	isThemeFileKeyOwnedBy,
	mediaKeyExtension,
	mediaKeyFor,
	profilePhotoKeyFor,
	sourceKeyFor,
	themeFileKeyFor,
	themesPrefixOf,
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

	it("groupFileKeyFor and isGroupFileKeyOf: a single file under groups/{groupId}/", () => {
		const key = groupFileKeyFor("group-1", "abc", "pdf");
		expect(key).toBe("groups/group-1/abc.pdf");
		expect(isGroupFileKeyOf(key, "group-1")).toBe(true);
		for (const other of [
			"groups/group-10/abc.pdf",
			"groups/group-1/nested/abc.pdf",
			"groups/group-1/",
			"media/group-1/abc.pdf",
		]) {
			expect(isGroupFileKeyOf(other, "group-1")).toBe(false);
		}
	});

	it("profilePhotoKeyFor builds profiles/{userId}/{id}.{ext}", () => {
		expect(profilePhotoKeyFor("user-1", "abc", "webp")).toBe(
			"profiles/user-1/abc.webp",
		);
	});

	it("isProfilePhotoKeyOwnedBy refuses another user's key and nested paths", () => {
		expect(isProfilePhotoKeyOwnedBy("profiles/user-1/abc.webp", "user-1")).toBe(
			true,
		);
		for (const other of [
			"profiles/user-10/abc.webp",
			"profiles/user-1/nested/abc.webp",
			"profiles/user-1/",
			"media/user-1/abc.webp",
		]) {
			expect(isProfilePhotoKeyOwnedBy(other, "user-1")).toBe(false);
		}
	});
});

describe("theme file keys (spec 043, RN-28)", () => {
	it("a theme file lives under themes/{owner}/", () => {
		const key = themeFileKeyFor("user-1", "abc", "png");

		expect(key).toBe("themes/user-1/abc.png");
		expect(themesPrefixOf("user-1")).toBe("themes/user-1/");
		expect(isThemeFileKeyOwnedBy(key, "user-1")).toBe(true);
	});

	it.each([
		"themes/user-2/abc.png",
		"themes/user-1/nested/abc.png",
		"media/user-1/abc.png",
		"themes/user-1/",
	])("isThemeFileKeyOwnedBy refuses %s", (key) => {
		expect(isThemeFileKeyOwnedBy(key, "user-1")).toBe(false);
	});
});
