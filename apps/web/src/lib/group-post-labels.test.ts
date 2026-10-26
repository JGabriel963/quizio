import { describe, expect, it } from "vitest";

import { likesLabel, postDateLabel, timeLeftLabel } from "./group-post-labels";

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
