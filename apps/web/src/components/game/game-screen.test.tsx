import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DARK_TEXT, LIGHT_TEXT } from "@/lib/contrast";
import { GameThemeProvider } from "@/lib/game-theme";

import { GameScreen, Wordmark } from "./game-screen";

const surface = () => screen.getByTestId("screen");

describe("GameScreen theme (spec 042)", () => {
	it("without a provider the screen is standard", () => {
		render(<GameScreen data-testid="screen" />);

		expect(surface()).toHaveAttribute("data-theme", "standard");
		expect(surface().style.getPropertyValue("--game-bg-image")).toBe(
			'url("/themes/standard.svg")',
		);
	});

	it("the provider's theme sets data-theme and the CSS variables", () => {
		render(
			<GameThemeProvider themeId="teal">
				<GameScreen data-testid="screen" />
			</GameThemeProvider>,
		);

		expect(surface()).toHaveAttribute("data-theme", "teal");
		expect(surface().style.getPropertyValue("--game-bg-image")).toBe(
			'url("/themes/teal.svg")',
		);
		expect(surface().style.getPropertyValue("--game-fg")).toBe(LIGHT_TEXT);
	});

	it("a theme given to the screen wins over the provider's", () => {
		render(
			<GameThemeProvider themeId="teal">
				<GameScreen data-testid="screen" themeId="beige" />
			</GameThemeProvider>,
		);

		expect(surface()).toHaveAttribute("data-theme", "beige");
	});

	it("a light theme gives dark text over the background", () => {
		render(
			<GameThemeProvider themeId="light-yellow">
				<GameScreen data-testid="screen">
					<Wordmark />
				</GameScreen>
			</GameThemeProvider>,
		);

		expect(surface().style.getPropertyValue("--game-fg")).toBe(DARK_TEXT);
		expect(surface()).toHaveClass("text-game-fg");
		expect(screen.getByText("Quizio!")).toHaveClass("text-game-fg");
	});

	it("stays dark for cards and dialogs, whatever the theme", () => {
		render(
			<GameThemeProvider themeId="light">
				<GameScreen data-testid="screen" />
			</GameThemeProvider>,
		);

		expect(surface()).toHaveClass("dark");
	});
});
