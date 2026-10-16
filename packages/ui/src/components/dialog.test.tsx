import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogTitle } from "./dialog";

function renderDialog(size?: "default" | "screen") {
	render(
		<Dialog open>
			<DialogContent size={size}>
				<DialogTitle>Crie com o Assistente</DialogTitle>
			</DialogContent>
		</Dialog>,
	);
	return screen.getByRole("dialog", { name: "Crie com o Assistente" });
}

describe("Dialog", () => {
	it("is a small centered panel by default", () => {
		const dialog = renderDialog();

		expect(dialog).toHaveAttribute("data-size", "default");
		expect(dialog).toHaveClass("sm:max-w-lg");
	});

	it("the screen size fills the screen on phones and most of it on desktops", () => {
		const dialog = renderDialog("screen");

		expect(dialog).toHaveAttribute("data-size", "screen");
		expect(dialog).toHaveClass(
			"max-sm:h-svh",
			"max-sm:max-w-none",
			"sm:max-w-6xl",
		);
		expect(dialog).not.toHaveClass("sm:max-w-lg");
	});
});
