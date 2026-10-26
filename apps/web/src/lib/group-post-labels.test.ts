import { describe, expect, it } from "vitest";

import {
	checkGroupFile,
	formatFileSize,
	likesLabel,
	postDateLabel,
	postHeadlineLabel,
	timeLeftLabel,
} from "./group-post-labels";

const MB = 1024 * 1024;
const aFile = (type: string) => new File([new Uint8Array(1)], "x", { type });
const sized = (file: File, size: number) =>
	Object.defineProperty(file, "size", { value: size });

describe("group post labels (spec 036)", () => {
	it("headlines (RN-17)", () => {
		expect(postHeadlineLabel("message")).toBe("compartilhou uma mensagem");
		expect(postHeadlineLabel("image")).toBe("compartilhou uma imagem");
		expect(postHeadlineLabel("file")).toBe("compartilhou um arquivo");
		expect(postHeadlineLabel("assignment")).toBe("atribuiu um kahoot");
	});

	it("formatFileSize: 2,4 MB, 850 KB", () => {
		expect(formatFileSize(2.4 * MB)).toBe("2,4 MB");
		expect(formatFileSize(20 * MB)).toBe("20 MB");
		expect(formatFileSize(850 * 1024)).toBe("850 KB");
		expect(formatFileSize(300)).toBe("300 bytes");
	});

	it("checkGroupFile tells a wrong type or size before any request (RN-09, RN-11)", () => {
		expect(
			checkGroupFile(sized(aFile("image/png"), 2 * MB), "image"),
		).toBeNull();
		expect(checkGroupFile(sized(aFile("text/plain"), 10), "image")).toBe(
			"Use uma imagem JPG, PNG, GIF ou WebP.",
		);
		expect(
			checkGroupFile(sized(aFile("image/png"), 10 * MB + 1), "image"),
		).toBe("A imagem passa de 10 MB.");
		expect(
			checkGroupFile(sized(aFile("application/pdf"), 20 * MB), "pdf"),
		).toBeNull();
		expect(checkGroupFile(sized(aFile("image/png"), 10), "pdf")).toBe(
			"Use um arquivo PDF.",
		);
		expect(
			checkGroupFile(sized(aFile("application/pdf"), 20 * MB + 1), "pdf"),
		).toBe("O arquivo passa de 20 MB.");
	});
});

describe("group post labels (spec 038)", () => {
	it("N curtida(s) (RN-18)", () => {
		expect(likesLabel(0)).toBe("0 curtidas");
		expect(likesLabel(1)).toBe("1 curtida");
		expect(likesLabel(12)).toBe("12 curtidas");
	});

	it("the post's date (RN-14)", () => {
		expect(postDateLabel(new Date(2026, 9, 26, 15, 1))).toBe(
			"26 de outubro às 15:01",
		);
	});

	it("time left without em (RN-23)", () => {
		expect(timeLeftLabel(3 * 24 * 60 * 60 * 1000)).toBe("3 dias");
		expect(timeLeftLabel(60 * 60 * 1000)).toBe("1 hora");
	});
});
