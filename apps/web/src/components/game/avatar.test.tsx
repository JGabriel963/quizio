import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar } from "./avatar";

const imagesOf = (container: HTMLElement) =>
	[...container.querySelectorAll("img")].map((image) =>
		image.getAttribute("src"),
	);

describe("Avatar (spec 028)", () => {
	it("draws the character and the accessory", () => {
		const { container } = render(
			<Avatar avatar={{ character: "koala", accessory: "top-hat" }} />,
		);

		expect(imagesOf(container)).toEqual([
			"/avatars/characters/koala.svg",
			"/avatars/accessories/top-hat.svg",
		]);
	});

	it("draws no accessory for none", () => {
		const { container } = render(
			<Avatar avatar={{ character: "fox", accessory: null }} />,
		);

		expect(imagesOf(container)).toEqual(["/avatars/characters/fox.svg"]);
	});

	it("is hidden from screen readers next to the nickname", () => {
		const { container } = render(
			<Avatar avatar={{ character: "koala", accessory: "crown" }} />,
		);

		const root = container.firstElementChild;
		expect(root).toHaveAttribute("aria-hidden", "true");
		for (const image of container.querySelectorAll("img")) {
			expect(image).toHaveAttribute("alt", "");
		}
	});

	it("replays the pop when the avatar changes, only without reduced motion", () => {
		const { container, rerender } = render(
			<Avatar
				avatar={{ character: "koala", accessory: null }}
				animateOnChange
			/>,
		);
		const before = container.querySelector("[data-slot=avatar-art]");

		rerender(
			<Avatar
				avatar={{ character: "tiger", accessory: null }}
				animateOnChange
			/>,
		);
		const after = container.querySelector("[data-slot=avatar-art]");

		expect(after).not.toBe(before);
		expect(after).toHaveClass("motion-safe:animate-pop-in");
		expect(after).not.toHaveClass("animate-pop-in");
	});

	it("does not animate when not asked to", () => {
		const { container } = render(
			<Avatar avatar={{ character: "koala", accessory: null }} />,
		);

		expect(container.querySelector("[data-slot=avatar-art]")).not.toHaveClass(
			"motion-safe:animate-pop-in",
		);
	});
});
