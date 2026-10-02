import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GameHeader } from "./game-header";

const ORIGIN = "https://quizio.app";

function renderHeader(props: Partial<Parameters<typeof GameHeader>[0]> = {}) {
	const user = userEvent.setup();
	render(<GameHeader playerCount={3} onExit={() => {}} {...props} />);
	return { user, header: screen.getByRole("banner") };
}

const open = { origin: ORIGIN, pin: "265914", locked: false };

describe("GameHeader (spec 012)", () => {
	it("has the settings button in the lobby and during the game", async () => {
		const onOpenSettings = vi.fn();
		const { user } = renderHeader({ onOpenSettings });

		await user.click(screen.getByRole("button", { name: "Configurações" }));

		expect(onOpenSettings).toHaveBeenCalledTimes(1);
	});

	it("has no settings button on the podium", () => {
		// The podium gives the header nothing but the count and the way out.
		const { header } = renderHeader();

		expect(
			within(header).queryByRole("button", { name: "Configurações" }),
		).toBeNull();
		expect(within(header).getByRole("button", { name: "Sair" })).toBeVisible();
		expect(
			within(header).getByRole("button", { name: /tela cheia/i }),
		).toBeVisible();
	});

	it("shows the address and the PIN during the game", () => {
		const { header } = renderHeader({ join: open });

		const join = within(header).getByRole("region", { name: "Como entrar" });
		expect(join).toHaveTextContent("Entre em quizio.app/join");
		expect(within(join).getByText("265 914")).toBeInTheDocument();
		expect(join).not.toHaveTextContent("Jogo bloqueado");
	});

	it("shows the lock and no PIN when locked", () => {
		const { header } = renderHeader({ join: { ...open, locked: true } });

		const join = within(header).getByRole("region", { name: "Como entrar" });
		expect(join).toHaveTextContent("Jogo bloqueado");
		expect(join).not.toHaveTextContent("265 914");
		expect(join).not.toHaveTextContent("quizio.app");
		expect(
			within(header).queryByRole("button", { name: "Expandir código QR" }),
		).toBeNull();
	});

	it("shows the PIN again when unlocked", () => {
		const view = render(
			<GameHeader
				playerCount={3}
				onExit={() => {}}
				join={{ ...open, locked: true }}
			/>,
		);
		expect(screen.queryByText("265 914")).toBeNull();

		view.rerender(<GameHeader playerCount={3} onExit={() => {}} join={open} />);

		expect(screen.getByText("265 914")).toBeInTheDocument();
	});

	it("expands the QR code", async () => {
		const { user } = renderHeader({ join: open });

		await user.click(
			screen.getByRole("button", { name: "Expandir código QR" }),
		);

		const dialog = screen.getByRole("dialog", {
			name: "Código QR para entrar",
		});
		expect(
			within(dialog).getByTitle("Código QR do link de entrada"),
		).toBeInTheDocument();
		const card = within(dialog).getByRole("region", { name: "Como entrar" });
		expect(card).toHaveTextContent("Entre em quizio.app/join");
		expect(within(card).getByText("265 914")).toBeInTheDocument();
	});

	it("shows no PIN in the lobby and on the podium", () => {
		const { header } = renderHeader({ onOpenSettings: () => {} });

		expect(
			within(header).queryByRole("region", { name: "Como entrar" }),
		).toBeNull();
		expect(header).not.toHaveTextContent("Entre em");
	});

	it("keeps the player count", () => {
		renderHeader({ join: open, onOpenSettings: () => {} });

		expect(
			document.querySelector('[data-slot="player-count"]'),
		).toHaveTextContent("3");
	});
});
