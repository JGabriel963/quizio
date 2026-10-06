import { render, screen, act as settle, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

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
	options: {
		showQuestionsOnDevices: false,
		randomizeQuestions: false,
		randomizeAnswers: false,
		autoplay: false,
	},
	players: [],
	questionCount: 0,
	autoStart: null,
	stage: null,
	final: null,
};
const act = { id: "p1", nickname: "ACT" };
const bia = { id: "p2", nickname: "Bia" };

function renderLobby(lobby: HostGameData = empty) {
	const actions: HostLobbyActions = {
		setLocked: vi.fn(),
		setOptions: vi.fn(),
		start: vi.fn(async () => {}),
		removePlayer: vi.fn(),
		end: vi.fn(),
	};
	const user = userEvent.setup();
	const receivedAt = Date.now();
	const view = render(
		<HostLobby
			lobby={lobby}
			origin={ORIGIN}
			receivedAt={receivedAt}
			actions={actions}
		/>,
	);
	const rerender = (next: HostGameData) =>
		view.rerender(
			<HostLobby
				lobby={next}
				origin={ORIGIN}
				receivedAt={receivedAt}
				actions={actions}
			/>,
		);
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
			setOptions: vi.fn(),
			start: vi.fn(async () => {}),
			removePlayer: vi.fn(),
			end: vi.fn(),
		};
		render(
			<HostLobby
				lobby={{ ...empty, players: [act] }}
				origin={ORIGIN}
				receivedAt={Date.now()}
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

	it("Encerrar agora asks and ends the game from the lobby (spec 013)", async () => {
		const { actions, user } = renderLobby({ ...empty, players: [act] });
		await user.click(screen.getByRole("button", { name: "Configurações" }));

		await user.click(screen.getByRole("button", { name: "Encerrar agora" }));
		expect(actions.end).not.toHaveBeenCalled();
		await user.click(
			within(
				screen.getByRole("alertdialog", { name: "Encerrar o jogo?" }),
			).getByRole("button", { name: "Encerrar" }),
		);

		expect(actions.end).toHaveBeenCalledOnce();
	});

	describe("settings (spec 012)", () => {
		const openSettings = async (user: ReturnType<typeof userEvent.setup>) => {
			await user.click(screen.getByRole("button", { name: "Configurações" }));
			return screen.getByRole("dialog", { name: "Configurações" });
		};

		it("opens the settings from the header, with every switch free", async () => {
			const { user } = renderLobby();

			const panel = await openSettings(user);

			const switches = within(panel).getAllByRole("switch");
			expect(switches).toHaveLength(5);
			for (const control of switches) {
				expect(control).not.toHaveAttribute("aria-disabled", "true");
			}
		});

		it("changes an option from the lobby", async () => {
			const { actions, user } = renderLobby();
			const panel = await openSettings(user);

			await user.click(
				within(panel).getByRole("switch", {
					name: "Mostrar perguntas em ordem aleatória",
				}),
			);

			expect(actions.setOptions).toHaveBeenCalledExactlyOnceWith({
				randomizeQuestions: true,
			});
		});

		it("the panel's lock closes the lobby's padlock", async () => {
			const { actions, user, rerender } = renderLobby();
			const panel = await openSettings(user);
			const lock = () =>
				within(panel).getByRole("switch", { name: "Bloquear jogo" });

			await user.click(lock());
			expect(actions.setLocked).toHaveBeenCalledExactlyOnceWith(true);

			// The route shows the change at once: both controls tell the same lock.
			rerender({ ...empty, locked: true });

			expect(lock()).toHaveAttribute("aria-checked", "true");
			expect(
				screen.getByRole("region", { name: "Como entrar", hidden: true }),
			).toHaveTextContent("Jogo bloqueado: ninguém mais pode entrar");
			expect(
				screen.getByRole("button", {
					name: "Desbloqueie o jogo para que outros participantes entrem",
					hidden: true,
				}),
			).toHaveAttribute("aria-pressed", "true");
		});

		it("keeps the address and the PIN out of the header", () => {
			renderLobby();

			expect(screen.getByRole("banner")).not.toHaveTextContent("Entre em");
			expect(
				screen.getAllByRole("region", { name: "Como entrar" }),
			).toHaveLength(1);
		});
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

describe("HostLobby: autoplay (spec 014)", () => {
	const refusal = (domainCode: string) =>
		Object.assign(new Error(domainCode), { data: { domainCode } });
	const counting = (remainingMs: number, token = "t1"): HostGameData => ({
		...empty,
		players: [act],
		options: { ...empty.options, autoplay: true },
		autoStart: { remainingMs, token },
	});
	const actionsWith = (start: HostLobbyActions["start"]): HostLobbyActions => ({
		setLocked: vi.fn(),
		setOptions: vi.fn(),
		start,
		removePlayer: vi.fn(),
		end: vi.fn(),
	});
	const at = (
		lobby: HostGameData,
		on: HostLobbyActions,
		options: { connected?: boolean; receivedAt?: number } = {},
	) => (
		<HostLobby
			lobby={lobby}
			origin={ORIGIN}
			receivedAt={options.receivedAt ?? Date.now()}
			connected={options.connected ?? true}
			actions={on}
		/>
	);
	const tick = (ms: number) => settle(() => vi.advanceTimersByTimeAsync(ms));
	const countdown = () => screen.queryByRole("timer", { name: "Inicia em" });

	afterEach(() => {
		vi.useRealTimers();
	});

	it("shows the countdown beside Iniciar", () => {
		render(at(counting(8_000), actionsWith(vi.fn(async () => {}))));

		expect(countdown()).toHaveTextContent("8");
		expect(screen.getByRole("button", { name: "Iniciar" })).toBeEnabled();
	});

	it("shows no countdown without one", () => {
		render(
			at({ ...empty, players: [act] }, actionsWith(vi.fn(async () => {}))),
		);

		expect(countdown()).toBeNull();
	});

	it("asks for the automatic start at zero", async () => {
		vi.useFakeTimers();
		const start = vi.fn(async () => {});
		render(at(counting(3_000), actionsWith(start)));

		await tick(2_900);
		expect(start).not.toHaveBeenCalled();

		await tick(200);
		expect(start).toHaveBeenCalledExactlyOnceWith(true);
	});

	it("asks again when the server says it is not time yet", async () => {
		vi.useFakeTimers();
		// The device's clock ran a little ahead of the server's.
		const start = vi
			.fn<HostLobbyActions["start"]>()
			.mockRejectedValueOnce(refusal("GAME.STAGE_NOT_DUE"))
			.mockResolvedValue(undefined);
		render(at(counting(1_000), actionsWith(start)));

		await tick(1_100);
		expect(start).toHaveBeenCalledTimes(1);

		await tick(500);
		expect(start).toHaveBeenCalledTimes(2);
		expect(start).toHaveBeenLastCalledWith(true);
	});

	it("a new countdown starts over, even ending later", async () => {
		vi.useFakeTimers();
		const start = vi.fn(async () => {});
		const on = actionsWith(start);
		const view = render(at(counting(2_000, "t1"), on));
		await tick(1_000);

		// Bia got in: the server counts 15 s again, from another instant.
		view.rerender(at(counting(15_000, "t2"), on));
		await tick(1_500);

		expect(start).not.toHaveBeenCalled();
		expect(countdown()).toHaveTextContent("14");
	});

	it("the same countdown asked about again does not go back", async () => {
		vi.useFakeTimers();
		const on = actionsWith(vi.fn(async () => {}));
		const view = render(at(counting(10_000, "t1"), on));
		await tick(4_000);

		// The answer took a while: it says 6.8 s from now, more than the screen shows.
		view.rerender(at(counting(6_800, "t1"), on));
		await tick(200);

		expect(countdown()).toHaveTextContent("6");
	});

	it("the countdown going away cancels the start", async () => {
		vi.useFakeTimers();
		const start = vi.fn(async () => {});
		const on = actionsWith(start);
		const view = render(at(counting(2_000), on));
		await tick(1_000);

		// The switch was turned off.
		view.rerender(at({ ...empty, players: [act] }, on));
		await tick(5_000);

		expect(start).not.toHaveBeenCalled();
		expect(countdown()).toBeNull();
	});

	it("Iniciar starts before the countdown ends", async () => {
		const start = vi.fn<HostLobbyActions["start"]>(async () => {});
		const user = userEvent.setup();
		render(at(counting(9_000), actionsWith(start)));

		await user.click(screen.getByRole("button", { name: "Iniciar" }));

		// A click, not the countdown: the server does not check the time.
		expect(start).toHaveBeenCalledTimes(1);
		expect(start.mock.calls[0]?.[0] ?? false).toBe(false);
	});

	it("does not ask while disconnected, and starts when the connection returns and the countdown is over", async () => {
		vi.useFakeTimers();
		const start = vi.fn(async () => {});
		const on = actionsWith(start);
		const lobby = counting(2_000);
		const receivedAt = Date.now();
		const view = render(at(lobby, on, { connected: false, receivedAt }));

		await tick(30_000);
		expect(start).not.toHaveBeenCalled();

		view.rerender(at(lobby, on, { connected: true, receivedAt }));
		await tick(50);

		expect(start).toHaveBeenCalledExactlyOnceWith(true);
	});
});
