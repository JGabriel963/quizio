import { GAME_EVENTS, gameChannel } from "@quizio/core/game/domain/game-events";
import type { PublicStage } from "@quizio/core/game/domain/public-stage";
import { InMemoryRealtimeSubscriber } from "@quizio/realtime/testing/in-memory-realtime-subscriber";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PlayerResultData, PlayerSessionData } from "@/lib/api-types";
import {
	createPlayerSessionStore,
	type StoredPlayerSession,
} from "@/lib/player-session";
import { RealtimeProvider } from "@/lib/realtime";

import {
	type JoinApi,
	JoinFlow,
	PLAY_CHECK_INTERVAL_MS,
	SESSION_CHECK_INTERVAL_MS,
} from "./join-flow";

const PIN = "265914";
const GAME = "game-1";

/** The API's refusals carry the domain code, as tRPC errors do. */
const refusal = (domainCode: string) =>
	Object.assign(new Error(domainCode), { data: { domainCode } });

/** A small game server: one open game, its players and what happened to them. */
class FakeJoinApi implements JoinApi {
	locked = false;
	ended = false;
	blocked = false;
	finished = false;
	/** The stage of a game in progress; null while in the lobby. */
	stage: PublicStage | null = null;
	/** What the server answers to an answer, when it refuses. */
	answerRefusal: string | null = null;
	readonly answers: {
		playerId: string;
		questionIndex: number;
		choiceIds: string[];
	}[] = [];
	/** How each player did in the question being revealed. */
	readonly results = new Map<string, PlayerResultData>();
	readonly players = new Map<string, { nickname: string; removed: boolean }>();
	readonly finds: string[] = [];

	async find(pin: string) {
		this.finds.push(pin);
		if (this.blocked) {
			throw refusal("GAME.TOO_MANY_PIN_ATTEMPTS");
		}
		if (pin !== PIN || this.ended || this.finished) {
			throw refusal("GAME.PIN_NOT_RECOGNIZED");
		}
		if (this.stage) {
			throw refusal("GAME.ALREADY_STARTED");
		}
		if (this.locked) {
			throw refusal("GAME.LOCKED");
		}
		return { gameId: GAME, pin };
	}

	async enter({ nickname }: { gameId: string; nickname: string }) {
		if (this.ended) {
			throw refusal("GAME.PIN_NOT_RECOGNIZED");
		}
		if (this.locked) {
			throw refusal("GAME.LOCKED");
		}
		const trimmed = nickname.trim();
		const taken = [...this.players.values()].some(
			(player) => player.nickname.toLowerCase() === trimmed.toLowerCase(),
		);
		if (taken) {
			throw refusal("GAME.NICKNAME_TAKEN");
		}
		const playerId = `p${this.players.size + 1}`;
		this.players.set(playerId, { nickname: trimmed, removed: false });
		return { playerId, secret: `secret-${playerId}`, nickname: trimmed };
	}

	async session(input: StoredPlayerSession): Promise<PlayerSessionData> {
		const player = this.players.get(input.playerId);
		if (!player || input.secret !== `secret-${input.playerId}`) {
			throw refusal("GAME.NOT_FOUND");
		}
		const { stage } = this;
		const over = player.removed
			? "removed"
			: this.ended
				? "ended"
				: this.finished
					? "finished"
					: null;
		const answered = this.answers.some(
			(answer) =>
				answer.playerId === input.playerId &&
				answer.questionIndex === stage?.questionIndex,
		);
		return {
			gameId: GAME,
			nickname: player.nickname,
			status: over ?? (stage ? "playing" : "waiting"),
			stage:
				over || !stage
					? null
					: {
							...stage,
							remainingMs: stage.durationMs,
							answered,
							result:
								stage.phase === "results"
									? (this.results.get(input.playerId) ?? "timeout")
									: null,
						},
		};
	}

	async answer(
		input: StoredPlayerSession & { questionIndex: number; choiceIds: string[] },
	) {
		if (this.answerRefusal) {
			throw refusal(this.answerRefusal);
		}
		this.answers.push({
			playerId: input.playerId,
			questionIndex: input.questionIndex,
			choiceIds: input.choiceIds,
		});
	}
}

function memoryStore() {
	const items = new Map<string, string>();
	return createPlayerSessionStore({
		getItem: (key) => items.get(key) ?? null,
		setItem: (key, value) => void items.set(key, value),
		removeItem: (key) => void items.delete(key),
	});
}

