import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { Toggle } from "./toggle";

function Bold() {
	const [pressed, setPressed] = useState(false);
	return (
		<Toggle
			variant="toolbar"
			aria-label="Negrito"
			pressed={pressed}
			onPressedChange={setPressed}
		>
			B
		</Toggle>
	);
}

describe("Toggle", () => {
	it("toolbar variant exposes aria-pressed and the pressed look", async () => {
		const user = userEvent.setup();
		render(<Bold />);
		const bold = screen.getByRole("button", { name: "Negrito" });

		expect(bold).toHaveAttribute("aria-pressed", "false");
		expect(bold).toHaveAttribute("data-slot", "toggle");

		await user.click(bold);

		expect(bold).toHaveAttribute("aria-pressed", "true");
		expect(bold).toHaveAttribute("data-pressed");
		expect(bold.className).toContain("data-pressed:bg-neutral-700");
	});
});
