import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { HostGameData } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { GameUnavailable } from "./game-unavailable";
import { HostLobby, type HostLobbyActions } from "./host-lobby";

const ORIGIN = "https://quizio.app";

const empty: HostGameData = {
	gameId: "game-1",
	quizId: "quiz-1",
	title: "Capitais",
	pin: "265914",
	status: "lobby",
	endReason: null,
	locked: false,
	players: [],
	questionCount: 0,
	stage: null,
};
const act = { id: "p1", nickname: "ACT" };
const bia = { id: "p2", nickname: "Bia" };

function renderLobby(lobby: HostGameData = empty) {
	const actions: HostLobbyActions = {
		setLocked: vi.fn(),
		start: vi.fn(),
		removePlayer: vi.fn(),
		end: vi.fn(),
	};
	const user = userEvent.setup();
	const view = render(
		<HostLobby lobby={lobby} origin={ORIGIN} actions={actions} />,
	);
	const rerender = (next: HostGameData) =>
		view.rerender(<HostLobby lobby={next} origin={ORIGIN} actions={actions} />);
	return { actions, user, rerender };
}

const playerCount = () =>
	document.querySelector('[data-slot="player-count"]')?.textContent;

describe("HostLobby (spec 008)", () => {
	it("shows the address, the PIN in two groups, and waits for players", () => {
		renderLobby();

		const instructions = screen.getByRole("region", { name: "Como entrar" });
		expect(instructions).toHaveTextContent("Entre em quizio.app/join");
		expect(instructions).toHaveTextContent("PIN do jogo:");
		expect(within(instructions).getByText("265 914")).toBeInTheDocument();
		expect(screen.getByText("Aguardando os participantes")).toBeInTheDocument();
		expect(playerCount()).toBe("0");
	});

	it("expands the QR code, and Esc collapses it", async () => {
		const { user } = renderLobby();

		await user.click(
			screen.getByRole("button", { name: "Expandir código QR" }),
		);

		const dialog = screen.getByRole("dialog", {
			name: "Código QR para entrar",
		});
		expect(
			within(dialog).getByTitle("Código QR do link de entrada"),
		).toBeInTheDocument();

		// The address and the PIN stay in sight, over the QR code.
		const card = within(dialog).getByRole("region", { name: "Como entrar" });
		expect(card).toHaveTextContent("Entre em quizio.app/join");
		expect(within(card).getByText("265 914")).toBeInTheDocument();

		await user.keyboard("{Escape}");

		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("the X closes the expanded QR code", async () => {
		const { user } = renderLobby();
		await user.click(
			screen.getByRole("button", { name: "Expandir código QR" }),
		);

		await user.click(
			within(screen.getByRole("dialog")).getByRole("button", {
				name: "Fechar",
			}),
		);

		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("copies the join link and confirms", async () => {
		const { user } = renderLobby();

		await user.click(
			screen.getByRole("button", { name: "Copiar link para compartilhar" }),
		);

		expect(await screen.findByText("Link copiado")).toBeInTheDocument();
		expect(await navigator.clipboard.readText()).toBe(
			"https://quizio.app/join/265914",
		);
	});

	it("lists the players in order of arrival and counts them", () => {
		renderLobby({ ...empty, players: [act, bia] });

		const cards = within(
			screen.getByRole("list", { name: "Participantes" }),
		).getAllByRole("button");
		expect(cards.map((card) => card.textContent)).toEqual([
			"ACT, remover participante",
			"Bia, remover participante",
		]);
		expect(playerCount()).toBe("2");
		expect(screen.queryByText("Aguardando os participantes")).toBeNull();
	});

	it("announces who came in", () => {
		const { rerender } = renderLobby({ ...empty, players: [act] });

		rerender({ ...empty, players: [act, bia] });

		expect(screen.getByText("Bia entrou")).toHaveAttribute("role", "status");
	});

	it("Iniciar waits for the first player", async () => {
		const { actions, user, rerender } = renderLobby();
		const start = () => screen.getByRole("button", { name: "Iniciar" });

		expect(start()).toBeDisabled();

		rerender({ ...empty, players: [act] });
		await user.click(start());

		expect(actions.start).toHaveBeenCalledTimes(1);
	});

	it("Iniciar cannot be pressed twice while the game is starting", () => {
		const actions: HostLobbyActions = {
			setLocked: vi.fn(),
			start: vi.fn(),
			removePlayer: vi.fn(),
			end: vi.fn(),
		};
		render(
			<HostLobby
				lobby={{ ...empty, players: [act] }}
				origin={ORIGIN}
				actions={actions}
				starting
			/>,
		);

		expect(screen.getByRole("button", { name: "Iniciar" })).toBeDisabled();
	});

	it("locks the game", async () => {
		const { actions, user } = renderLobby();

		await user.click(
			screen.getByRole("button", {
				name: "Bloqueie o jogo para impedir que outros participantes entrem",
			}),
		);

		expect(actions.setLocked).toHaveBeenCalledExactlyOnceWith(true);
	});

	it("a locked game hides the PIN and the QR code, and offers to unlock", async () => {
		const { actions, user } = renderLobby({
			...empty,
			locked: true,
			players: [act],
		});

		expect(
			screen.getByRole("region", { name: "Como entrar" }),
		).toHaveTextContent("Jogo bloqueado: ninguém mais pode entrar");
		expect(screen.queryByText("265 914")).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Expandir código QR" }),
		).toBeNull();
		expect(screen.getByRole("button", { name: /ACT/ })).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", {
				name: "Desbloqueie o jogo para que outros participantes entrem",
			}),
		);

		expect(actions.setLocked).toHaveBeenCalledExactlyOnceWith(false);
	});

	it("removes a player after confirming", async () => {
		const { actions, user } = renderLobby({ ...empty, players: [act, bia] });

		await user.click(screen.getByRole("button", { name: /ACT/ }));

		const dialog = screen.getByRole("alertdialog", { name: "Remover ACT?" });
		expect(dialog).toHaveTextContent(
			"Este participante será removido, mas poderá voltar usando outro apelido.",
		);

		await user.click(within(dialog).getByRole("button", { name: "Remover" }));

		expect(actions.removePlayer).toHaveBeenCalledExactlyOnceWith("p1");
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	it("cancelling keeps the player", async () => {
		const { actions, user } = renderLobby({ ...empty, players: [act] });

		await user.click(screen.getByRole("button", { name: /ACT/ }));
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(actions.removePlayer).not.toHaveBeenCalled();
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	it("removes by keyboard", async () => {
		const { user } = renderLobby({ ...empty, players: [act] });

		screen.getByRole("button", { name: /ACT/ }).focus();
		await user.keyboard("{Enter}");

		expect(
			screen.getByRole("alertdialog", { name: "Remover ACT?" }),
		).toBeInTheDocument();
	});

	it("ends the game after confirming", async () => {
		const { actions, user } = renderLobby({ ...empty, players: [act] });

		await user.click(screen.getByRole("button", { name: "Sair" }));

		const dialog = screen.getByRole("alertdialog", {
			name: "Encerrar o jogo?",
		});
		expect(dialog).toHaveTextContent(
			"Os participantes serão desconectados e o PIN deixará de funcionar.",
		);

		await user.click(within(dialog).getByRole("button", { name: "Encerrar" }));

		expect(actions.end).toHaveBeenCalledOnce();
	});

	it("giving up on ending keeps the lobby", async () => {
		const { actions, user } = renderLobby();

		await user.click(screen.getByRole("button", { name: "Sair" }));
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(actions.end).not.toHaveBeenCalled();
		expect(screen.getByText("265 914")).toBeInTheDocument();
	});
});

describe("GameUnavailable (spec 008)", () => {
	it("an ended game leads back to the quiz", async () => {
		renderWithRouter(
			<GameUnavailable state={{ kind: "ended", quizId: "quiz-1" }} />,
		);

		expect(
			await screen.findByRole("heading", {
				name: "Esta partida foi encerrada.",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Voltar ao quiz" }),
		).toHaveAttribute("href", "/quizzes/quiz-1");
	});

	it("shows the cartaz while the lobby loads", async () => {
		renderWithRouter(
			<GameUnavailable state={{ kind: "loading", origin: ORIGIN }} />,
		);

		expect(await screen.findByRole("status")).toHaveTextContent(
			"Prepare-se para participar",
		);
	});
});