function renderFlow(
	options: {
		pin?: string | null;
		api?: FakeJoinApi;
		store?: ReturnType<typeof memoryStore>;
	} = {},
) {
	const api = options.api ?? new FakeJoinApi();
	const store = options.store ?? memoryStore();
	const subscriber = new InMemoryRealtimeSubscriber();
	const onPinChange = vi.fn();
	const user = userEvent.setup(
		vi.isFakeTimers() ? { advanceTimers: vi.advanceTimersByTime } : undefined,
	);
	const ui = (pin: string | null) => (
		<RealtimeProvider createSubscriber={() => subscriber}>
			<JoinFlow pin={pin} api={api} store={store} onPinChange={onPinChange} />
		</RealtimeProvider>
	);
	const view = render(ui(options.pin ?? null));
	return {
		api,
		store,
		subscriber,
		onPinChange,
		user,
		/** The route follows `onPinChange` by changing the address. */
		setAddress: (pin: string | null) => view.rerender(ui(pin)),
		unmount: view.unmount,
	};
}

const pinField = () => screen.getByRole("textbox", { name: "PIN" });
const nicknameField = () => screen.getByRole("textbox", { name: "Apelido" });

async function typePin(user: ReturnType<typeof userEvent.setup>, pin: string) {
	await user.type(pinField(), pin);
	await user.click(screen.getByRole("button", { name: "Entrar" }));
}

async function joinAs(flow: ReturnType<typeof renderFlow>, nickname: string) {
	await typePin(flow.user, PIN);
	await flow.user.type(
		await screen.findByRole("textbox", { name: "Apelido" }),
		nickname,
	);
	await flow.user.click(screen.getByRole("button", { name: "Ok, vamos lá!" }));
	await screen.findByText("Pronto! Está vendo seu apelido na tela?");
}

afterEach(() => {
	vi.useRealTimers();
});

describe("JoinFlow: the PIN (spec 008)", () => {
	it("asks for the PIN on a numeric keyboard", () => {
		renderFlow();

		expect(pinField()).toHaveAttribute("inputmode", "numeric");
		expect(pinField()).toHaveAttribute("placeholder", "Inserir PIN");
	});

	it("keeps only six digits, ignoring spaces and letters", async () => {
		const { user } = renderFlow();

		await user.type(pinField(), "265 91a4 99");

		expect(pinField()).toHaveValue("265914");
	});

	it("does not send an empty PIN", async () => {
		const { api, user } = renderFlow();

		await user.click(screen.getByRole("button", { name: "Entrar" }));

		expect(api.finds).toEqual([]);
	});

	it("leads to the nickname and puts the PIN in the address", async () => {
		const { user, onPinChange } = renderFlow();

		await typePin(user, PIN);

		expect(
			await screen.findByText("Não use seu nome verdadeiro"),
		).toBeInTheDocument();
		expect(nicknameField()).toHaveAttribute(
			"placeholder",
			"Insira seu apelido",
		);
		expect(onPinChange).toHaveBeenLastCalledWith(PIN);
	});

	it("a wrong PIN turns the field red, with the message, and can be corrected", async () => {
		const { user } = renderFlow();

		await typePin(user, "569172");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível reconhecer o PIN do jogo. Verifique-o e tente de novo.",
		);
		expect(pinField()).toBeInvalid();
		expect(pinField()).toHaveValue("569172");

		await user.clear(pinField());
		await typePin(user, PIN);

		expect(
			await screen.findByRole("textbox", { name: "Apelido" }),
		).toBeInTheDocument();
	});

	it("tells a locked game", async () => {
		const api = new FakeJoinApi();
		api.locked = true;
		const { user } = renderFlow({ api });

		await typePin(user, PIN);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Este jogo está bloqueado. Peça ao anfitrião para desbloquear.",
		);
		expect(pinField()).toBeValid();
	});

	it("tells when there were too many attempts", async () => {
		const api = new FakeJoinApi();
		api.blocked = true;
		const { user } = renderFlow({ api });

		await typePin(user, PIN);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Muitas tentativas. Aguarde um momento e tente de novo.",
		);
	});
});

