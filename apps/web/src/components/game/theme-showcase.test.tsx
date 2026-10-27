import { THEME_IDS } from "@quizio/core/shared/domain/theme";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThemeShowcase } from "./theme-showcase";

describe("ThemeShowcase (spec 042, /design-system)", () => {
	it("shows every theme on a game screen with its tone and contrast", () => {
		render(<ThemeShowcase />);

		const items = screen.getAllByRole("figure");
		expect(items).toHaveLength(THEME_IDS.length);
		const lightBlue = screen.getByRole("figure", { name: /Azul claro/ });
		expect(
			lightBlue.querySelector('[data-slot="game-screen"]'),
		).toHaveAttribute("data-theme", "light-blue");
		expect(
			within(lightBlue).getByText(/claro · \d+(,\d)?:1/),
		).toBeInTheDocument();
		expect(
			within(screen.getByRole("figure", { name: /Grafite/ })).getByText(
				/escuro · \d+(,\d)?:1/,
			),
		).toBeInTheDocument();
	});
});
