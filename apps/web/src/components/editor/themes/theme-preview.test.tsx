import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ThemePreview } from "./theme-preview";

const look = {
	pattern: "rings" as const,
	backgroundColor: "#1b2a6b",
	imageUrl: null,
	imageTone: null,
	accentColor: "#ffd84d",
	logoUrl: null,
};

// Hidden slides have no accessible name, so they are found by their label.
const slide = (name: string) =>
	document.querySelector(`[aria-label="Prévia: ${name}"]`) as HTMLElement;

describe("ThemePreview (spec 043, RN-14)", () => {
	it("starts on the lobby, on the host's screen and the phone, in the look", () => {
		render(<ThemePreview look={look} />);

		const lobby = slide("Lobby");
		expect(lobby).toBeVisible();
		for (const surface of lobby.querySelectorAll('[data-slot="game-screen"]')) {
			expect(surface).toHaveAttribute("data-theme", "custom");
		}
		expect(within(lobby).getByText("Ana")).toBeVisible();
		expect(slide("Pódio")).not.toBeVisible();
	});

	it("the dots go to the question and the podium", async () => {
		render(<ThemePreview look={look} />);
		const user = userEvent.setup();

		await user.click(
			screen.getByRole("button", { name: "Mostrar a pergunta" }),
		);
		expect(slide("Pergunta")).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Mostrar a pergunta" }),
		).toHaveAttribute("aria-pressed", "true");

		await user.click(screen.getByRole("button", { name: "Mostrar o pódio" }));
		expect(slide("Pódio")).toBeVisible();
		expect(slide("Lobby")).not.toBeVisible();
	});

	it("the accent color follows the look", () => {
		const { rerender } = render(<ThemePreview look={look} />);
		rerender(<ThemePreview look={{ ...look, accentColor: "#26890c" }} />);

		const surface = slide("Lobby").querySelector(
			'[data-slot="game-screen"]',
		) as HTMLElement;
		expect(surface.style.getPropertyValue("--game-accent")).toBe("#26890c");
	});

	it("the logo takes the name's place on the host's screen, never on the phone (RN-26)", () => {
		render(
			<ThemePreview
				look={{ ...look, logoUrl: "https://media.test/themes/u1/logo.png" }}
			/>,
		);

		expect(
			within(slide("Lobby")).getAllByRole("img", { name: "Logotipo" }),
		).toHaveLength(1);
		expect(within(slide("Lobby")).getByText("Quizio!")).toBeVisible();
	});
});
