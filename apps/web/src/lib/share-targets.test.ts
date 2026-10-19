import { describe, expect, it } from "vitest";

import { assignmentLink, assignmentShareMessage } from "./assignment-link";
import { shareTargets } from "./share-targets";

describe("assignment link (spec 029, RN-19, RN-23)", () => {
	it("builds the activity link", () => {
		expect(assignmentLink("https://quizio.app", "game-1")).toBe(
			"https://quizio.app/assignment/game-1",
		);
	});

	it("builds the share message with the deadline", () => {
		expect(
			assignmentShareMessage({
				name: "Capitais",
				deadline: new Date(2026, 9, 22, 12, 0),
				link: "https://quizio.app/assignment/game-1",
			}),
		).toBe(
			"Jogue Capitais até 22 de out. de 2026, 12:00: https://quizio.app/assignment/game-1",
		);
	});
});

describe("share targets (spec 029, RN-23)", () => {
	const message =
		"Jogue Capitais até 22 de out.: https://quizio.app/assignment/game-1";
	const link = "https://quizio.app/assignment/game-1";

	it("builds the WhatsApp, Telegram, Facebook, X and e-mail links with the message", () => {
		const targets = shareTargets({ message, link, subject: "Capitais" });

		expect(targets.map(({ name }) => name)).toEqual([
			"WhatsApp",
			"Telegram",
			"Facebook",
			"X",
			"E-mail",
		]);
		const byName = Object.fromEntries(targets.map((t) => [t.name, t.href]));
		expect(byName.WhatsApp).toBe(
			`https://wa.me/?text=${encodeURIComponent(message)}`,
		);
		expect(byName.Telegram).toBe(
			`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`,
		);
		expect(byName.Facebook).toBe(
			`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
		);
		expect(byName.X).toBe(
			`https://x.com/intent/post?text=${encodeURIComponent(message)}`,
		);
		expect(byName["E-mail"]).toBe(
			`mailto:?subject=${encodeURIComponent("Capitais")}&body=${encodeURIComponent(message)}`,
		);
	});
});
