import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { RadioGroup, RadioGroupItem } from "./radio-group";

describe("RadioGroupItem tile variant (spec 042)", () => {
	function renderTiles(value = "a") {
		render(
			<RadioGroup aria-label="Temas" defaultValue={value}>
				<RadioGroupItem variant="tile" value="a" aria-label="Azul">
					<span>Azul</span>
				</RadioGroupItem>
				<RadioGroupItem variant="tile" value="b" aria-label="Bege">
					<span>Bege</span>
				</RadioGroupItem>
			</RadioGroup>,
		);
	}

	it("shows its content and marks the checked tile with the blue border", () => {
		renderTiles();

		const azul = screen.getByRole("radio", { name: "Azul" });
		expect(azul).toHaveTextContent("Azul");
		expect(azul).toHaveAttribute("aria-checked", "true");
		expect(azul).toHaveAttribute("data-variant", "tile");
		expect(azul.className).toContain("data-checked:border-primary");
	});

	it("is chosen with a click and announced as checked", async () => {
		renderTiles();

		await userEvent.click(screen.getByRole("radio", { name: "Bege" }));

		expect(screen.getByRole("radio", { name: "Bege" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
		expect(screen.getByRole("radio", { name: "Azul" })).toHaveAttribute(
			"aria-checked",
			"false",
		);
	});
});