describe("JoinFlow: the join link (spec 008)", () => {
	it("skips the PIN step", async () => {
		const { api } = renderFlow({ pin: PIN });

		expect(
			await screen.findByRole("textbox", { name: "Apelido" }),
		).toBeInTheDocument();
		expect(api.finds).toEqual([PIN]);
	});

	it("a link with an unknown PIN lands on the PIN step with the message", async () => {
		const { onPinChange } = renderFlow({ pin: "569172" });

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível reconhecer o PIN do jogo.",
		);
		expect(pinField()).toBeInTheDocument();
		expect(onPinChange).toHaveBeenLastCalledWith(null);
	});

	it("a link that is not a PIN is not even asked to the server", async () => {
		const { api } = renderFlow({ pin: "abc" });

		expect(await screen.findByRole("alert")).toBeInTheDocument();
		expect(api.finds).toEqual([]);
	});

	it("the address following the flow does not ask again", async () => {
		const flow = renderFlow();
		await typePin(flow.user, PIN);
		await screen.findByRole("textbox", { name: "Apelido" });

		flow.setAddress(PIN);

		expect(
			screen.getByRole("textbox", { name: "Apelido" }),
		).toBeInTheDocument();
		expect(flow.api.finds).toEqual([PIN]);
	});
});

describe("JoinFlow: the nickname (spec 008)", () => {
	it("enters trimmed and waits", async () => {
		const flow = renderFlow();

		await joinAs(flow, "  ACT  ");

		expect(screen.getByRole("heading", { name: "ACT" })).toBeInTheDocument();
		expect(flow.store.load(PIN)).toEqual({
			gameId: GAME,
			playerId: "p1",
			secret: "secret-p1",
		});
	});

	it("does not accept more than 15 perceived characters", async () => {
		const { user } = renderFlow({ pin: PIN });

		// Pasted, as a phone keyboard delivers an emoji: whole.
		await user.click(await screen.findByRole("textbox", { name: "Apelido" }));
		await user.paste("abcdefghijklmn👩‍👩‍👧xyz");

		expect(nicknameField()).toHaveValue("abcdefghijklmn👩‍👩‍👧");
	});

	it("does not send an empty nickname", async () => {
		const { api, user } = renderFlow({ pin: PIN });

		await user.type(
			await screen.findByRole("textbox", { name: "Apelido" }),
			"   ",
		);
		await user.click(screen.getByRole("button", { name: "Ok, vamos lá!" }));

		expect(api.players.size).toBe(0);
		expect(nicknameField()).toBeInTheDocument();
	});

	it("a nickname in use asks for another", async () => {
		const api = new FakeJoinApi();
		api.players.set("p1", { nickname: "José", removed: false });
		const { user } = renderFlow({ api, pin: PIN });

		await user.type(
			await screen.findByRole("textbox", { name: "Apelido" }),
			"josé",
		);
		await user.click(screen.getByRole("button", { name: "Ok, vamos lá!" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Esse apelido já está em uso. Escolha outro.",
		);
		expect(nicknameField()).toBeInTheDocument();
	});

	it("a game locked meanwhile keeps the player out", async () => {
		const api = new FakeJoinApi();
		const { user } = renderFlow({ api, pin: PIN });
		const field = await screen.findByRole("textbox", { name: "Apelido" });
		api.locked = true;

		await user.type(field, "ACT");
		await user.click(screen.getByRole("button", { name: "Ok, vamos lá!" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Este jogo está bloqueado. Peça ao anfitrião para desbloquear.",
		);
		expect(
			screen.queryByText("Pronto! Está vendo seu apelido na tela?"),
		).toBeNull();
	});

	it("a game ended meanwhile sends the player back to the PIN", async () => {
		const api = new FakeJoinApi();
		const { user, onPinChange } = renderFlow({ api, pin: PIN });
		const field = await screen.findByRole("textbox", { name: "Apelido" });
		api.ended = true;

		await user.type(field, "ACT");
		await user.click(screen.getByRole("button", { name: "Ok, vamos lá!" }));

		expect(
			await screen.findByRole("textbox", { name: "PIN" }),
		).toBeInTheDocument();
		expect(onPinChange).toHaveBeenLastCalledWith(null);
	});
});

describe("JoinFlow: waiting (spec 008)", () => {
	it("a reload comes back to the waiting screen as the same player", async () => {
		const first = renderFlow();
		await joinAs(first, "ACT");
		first.unmount();

		renderFlow({ pin: PIN, api: first.api, store: first.store });

		expect(
			await screen.findByRole("heading", { name: "ACT" }),
		).toBeInTheDocument();
		expect(first.api.players.size).toBe(1);
	});

	it("leaves with the message when the host removes the player", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");

		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.playerRemoved, {
				playerId: "p1",
			}),
		);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Ah, não! Você foi expulso do jogo.",
		);
		expect(pinField()).toBeInTheDocument();
		expect(flow.store.load(PIN)).toBeNull();
		expect(flow.onPinChange).toHaveBeenLastCalledWith(null);
	});

	it("stays when another player is removed", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");

		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.playerRemoved, {
				playerId: "p2",
			}),
		);

		expect(screen.getByRole("heading", { name: "ACT" })).toBeInTheDocument();
	});

	it("leaves with the message when the game ends", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");

		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.gameEnded, {
				reason: "host",
			}),
		);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"O anfitrião encerrou o jogo.",
		);
	});

	it("catches up on a removal it missed while offline", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		const player = flow.api.players.get("p1");
		if (player) {
			player.removed = true;
		}

		await act(() => vi.advanceTimersByTimeAsync(SESSION_CHECK_INTERVAL_MS));

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Ah, não! Você foi expulso do jogo.",
		);
	});

	it("a removed player who reloads sees the message, not the waiting screen", async () => {
		const first = renderFlow();
		await joinAs(first, "ACT");
		first.unmount();
		const player = first.api.players.get("p1");
		if (player) {
			player.removed = true;
		}

		renderFlow({ pin: PIN, api: first.api, store: first.store });

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Ah, não! Você foi expulso do jogo.",
		);
		expect(first.store.load(PIN)).toBeNull();
	});

	it("a session of a game that is gone starts over", async () => {
		const store = memoryStore();
		store.save(PIN, { gameId: "old", playerId: "p9", secret: "x" });

		renderFlow({ pin: PIN, store });

		expect(
			await screen.findByRole("textbox", { name: "Apelido" }),
		).toBeInTheDocument();
		expect(store.load(PIN)).toBeNull();
	});
});

