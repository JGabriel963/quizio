import { DARK_TEXT, LIGHT_TEXT } from "@quizio/core/shared/domain/contrast";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

describe("GameScreen with a custom theme (spec 043)", () => {
	const look = {
		pattern: "rings" as const,
		backgroundColor: "#1b2a6b",
		imageUrl: null,
		imageTone: null,
		accentColor: "#ffd84d",
		logoUrl: null,
	};

	it("draws the custom look", () => {
		render(
			<GameThemeProvider themeId="standard" custom={look}>
				<GameScreen data-testid="screen" />
			</GameThemeProvider>,
		);

		expect(surface()).toHaveAttribute("data-theme", "custom");
		expect(surface().style.getPropertyValue("--game-bg-image")).toBe(
			'url("/themes/patterns/rings.svg")',
		);
		expect(surface().style.getPropertyValue("--game-accent")).toBe("#ffd84d");
	});

	it("the Quizio name gives way to the whole logo when the theme has one (RN-9, RN-26)", () => {
		render(
			<GameThemeProvider
				themeId="standard"
				custom={{ ...look, logoUrl: "https://media.test/themes/u1/logo.png" }}
			>
				<Wordmark className="text-5xl" />
			</GameThemeProvider>,
		);

		const logo = screen.getByRole("img", { name: "Logotipo" });
		expect(logo).toHaveAttribute(
			"src",
			"https://media.test/themes/u1/logo.png",
		);
		expect(logo).toHaveClass("object-contain");
		expect(screen.queryByText("Quizio!")).toBeNull();
	});

	it("without a logo the name stays", () => {
		render(
			<GameThemeProvider themeId="standard" custom={look}>
				<Wordmark />
			</GameThemeProvider>,
		);

		expect(screen.getByText("Quizio!")).toBeVisible();
	});
});
