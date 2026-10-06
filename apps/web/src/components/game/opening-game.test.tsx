import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OpeningGame } from "./opening-game";

describe("OpeningGame (spec 008, RN-13)", () => {
	it("shows nothing until a game is being opened", () => {
		const { container } = render(
			<OpeningGame
				state={{ kind: "idle" }}
				onRetry={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("says the lobby is coming, with the address to join", () => {
		render(
			<OpeningGame
				state={{ kind: "opening" }}
				onRetry={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("Prepare-se para participar");
		expect(status).toHaveTextContent("Carregando PIN do jogo");
		expect(status).toHaveTextContent(`Entre em ${window.location.host}/join`);
	});

	it("offers to try again or go back when the game could not be opened", async () => {
		const onRetry = vi.fn();
		const onCancel = vi.fn();
		const user = userEvent.setup();
		render(
			<OpeningGame
				state={{ kind: "failed" }}
				onRetry={onRetry}
				onCancel={onCancel}
			/>,
		);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Não foi possível abrir a partida.",
		);
		await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
		await user.click(screen.getByRole("button", { name: "Voltar ao quiz" }));

		expect(onRetry).toHaveBeenCalledOnce();
		expect(onCancel).toHaveBeenCalledOnce();
	});
});