const stageOf = (
	phase: PublicStage["phase"],
	questionIndex = 0,
): PublicStage => ({
	questionIndex,
	questionCount: 3,
	phase,
	durationMs:
		phase === "results" ? null : phase === "answering" ? 20_000 : 5_000,
	question:
		phase === "gameIntro"
			? null
			: {
					type: "quiz",
					selection: "single",
					choices: [0, 1, 2, 3].map((shapeIndex) => ({
						id: `choice-${shapeIndex + 1}`,
						shapeIndex,
						label: null,
					})),
				},
});

describe("JoinFlow: playing (spec 009)", () => {
	/** The host moves the game; the device hears of it by the event. */
	function moveTo(flow: ReturnType<typeof renderFlow>, stage: PublicStage) {
		flow.api.stage = stage;
		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.stageChanged, {
				status: "playing",
				stage,
			}),
		);
	}
	const red = () => screen.getByRole("button", { name: "Triângulo vermelho" });
	const answerButtons = () =>
		document.querySelectorAll('[data-slot="answer-button"]');

	it("a game in progress takes nobody new", async () => {
		const api = new FakeJoinApi();
		api.stage = stageOf("answering");
		const { user } = renderFlow({ api });

		await typePin(user, PIN);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Este jogo já começou.",
		);
		expect(screen.queryByRole("textbox", { name: "Apelido" })).toBeNull();
	});

	it("follows the game from the lobby to the answer buttons", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");

		moveTo(flow, stageOf("gameIntro"));
		expect(screen.getByRole("heading", { name: "Prepare-se!" })).toBeVisible();

		moveTo(flow, stageOf("questionIntro"));
		expect(screen.getByRole("heading", { name: "Pergunta 1" })).toBeVisible();
		expect(screen.getByText("Preparar…")).toBeVisible();
		expect(answerButtons()).toHaveLength(0);

		moveTo(flow, stageOf("answering"));
		expect(answerButtons()).toHaveLength(4);
		expect(red()).toBeVisible();
	});

	it("sends the answer for the question on screen and waits", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("answering", 2));

		await flow.user.click(red());

		expect(flow.api.answers).toEqual([
			{ playerId: "p1", questionIndex: 2, choiceIds: ["choice-1"] },
		]);
		expect(await screen.findByRole("status")).toHaveTextContent(
			"A competitividade está no ar?",
		);
		expect(answerButtons()).toHaveLength(0);
	});

	it("says the time is up when the answer arrives late", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("answering"));
		flow.api.answerRefusal = "GAME.ANSWERS_CLOSED";

		await flow.user.click(red());

		expect(
			await screen.findByRole("heading", { name: "Tempo esgotado" }),
		).toBeVisible();
		expect(answerButtons()).toHaveLength(0);
	});

	it("keeps the buttons when the answer could not be sent", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("answering"));
		flow.api.answerRefusal = "NETWORK";

		await flow.user.click(red());

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível concluir. Tente novamente.",
		);
		expect(answerButtons()).toHaveLength(4);
	});

	it.each([
		["correct", "Correto"],
		["wrong", "Incorreto"],
	] as const)("tells a %s answer at the results", async (result, title) => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("answering"));
		await flow.user.click(red());
		flow.api.results.set("p1", result);

		moveTo(flow, stageOf("results"));

		expect(await screen.findByRole("heading", { name: title })).toBeVisible();
	});

	it("tells who did not answer that the time is up", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("answering"));

		moveTo(flow, stageOf("results"));

		expect(
			await screen.findByRole("heading", { name: "Tempo esgotado" }),
		).toBeVisible();
		expect(screen.getByText("Ainda não acabou!")).toBeVisible();
	});

	it("starts the next question with fresh buttons", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("answering"));
		await flow.user.click(red());
		moveTo(flow, stageOf("results"));
		await screen.findByRole("heading", { name: "Tempo esgotado" });

		moveTo(flow, stageOf("questionIntro", 1));
		expect(screen.getByRole("heading", { name: "Pergunta 2" })).toBeVisible();

		moveTo(flow, stageOf("answering", 1));
		expect(answerButtons()).toHaveLength(4);
	});

	it("ignores an event that arrives late, after the game moved on", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("answering"));

		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.stageChanged, {
				status: "playing",
				stage: stageOf("questionIntro"),
			}),
		);

		expect(answerButtons()).toHaveLength(4);
	});

	it("a reload during the answers brings the buttons back", async () => {
		const api = new FakeJoinApi();
		const store = memoryStore();
		const first = renderFlow({ api, store });
		await joinAs(first, "ACT");
		api.stage = stageOf("answering");
		first.unmount();

		renderFlow({ api, store, pin: PIN });

		expect(
			await screen.findByRole("button", { name: "Triângulo vermelho" }),
		).toBeVisible();
		expect(api.players.size).toBe(1);
	});

	it("a reload after answering brings the waiting screen back", async () => {
		const api = new FakeJoinApi();
		const store = memoryStore();
		const first = renderFlow({ api, store });
		await joinAs(first, "ACT");
		moveTo(first, stageOf("answering"));
		await first.user.click(red());
		first.unmount();

		renderFlow({ api, store, pin: PIN });

		expect(await screen.findByText("Resposta recebida!")).toBeVisible();
		expect(answerButtons()).toHaveLength(0);
	});

	it("a reload at the results shows the result again", async () => {
		const api = new FakeJoinApi();
		const store = memoryStore();
		const first = renderFlow({ api, store });
		await joinAs(first, "ACT");
		api.stage = stageOf("results");
		api.results.set("p1", "correct");
		first.unmount();

		renderFlow({ api, store, pin: PIN });

		expect(
			await screen.findByRole("heading", { name: "Correto" }),
		).toBeVisible();
	});

	it("catches up on a stage it missed, asking every few seconds while playing", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("questionIntro"));

		// The answers opened, and the event never came.
		flow.api.stage = stageOf("answering");
		await act(() => vi.advanceTimersByTimeAsync(PLAY_CHECK_INTERVAL_MS));

		expect(answerButtons()).toHaveLength(4);
	});

	it("shows the end of the game, which a reload keeps", async () => {
		const api = new FakeJoinApi();
		const store = memoryStore();
		const flow = renderFlow({ api, store });
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("results"));

		api.finished = true;
		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.stageChanged, {
				status: "finished",
				stage: null,
			}),
		);

		expect(screen.getByRole("heading", { name: "Fim do jogo" })).toBeVisible();
		expect(screen.getByText("Obrigado por jogar!")).toBeVisible();

		flow.unmount();
		renderFlow({ api, store, pin: PIN });
		expect(
			await screen.findByRole("heading", { name: "Fim do jogo" }),
		).toBeVisible();
	});

	it("a finished game does not keep its PIN from being typed again", async () => {
		const api = new FakeJoinApi();
		const store = memoryStore();
		const first = renderFlow({ api, store });
		await joinAs(first, "ACT");
		api.finished = true;
		first.unmount();

		const { user } = renderFlow({ api, store });
		await typePin(user, PIN);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível reconhecer o PIN do jogo. Verifique-o e tente de novo.",
		);
		expect(store.load(PIN)).toBeNull();
	});

	it("leaves with the message when the host ends the game in the middle", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("answering"));

		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.gameEnded, {
				reason: "host",
			}),
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"O anfitrião encerrou o jogo.",
		);
		expect(pinField()).toBeInTheDocument();
	});
});
