import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserAvatar } from "./user-avatar";

describe("UserAvatar (spec 039, RN-05, RN-06)", () => {
	it("shows the photo when there is one, the icon otherwise", () => {
		const { container, rerender } = render(
			<UserAvatar
				userId="ana"
				photoUrl="https://media.test/profiles/ana/a.webp"
			/>,
		);

		const avatar = container.querySelector('[data-slot="user-avatar"]');
		expect(avatar?.querySelector("img")).toHaveAttribute(
			"src",
			"https://media.test/profiles/ana/a.webp",
		);
		expect(avatar).toHaveClass("rounded-full");

		rerender(<UserAvatar userId="ana" photoUrl={null} />);

		expect(container.querySelector("img")).toBeNull();
		expect(container.querySelector("svg")).not.toBeNull();
	});

	it("square shape for the profile card", () => {
		const { container } = render(
			<UserAvatar
				userId="ana"
				photoUrl="https://media.test/profiles/ana/a.webp"
				shape="square"
				size="xl"
			/>,
		);

		const avatar = container.querySelector('[data-slot="user-avatar"]');
		expect(avatar).toHaveAttribute("data-shape", "square");
		expect(avatar).not.toHaveClass("rounded-full");
	});
});
