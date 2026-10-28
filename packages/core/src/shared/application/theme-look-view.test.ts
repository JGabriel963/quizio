import { describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../testing/in-memory-object-storage";
import { themeLookView } from "./theme-look-view";

const storage = new InMemoryObjectStorage("https://media.test");

describe("themeLookView (spec 043, ADR 0022)", () => {
	it("a pattern look has its pattern and color and no image", () => {
		expect(
			themeLookView(
				{
					background: { kind: "pattern", pattern: "rings", color: "#1b2a6b" },
					accentColor: "#ffd84d",
					logoKey: null,
				},
				storage,
				{ withLogo: true },
			),
		).toEqual({
			pattern: "rings",
			backgroundColor: "#1b2a6b",
			imageUrl: null,
			imageTone: null,
			accentColor: "#ffd84d",
			logoUrl: null,
		});
	});

	it("an image look has the image URL and its tone", () => {
		const view = themeLookView(
			{
				background: { kind: "image", key: "themes/u1/bg.jpg", tone: "light" },
				accentColor: "#1368ce",
				logoKey: "themes/u1/logo.png",
			},
			storage,
			{ withLogo: true },
		);

		expect(view).toMatchObject({
			pattern: null,
			backgroundColor: null,
			imageUrl: "https://media.test/themes/u1/bg.jpg",
			imageTone: "light",
			logoUrl: "https://media.test/themes/u1/logo.png",
		});
	});

	it("leaves the logo out when told to (RN-26)", () => {
		const view = themeLookView(
			{
				background: { kind: "pattern", pattern: "waves", color: "#1b2a6b" },
				accentColor: "#ffd84d",
				logoKey: "themes/u1/logo.png",
			},
			storage,
			{ withLogo: false },
		);

		expect(view?.logoUrl).toBeNull();
	});

	it("no look is no view", () => {
		expect(themeLookView(null, storage, { withLogo: true })).toBeNull();
	});
});
