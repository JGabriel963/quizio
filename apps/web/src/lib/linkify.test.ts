import { describe, expect, it } from "vitest";

import { linkify } from "./linkify";

describe("linkify (spec 036, RN-16)", () => {
	it("http, https and www become links", () => {
		expect(
			linkify("Veja https://exemplo.com/aula?x=1 e http://a.b e www.c.org/d"),
		).toEqual([
			{ type: "text", text: "Veja " },
			{
				type: "link",
				text: "https://exemplo.com/aula?x=1",
				href: "https://exemplo.com/aula?x=1",
			},
			{ type: "text", text: " e " },
			{ type: "link", text: "http://a.b", href: "http://a.b" },
			{ type: "text", text: " e " },
			{ type: "link", text: "www.c.org/d", href: "https://www.c.org/d" },
		]);
	});

	it("trailing punctuation stays out", () => {
		expect(
			linkify("Veja https://exemplo.com/aula, e também www.exemplo.org."),
		).toEqual([
			{ type: "text", text: "Veja " },
			{
				type: "link",
				text: "https://exemplo.com/aula",
				href: "https://exemplo.com/aula",
			},
			{ type: "text", text: ", e também " },
			{
				type: "link",
				text: "www.exemplo.org",
				href: "https://www.exemplo.org",
			},
			{ type: "text", text: "." },
		]);
		expect(linkify("Fim: https://a.b/c!?")[1]).toMatchObject({
			text: "https://a.b/c",
		});
	});

	it("a closing parenthesis stays when the link opened one", () => {
		expect(
			linkify("(veja https://pt.wikipedia.org/wiki/Rio_(cidade))"),
		).toEqual([
			{ type: "text", text: "(veja " },
			{
				type: "link",
				text: "https://pt.wikipedia.org/wiki/Rio_(cidade)",
				href: "https://pt.wikipedia.org/wiki/Rio_(cidade)",
			},
			{ type: "text", text: ")" },
		]);
	});

	it("javascript: and other schemes stay text", () => {
		expect(linkify("javascript:alert(1) ftp://a.b mailto:a@b.c")).toEqual([
			{ type: "text", text: "javascript:alert(1) ftp://a.b mailto:a@b.c" },
		]);
		expect(linkify("")).toEqual([]);
		expect(linkify("https://")).toEqual([{ type: "text", text: "https://" }]);
	});

	it("keeps line breaks in the text parts", () => {
		expect(linkify("a\nhttps://x.y\nb")).toEqual([
			{ type: "text", text: "a\n" },
			{ type: "link", text: "https://x.y", href: "https://x.y" },
			{ type: "text", text: "\nb" },
		]);
	});
});
