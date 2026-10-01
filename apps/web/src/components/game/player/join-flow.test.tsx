import { GAME_EVENTS, gameChannel } from "@quizio/core/game/domain/game-events";
import { InMemoryRealtimeSubscriber } from "@quizio/realtime/testing/in-memory-realtime-subscriber";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PlayerSessionData } from "@/lib/api-types";
import {
	createPlayerSessionStore,
	type StoredPlayerSession,
} from "@/lib/player-session";
import { RealtimeProvider } from "@/lib/realtime";

import { type JoinApi, JoinFlow, SESSION_CHECK_INTERVAL_MS } from "./join-flow";

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
	readonly players = new Map<string, { nickname: string; removed: boolean }>();
	readonly finds: string[] = [];

	async find(pin: string) {
		this.finds.push(pin);
		if (this.blocked) {
			throw refusal("GAME.TOO_MANY_PIN_ATTEMPTS");
		}
		if (pin !== PIN || this.ended) {
			throw refusal("GAME.PIN_NOT_RECOGNIZED");
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
		return {
			gameId: GAME,
			nickname: player.nickname,
			status: player.removed ? "removed" : this.ended ? "ended" : "waiting",
		};
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
