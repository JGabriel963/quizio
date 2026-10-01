import { describe, expect, it } from "vitest";

import { isAcceptedImage, pickImageFile } from "./question-image-upload";

const MB = 1024 * 1024;
const file = (name: string, type: string, size = 2 * MB) =>
	({ name, type, size }) as File;

describe("question image upload", () => {
	it.each(["image/jpeg", "image/png", "image/gif", "image/webp"])(
		"accepts %s",
		(type) => {
			expect(isAcceptedImage(file("a", type))).toBe(true);
		},
	);

	it.each(["image/svg+xml", "application/pdf", ""])("refuses %s", (type) => {
		expect(isAcceptedImage(file("a", type))).toBe(false);
	});

	it("accepts exactly 10 MB and refuses more", () => {
		expect(isAcceptedImage(file("a", "image/png", 10 * MB))).toBe(true);
		expect(isAcceptedImage(file("a", "image/png", 10 * MB + 1))).toBe(false);
		expect(isAcceptedImage(file("a", "image/png", 0))).toBe(false);
	});

	it("picks the first accepted image of several files", () => {
		const first = file("um.png", "image/png");

		expect(
			pickImageFile([
				file("doc.pdf", "application/pdf"),
				first,
				file("dois.png", "image/png"),
			]),
		).toBe(first);
	});

	it("picks nothing when no file is an accepted image", () => {
		expect(
			pickImageFile([
				file("doc.pdf", "application/pdf"),
				file("grande.png", "image/png", 11 * MB),
			]),
		).toBeNull();
		expect(pickImageFile([])).toBeNull();
	});
});
