import { describe, expect, it } from "vitest";

import { shareButtonLabel, toggleSharedSelection } from "./share-quizzes-state";

describe("sharing quizzes (spec 037, RN-04, RN-05)", () => {
	it("toggles selection, keeps the order chosen, never selects an already shared quiz", () => {
		const shared = new Set(["rios"]);

		let selected = toggleSharedSelection([], "capitais", shared);
		selected = toggleSharedSelection(selected, "mapas", shared);
		expect(selected).toEqual(["capitais", "mapas"]);

		expect(toggleSharedSelection(selected, "capitais", shared)).toEqual([
			"mapas",
		]);
		expect(toggleSharedSelection(selected, "rios", shared)).toBe(selected);
	});

	it("the button says Compartilhar 1 kahoot / Compartilhar N kahoots", () => {
		expect(shareButtonLabel(0)).toBe("Compartilhar");
		expect(shareButtonLabel(1)).toBe("Compartilhar 1 kahoot");
		expect(shareButtonLabel(2)).toBe("Compartilhar 2 kahoots");
	});
});
