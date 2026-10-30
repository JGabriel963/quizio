import { type Avatar, knownAvatar } from "@quizio/core/game/domain/avatar";
import { GAME_EVENTS, gameChannel } from "@quizio/core/game/domain/game-events";
import { HOST_AWAY_AFTER_MS } from "@quizio/core/game/domain/host-presence";
import type { PublicStage } from "@quizio/core/game/domain/public-stage";
import type { ThemeLookView } from "@quizio/core/shared/application/theme-look-view";
import type { ThemeId } from "@quizio/core/shared/domain/theme";
import { InMemoryRealtimeSubscriber } from "@quizio/realtime/testing/in-memory-realtime-subscriber";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
	PlayerOutcomeData,
	PlayerResultData,
	PlayerSessionData,
} from "@/lib/api-types";
import {
	createPlayerSessionStore,
	type StoredAvatar,
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
/** The avatar the fake server draws for who brings none. */
const DRAWN: Avatar = { character: "moon", accessory: "fire" };
const GAME = "game-1";

/** What a request ends in when the server is out of reach. */
const noAnswer = () => new TypeError("Failed to fetch");

/** The API's refusals carry the domain code, as tRPC errors do. */
const refusal = (domainCode: string) =>
	Object.assign(new Error(domainCode), { data: { domainCode } });

/** A small game server: one open game, its players and what happened to them. */
class FakeJoinApi implements JoinApi {
	locked = false;
	ended = false;
	blocked = false;
	finished = false;
	/** What is left of the podium's reveal, as the server would tell (spec 011). */
	revealRemainingMs = 0;
	/** The place each player finished in; the first by default. */
	readonly ranks = new Map<string, number>();
	/** The stage of a game in progress; null while in the lobby. */
	stage: PublicStage | null = null;
	/** What the server answers to an answer, when it refuses. */
	answerRefusal: string | null = null;
	/** The device has no connection: nothing gets an answer (spec 013). */
	offline = false;
	/** How long the host's screen has been silent, as the server would tell. */
	hostIdleMs = 0;
	readonly answers: {
		playerId: string;
		questionIndex: number;
		choiceIds: string[];
	}[] = [];
	/** How each player did in the question being revealed. */
	readonly results = new Map<string, PlayerResultData>();
	/** The points each player has, as the server would tell them. */
	readonly totals = new Map<string, number>();
	readonly players = new Map<
		string,
		{
			nickname: string;
			removed: boolean;
			firstQuestionIndex: number;
			avatar: Avatar;
		}
	>();
	readonly finds: string[] = [];
	/** The game each `find` named, from a join link (RN-39a). */
	readonly linkedFinds: (string | null | undefined)[] = [];
	/** Open assignments, by their eight-digit PIN (spec 029). */
	readonly assignments = new Map<string, string>();
	/** "Personagens dos jogadores" (spec 028). */
	charactersOn = true;
	/** The game's theme (spec 042). */
	themeId: ThemeId = "standard";
	/** The game's custom look (spec 043). */
	customTheme: ThemeLookView | null = null;
	/** What a change of avatar ends in, when it fails. */
	avatarRefusal: Error | null = null;
	/** The avatars each `enter` was sent. */
	readonly entered: (StoredAvatar | null | undefined)[] = [];
	/** The network created as many players as it may for now (spec 008, RN-45a). */
	tooManyJoins = false;

	async find(pin: string, gameId?: string | null) {
		this.finds.push(pin);
		this.linkedFinds.push(gameId);
		const assignment = this.assignments.get(pin);
		if (assignment) {
			return {
				gameId: assignment,
				pin,
				mode: "assignment" as const,
				themeId: this.themeId,
				customTheme: this.customTheme,
			};
		}
		if (this.blocked && gameId !== GAME) {
			throw refusal("GAME.TOO_MANY_PIN_ATTEMPTS");
		}
		if (pin !== PIN || this.ended || this.finished) {
			throw refusal("GAME.PIN_NOT_RECOGNIZED");
		}
		if (this.locked) {
			throw refusal("GAME.LOCKED");
		}
		return {
			gameId: GAME,
			pin,
			mode: "live" as const,
			themeId: this.themeId,
			customTheme: this.customTheme,
		};
	}

	async enter({
		nickname,
		avatar,
	}: {
		gameId: string;
		nickname: string;
		avatar?: StoredAvatar | null;
	}) {
		this.entered.push(avatar);
		if (this.ended) {
			throw refusal("GAME.PIN_NOT_RECOGNIZED");
		}
		if (this.tooManyJoins) {
			throw refusal("GAME.TOO_MANY_JOINS");
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
		const { stage } = this;
		// Who joins with the answers open plays from the next question (spec 012).
		const opened =
			stage !== null &&
			stage.phase !== "gameIntro" &&
			stage.phase !== "questionIntro";
		this.players.set(playerId, {
			nickname: trimmed,
			removed: false,
			firstQuestionIndex: (stage?.questionIndex ?? 0) + (opened ? 1 : 0),
			avatar: knownAvatar(avatar ?? null) ?? DRAWN,
		});
		return {
			playerId,
			secret: `secret-${playerId}`,
			nickname: trimmed,
			avatar: knownAvatar(avatar ?? null) ?? DRAWN,
		};
	}

	async setAvatar(input: StoredPlayerSession & { avatar: Avatar }) {
		if (this.avatarRefusal) {
			throw this.avatarRefusal;
		}
		const player = this.players.get(input.playerId);
		if (player) {
			player.avatar = input.avatar;
		}
		return { avatar: input.avatar };
	}

	async session(input: StoredPlayerSession): Promise<PlayerSessionData> {
		if (this.offline) {
			throw noAnswer();
		}
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
		const sittingOut =
			stage !== null && stage.questionIndex < player.firstQuestionIndex;
		return {
			gameId: GAME,
			themeId: this.themeId,
			customTheme: this.customTheme,
			nickname: player.nickname,
			avatar: this.charactersOn ? player.avatar : null,
			canChangeAvatar:
				this.charactersOn && !over && (stage === null || sittingOut),
			status: over ?? (stage ? "playing" : "waiting"),
			stage:
				over || !stage
					? null
					: {
							...stage,
							question: sittingOut ? null : stage.question,
							remainingMs: stage.durationMs,
							sittingOut,
							answered,
							total: this.totals.get(input.playerId) ?? 0,
							outcome:
								!sittingOut &&
								(stage.phase === "results" || stage.phase === "scoreboard")
									? this.outcomeOf(input.playerId)
									: null,
						},
			final:
				over === "finished"
					? {
							title: "Capitais",
							rank: this.ranks.get(input.playerId) ?? 1,
							total: this.totals.get(input.playerId) ?? 0,
							revealRemainingMs: this.revealRemainingMs,
						}
					: null,
			hostIdleMs: over ? null : this.hostIdleMs,
		};
	}

	/** What the question left the player with: 639 points for a right answer. */
	outcomeOf(playerId: string): PlayerOutcomeData {
		const result = this.results.get(playerId) ?? "timeout";
		const right = result === "correct";
		return {
			result,
			points: right ? 639 : 0,
			streak: right ? 1 : 0,
			rank: right ? 1 : 2,
			reviewed: false,
			slider: null,
			behind: right ? null : { nickname: "Bia", points: 639 },
		};
	}

	async answer(
		input: StoredPlayerSession & { questionIndex: number; choiceIds: string[] },
	) {
		if (this.offline) {
			throw noAnswer();
		}
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
		linkedGameId?: string | null;
		api?: FakeJoinApi;
		store?: ReturnType<typeof memoryStore>;
	} = {},
) {
	const api = options.api ?? new FakeJoinApi();
	const store = options.store ?? memoryStore();
	const subscriber = new InMemoryRealtimeSubscriber();
	const onPinChange = vi.fn();
	const onAssignment = vi.fn();
	const user = userEvent.setup(
		vi.isFakeTimers() ? { advanceTimers: vi.advanceTimersByTime } : undefined,
	);
	const ui = (pin: string | null) => (
		<RealtimeProvider createSubscriber={() => subscriber}>
			<JoinFlow
				pin={pin}
				linkedGameId={options.linkedGameId ?? null}
				api={api}
				store={store}
				onPinChange={onPinChange}
				onAssignment={onAssignment}
			/>
		</RealtimeProvider>
	);
	const view = render(ui(options.pin ?? null));
	return {
		api,
		store,
		subscriber,
		onPinChange,
		onAssignment,
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

	it("keeps only digits, up to an assignment's eight, ignoring spaces and letters (spec 029, RN-20)", async () => {
		const { user } = renderFlow();

		await user.type(pinField(), "265 91a4 998");

		expect(pinField()).toHaveValue("26591499");
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
			"Muitas tentativas. Aguarde um momento ou entre pelo QR code ou pelo link do jogo.",
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

	it("sends the game the link names, which gets past a network out of attempts (RN-39a)", async () => {
		const api = new FakeJoinApi();
		api.blocked = true;
		renderFlow({ api, pin: PIN, linkedGameId: GAME });

		expect(
			await screen.findByRole("textbox", { name: "Apelido" }),
		).toBeInTheDocument();
		expect(api.linkedFinds).toEqual([GAME]);
	});

	it("a typed PIN names no game", async () => {
		const { api, user } = renderFlow();

		await typePin(user, PIN);

		await screen.findByRole("textbox", { name: "Apelido" });
		expect(api.linkedFinds).toEqual([null]);
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

describe("JoinFlow: the theme (spec 042, RN-14)", () => {
	const shownTheme = () =>
		document
			.querySelector('[data-slot="game-screen"]')
			?.getAttribute("data-theme");

	it("the PIN screen is standard and the nickname and waiting screens have the game's theme", async () => {
		const api = new FakeJoinApi();
		api.themeId = "light-blue";
		const flow = renderFlow({ api });

		expect(shownTheme()).toBe("standard");
		await flow.user.type(pinField(), PIN);
		await flow.user.click(screen.getByRole("button", { name: "Entrar" }));
		await screen.findByRole("textbox", { name: "Apelido" });
		expect(shownTheme()).toBe("light-blue");

		await flow.user.type(nicknameField(), "ACT");
		await flow.user.click(
			screen.getByRole("button", { name: "Ok, vamos lá!" }),
		);
		await screen.findByRole("heading", { name: "ACT" });
		expect(shownTheme()).toBe("light-blue");
	});

	it("the way back to a remembered game has the game's theme", async () => {
		const api = new FakeJoinApi();
		api.themeId = "teal";
		const store = memoryStore();
		const first = renderFlow({ api, store });
		await joinAs(first, "ACT");
		first.unmount();

		renderFlow({ api, store });

		await screen.findByRole("button", { name: "Voltar como ACT" });
		expect(shownTheme()).toBe("teal");
	});

	it("the game's custom look shows after the PIN (spec 043)", async () => {
		const api = new FakeJoinApi();
		api.customTheme = {
			pattern: "tiles" as const,
			backgroundColor: "#1b2a6b",
			imageUrl: null,
			imageTone: null,
			accentColor: "#ffd84d",
			logoUrl: null,
		};
		const flow = renderFlow({ api });

		expect(shownTheme()).toBe("standard");
		await flow.user.type(pinField(), PIN);
		await flow.user.click(screen.getByRole("button", { name: "Entrar" }));
		await screen.findByRole("textbox", { name: "Apelido" });
		expect(shownTheme()).toBe("custom");

		await flow.user.type(nicknameField(), "ACT");
		await flow.user.click(
			screen.getByRole("button", { name: "Ok, vamos lá!" }),
		);
		await screen.findByRole("heading", { name: "ACT" });
		expect(shownTheme()).toBe("custom");
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

	it("too many joins from the network keep the player on the nickname (RN-45a)", async () => {
		const api = new FakeJoinApi();
		api.tooManyJoins = true;
		const { user } = renderFlow({ api, pin: PIN });

		await user.type(
			await screen.findByRole("textbox", { name: "Apelido" }),
			"ACT",
		);
		await user.click(screen.getByRole("button", { name: "Ok, vamos lá!" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Muitas entradas por esta rede agora. Aguarde um momento e tente de novo.",
		);
		expect(nicknameField()).toHaveValue("ACT");
	});

	it("a nickname in use asks for another", async () => {
		const api = new FakeJoinApi();
		api.players.set("p1", {
			nickname: "José",
			removed: false,
			firstQuestionIndex: 0,
			avatar: DRAWN,
		});
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
	selection: "single" | "multiple" = "single",
): PublicStage => ({
	questionIndex,
	questionCount: 3,
	phase,
	durationMs:
		phase === "results" || phase === "scoreboard"
			? null
			: phase === "answering"
				? 20_000
				: 5_000,
	question:
		phase === "gameIntro"
			? null
			: {
					type: "quiz",
					selection,
					slider: null,
					text: null,
					textFormatting: {},
					image: null,
					choices: [0, 1, 2, 3].map((shapeIndex) => ({
						id: `choice-${shapeIndex + 1}`,
						shapeIndex,
						label: null,
						text: null,
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

	it("joins a game in progress and plays the question (spec 012)", async () => {
		const api = new FakeJoinApi();
		api.stage = stageOf("questionIntro", 1);
		const flow = renderFlow({ api });

		await typePin(flow.user, PIN);
		await flow.user.type(
			await screen.findByRole("textbox", { name: "Apelido" }),
			"Caio",
		);
		await flow.user.click(
			screen.getByRole("button", { name: "Ok, vamos lá!" }),
		);

		// Straight into the game: no lobby to wait in.
		expect(
			await screen.findByRole("heading", { name: "Pergunta 2" }),
		).toBeVisible();
		expect(
			screen.queryByText("Pronto! Está vendo seu apelido na tela?"),
		).toBeNull();

		moveTo(flow, stageOf("answering", 1));
		await flow.user.click(red());

		expect(api.answers).toEqual([
			{ playerId: "p1", questionIndex: 1, choiceIds: ["choice-1"] },
		]);
	});

	async function joinInTheMiddle(api: FakeJoinApi) {
		const flow = renderFlow({ api });
		await typePin(flow.user, PIN);
		await flow.user.type(
			await screen.findByRole("textbox", { name: "Apelido" }),
			"Caio",
		);
		await flow.user.click(
			screen.getByRole("button", { name: "Ok, vamos lá!" }),
		);
		await screen.findByRole("heading", { name: "Você entrou!" });
		return flow;
	}

	it("joins with the answers open and waits (spec 012)", async () => {
		const api = new FakeJoinApi();
		api.stage = stageOf("answering", 1);

		const flow = await joinInTheMiddle(api);

		expect(screen.getByRole("status")).toHaveTextContent(
			"Aguarde a próxima pergunta.",
		);
		expect(answerButtons()).toHaveLength(0);

		// The results and the scoreboard of that question are not his either.
		moveTo(flow, stageOf("results", 1));
		expect(screen.getByRole("heading", { name: "Você entrou!" })).toBeVisible();
		expect(screen.queryByText("Tempo esgotado")).toBeNull();
		moveTo(flow, stageOf("scoreboard", 1));
		expect(screen.getByRole("heading", { name: "Você entrou!" })).toBeVisible();

		// The next question is.
		moveTo(flow, stageOf("questionIntro", 2));
		expect(screen.getByRole("heading", { name: "Pergunta 3" })).toBeVisible();
		moveTo(flow, stageOf("answering", 2));
		await flow.user.click(red());
		expect(api.answers).toEqual([
			{ playerId: "p1", questionIndex: 2, choiceIds: ["choice-1"] },
		]);
	});

	it("who joined in the middle keeps waiting after a reload (spec 012)", async () => {
		const api = new FakeJoinApi();
		api.stage = stageOf("answering", 1);
		const flow = await joinInTheMiddle(api);
		flow.unmount();

		renderFlow({ pin: PIN, api, store: flow.store });

		expect(
			await screen.findByRole("heading", { name: "Você entrou!" }),
		).toBeVisible();
	});

	it("a nickname in use is told during the game (spec 012)", async () => {
		const api = new FakeJoinApi();
		api.stage = stageOf("answering");
		api.players.set("p1", {
			nickname: "Ana",
			removed: false,
			firstQuestionIndex: 0,
			avatar: DRAWN,
		});
		const { user } = renderFlow({ api });

		await typePin(user, PIN);
		await user.type(
			await screen.findByRole("textbox", { name: "Apelido" }),
			"ana",
		);
		await user.click(screen.getByRole("button", { name: "Ok, vamos lá!" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Esse apelido já está em uso. Escolha outro.",
		);
	});

	it("a locked game in progress keeps the player out (spec 012)", async () => {
		const api = new FakeJoinApi();
		api.stage = stageOf("answering");
		api.locked = true;
		const { user } = renderFlow({ api });

		await typePin(user, PIN);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Este jogo está bloqueado. Peça ao anfitrião para desbloquear.",
		);
	});

	describe("multiple selection (spec 012)", () => {
		const blue = () => screen.getByRole("button", { name: "Losango azul" });

		it("sends the marked answers and waits", async () => {
			const flow = renderFlow();
			await joinAs(flow, "ACT");
			moveTo(flow, stageOf("answering", 0, "multiple"));

			await flow.user.click(red());
			await flow.user.click(blue());
			await flow.user.click(screen.getByRole("button", { name: "Enviar" }));

			expect(flow.api.answers).toEqual([
				{
					playerId: "p1",
					questionIndex: 0,
					choiceIds: ["choice-1", "choice-2"],
				},
			]);
			expect(await screen.findByRole("status")).toHaveTextContent(
				"Resposta recebida!",
			);
			expect(answerButtons()).toHaveLength(0);
		});

		it("the marks do not count as an answer", async () => {
			const flow = renderFlow();
			await joinAs(flow, "ACT");
			moveTo(flow, stageOf("answering", 0, "multiple"));

			await flow.user.click(red());
			await flow.user.click(blue());
			await flow.user.click(red());

			expect(blue()).toHaveAttribute("aria-pressed", "true");
			expect(red()).toHaveAttribute("aria-pressed", "false");
			expect(flow.api.answers).toEqual([]);
			expect(answerButtons()).toHaveLength(4);
		});

		it("time over with marks and nothing sent", async () => {
			const flow = renderFlow();
			await joinAs(flow, "ACT");
			moveTo(flow, stageOf("answering", 0, "multiple"));
			await flow.user.click(red());
			await flow.user.click(blue());

			moveTo(flow, stageOf("results", 0, "multiple"));

			expect(
				await screen.findByRole("heading", { name: "Tempo esgotado" }),
			).toBeVisible();
			expect(flow.api.answers).toEqual([]);
		});

		it("the marks do not go on to the next question", async () => {
			const flow = renderFlow();
			await joinAs(flow, "ACT");
			moveTo(flow, stageOf("answering", 0, "multiple"));
			await flow.user.click(red());

			moveTo(flow, stageOf("results", 0, "multiple"));
			moveTo(flow, stageOf("answering", 1, "multiple"));

			expect(red()).toHaveAttribute("aria-pressed", "false");
			expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
		});
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

	it("goes from the last results to the wait and then the final screen, which a reload keeps (spec 011)", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const api = new FakeJoinApi();
		const store = memoryStore();
		const flow = renderFlow({ api, store });
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("results"));

		api.finished = true;
		api.revealRemainingMs = 7_000;
		api.totals.set("p1", 3127);
		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.stageChanged, {
				status: "finished",
				stage: null,
			}),
		);

		expect(screen.getByRole("status")).toHaveTextContent("Rufar dos tambores…");
		await act(() => vi.advanceTimersByTimeAsync(6_000));
		expect(screen.getByRole("status")).toBeVisible();

		await act(() => vi.advanceTimersByTimeAsync(1_500));
		expect(screen.getByRole("heading", { name: "Imbatível!" })).toBeVisible();
		expect(
			document.querySelector('[data-slot="player-total"]'),
		).toHaveTextContent("3127");

		// The reveal is over by then: a reload shows the place at once.
		flow.unmount();
		api.revealRemainingMs = 0;
		renderFlow({ api, store, pin: PIN });
		expect(
			await screen.findByRole("heading", { name: "Imbatível!" }),
		).toBeVisible();
		expect(screen.queryByRole("status")).toBeNull();
	});

	it("catches up on the end of the game when the event was missed (spec 011)", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("results"));

		flow.api.finished = true;
		flow.api.ranks.set("p1", 5);
		await act(() => vi.advanceTimersByTimeAsync(PLAY_CHECK_INTERVAL_MS));

		expect(
			screen.getByRole("heading", { name: "Você ficou em 5º lugar" }),
		).toBeVisible();
	});

	it("enters another game from the final screen (spec 011)", async () => {
		const api = new FakeJoinApi();
		const store = memoryStore();
		const first = renderFlow({ api, store });
		await joinAs(first, "ACT");
		api.finished = true;
		first.unmount();
		const flow = renderFlow({ api, store, pin: PIN });

		await flow.user.click(
			await screen.findByRole("button", { name: "Entrar em outro jogo" }),
		);

		expect(pinField()).toBeInTheDocument();
		// Leaving by choice gives no reason to show.
		expect(screen.getByRole("alert").textContent).toBe("");
		expect(flow.onPinChange).toHaveBeenLastCalledWith(null);
		expect(store.load(PIN)).toBeNull();
	});

	it("a removed player gets no final screen (spec 011)", async () => {
		const api = new FakeJoinApi();
		const store = memoryStore();
		const first = renderFlow({ api, store });
		await joinAs(first, "ACT");
		const player = api.players.get("p1");
		if (player) {
			player.removed = true;
		}
		api.finished = true;
		first.unmount();

		renderFlow({ api, store, pin: PIN });

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Ah, não! Você foi expulso do jogo.",
		);
		expect(screen.queryByRole("heading", { name: "Imbatível!" })).toBeNull();
	});

	it("a finished game does not keep its PIN from being typed again", async () => {
		const api = new FakeJoinApi();
		const store = memoryStore();
		const first = renderFlow({ api, store });
		await joinAs(first, "ACT");
		api.finished = true;
		first.unmount();

		const { user } = renderFlow({ api, store });
		// The game is over, so the way back is not offered (RN-44a).
		await screen.findByRole("textbox", { name: "PIN" });
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

	it("shows the points and the total at the results, and keeps them in the scoreboard (spec 010)", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("answering"));
		await flow.user.click(red());
		const total = () =>
			document.querySelector('[data-slot="player-total"]')?.textContent;
		expect(total()).toBe("0");

		flow.api.results.set("p1", "correct");
		flow.api.totals.set("p1", 639);
		moveTo(flow, stageOf("results"));

		expect(await screen.findByText("+ 639")).toBeVisible();
		expect(screen.getByText("Você está no pódio!")).toBeVisible();
		expect(total()).toBe("639");

		// The host shows the scoreboard: the phone keeps the result, with no flicker.
		moveTo(flow, stageOf("scoreboard"));
		expect(screen.getByRole("heading", { name: "Correto" })).toBeVisible();
		expect(screen.getByText("+ 639")).toBeVisible();

		// The total stays in the footer through the next question.
		moveTo(flow, stageOf("questionIntro", 1));
		expect(screen.getByRole("heading", { name: "Pergunta 2" })).toBeVisible();
		expect(total()).toBe("639");
	});

	it("a reload during the scoreboard shows the result again (spec 010)", async () => {
		const api = new FakeJoinApi();
		const store = memoryStore();
		const first = renderFlow({ api, store });
		await joinAs(first, "ACT");
		api.stage = stageOf("scoreboard");
		api.results.set("p1", "correct");
		api.totals.set("p1", 639);
		first.unmount();

		renderFlow({ api, store, pin: PIN });

		expect(await screen.findByText("+ 639")).toBeVisible();
		expect(screen.getByRole("heading", { name: "Correto" })).toBeVisible();
	});

	it("the countdown does not go back when the device asks again (spec 012)", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("questionIntro"));
		const timer = () => screen.getByRole("timer", { name: "Tempo de leitura" });
		expect(timer()).toHaveTextContent("5");

		// The check's answer says the 5 s are whole again, as a late answer
		// would: the screen keeps the time it was already counting.
		await act(() =>
			vi.advanceTimersByTimeAsync(PLAY_CHECK_INTERVAL_MS - 1_000),
		);
		expect(timer()).toHaveTextContent("1");
		await act(() => vi.advanceTimersByTimeAsync(1_200));

		expect(timer()).toHaveTextContent("0");
	});
});

describe("JoinFlow: coming back to a game (spec 008, RN-44a)", () => {
	/** A player who joined and then left the page, with the game still there. */
	async function leftTheGame() {
		const api = new FakeJoinApi();
		const store = memoryStore();
		const first = renderFlow({ api, store });
		await joinAs(first, "ACT");
		first.unmount();
		return { api, store };
	}
	const comeBack = () =>
		screen.findByRole("button", { name: "Voltar como ACT" });

	it("offers to come back as the same player while in the lobby", async () => {
		const { api, store } = await leftTheGame();

		const flow = renderFlow({ api, store });

		expect(await comeBack()).toBeVisible();
		expect(screen.queryByRole("textbox", { name: "PIN" })).toBeNull();

		await flow.user.click(await comeBack());

		expect(
			await screen.findByText("Pronto! Está vendo seu apelido na tela?"),
		).toBeVisible();
		expect(flow.onPinChange).toHaveBeenLastCalledWith(PIN);
		// The same player, not a new one.
		expect(api.players.size).toBe(1);
	});

	it("comes back to where the game is", async () => {
		const { api, store } = await leftTheGame();
		api.stage = stageOf("answering");

		const flow = renderFlow({ api, store });
		await flow.user.click(await comeBack());

		expect(
			await screen.findByRole("button", { name: "Triângulo vermelho" }),
		).toBeVisible();
	});

	it("shows the PIN step at once to who was in no game", () => {
		renderFlow();

		expect(pinField()).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Voltar como/ })).toBeNull();
	});

	it.each([
		[
			"finished",
			(api: FakeJoinApi) => {
				api.finished = true;
			},
		],
		[
			"ended",
			(api: FakeJoinApi) => {
				api.ended = true;
			},
		],
		[
			"left by removal",
			(api: FakeJoinApi) => {
				const player = api.players.get("p1");
				if (player) {
					player.removed = true;
				}
			},
		],
	])("does not offer it once the game is %s", async (_state, change) => {
		const { api, store } = await leftTheGame();
		change(api);

		renderFlow({ api, store });

		expect(await screen.findByRole("textbox", { name: "PIN" })).toBeVisible();
		expect(screen.queryByRole("button", { name: /Voltar como/ })).toBeNull();
		// Nobody asked anything: there is no message to show.
		expect(screen.getByRole("alert").textContent).toBe("");
		expect(store.last()).toBeNull();
	});

	it("lets the player enter another PIN instead", async () => {
		const { api, store } = await leftTheGame();
		const flow = renderFlow({ api, store });
		await comeBack();

		await flow.user.click(
			screen.getByRole("button", { name: "Entrar com outro PIN" }),
		);

		expect(pinField()).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Voltar como/ })).toBeNull();
	});

	it("goes straight back with the PIN in the address, without asking", async () => {
		const { api, store } = await leftTheGame();

		renderFlow({ api, store, pin: PIN });

		expect(
			await screen.findByText("Pronto! Está vendo seu apelido na tela?"),
		).toBeVisible();
	});

	it("stops offering after the player leaves the final screen", async () => {
		const { api, store } = await leftTheGame();
		api.finished = true;
		const flow = renderFlow({ api, store, pin: PIN });
		await flow.user.click(
			await screen.findByRole("button", { name: "Entrar em outro jogo" }),
		);
		flow.unmount();

		renderFlow({ api, store });

		expect(pinField()).toBeInTheDocument();
		expect(store.last()).toBeNull();
	});
});

describe("JoinFlow: connection (spec 013)", () => {
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
	const bar = () => document.querySelector('[data-slot="connection-bar"]');
	const pass = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
	const AWAY = HOST_AWAY_AFTER_MS + 2_000;

	/** In a game at the answers of the first question, with the clock in hand. */
	async function playing() {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, stageOf("answering"));
		return flow;
	}

	/** The same, with the host's screen silent for longer than the limit. */
	async function withHostAway() {
		const flow = await playing();
		flow.api.hostIdleMs = AWAY;
		await pass(PLAY_CHECK_INTERVAL_MS);
		return flow;
	}

	it("shows O anfitrião se desconectou when the session tells the host is away", async () => {
		await withHostAway();

		expect(bar()).toHaveTextContent("Conexão perdida");
		expect(bar()).toHaveTextContent("O anfitrião se desconectou");
		expect(screen.getByRole("button", { name: "Sair" })).toBeEnabled();
	});

	it("shows no bar while the host is signalling", async () => {
		const flow = await playing();
		flow.api.hostIdleMs = 4_000;

		await pass(PLAY_CHECK_INTERVAL_MS);

		expect(bar()).toBeNull();
	});

	it("the bar shows in the lobby too", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		flow.api.hostIdleMs = AWAY;

		await pass(SESSION_CHECK_INTERVAL_MS);

		expect(bar()).toHaveTextContent("O anfitrião se desconectou");
		expect(
			screen.getByText("Pronto! Está vendo seu apelido na tela?"),
		).toBeVisible();
	});

	it("asks again when the host's silence would reach 10 s", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		const session = vi.spyOn(flow.api, "session");

		// In the lobby the usual check is 15 s away: too late to tell at 10 s.
		await pass(HOST_AWAY_AFTER_MS - 500);
		expect(session).not.toHaveBeenCalled();

		flow.api.hostIdleMs = HOST_AWAY_AFTER_MS + 100;
		await pass(1_000);

		expect(session).toHaveBeenCalledTimes(1);
		expect(bar()).toHaveTextContent("O anfitrião se desconectou");
	});

	it("the bar goes away with host-back and with a new stage", async () => {
		const flow = await withHostAway();

		flow.api.hostIdleMs = 0;
		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.hostBack, {}),
		);
		// The bar leaves moving: it is gone a moment later.
		await waitFor(() => expect(bar()).toBeNull());

		// Away again, and back by moving the game on.
		flow.api.hostIdleMs = AWAY;
		await pass(PLAY_CHECK_INTERVAL_MS);
		expect(bar()).not.toBeNull();

		flow.api.hostIdleMs = 0;
		moveTo(flow, stageOf("results"));

		await waitFor(() => expect(bar()).toBeNull());
	});

	it("the bar goes away when the session tells the host is back", async () => {
		const flow = await withHostAway();

		flow.api.hostIdleMs = 500;
		await pass(PLAY_CHECK_INTERVAL_MS);

		expect(bar()).toBeNull();
	});

	it("an answer is sent with the bar showing", async () => {
		const flow = await withHostAway();

		await flow.user.click(red());

		expect(flow.api.answers).toEqual([
			{ playerId: "p1", questionIndex: 0, choiceIds: ["choice-1"] },
		]);
		expect(answerButtons()).toHaveLength(0);
		expect(bar()).toHaveTextContent("O anfitrião se desconectou");
	});

	it("Sair keeps the session and offers the way back", async () => {
		const flow = await withHostAway();
		flow.api.totals.set("p1", 900);

		await flow.user.click(screen.getByRole("button", { name: "Sair" }));

		const back = await screen.findByRole("button", { name: "Voltar como ACT" });
		expect(flow.onPinChange).toHaveBeenLastCalledWith(null);
		expect(flow.store.load(PIN)).not.toBeNull();
		expect(bar()).toBeNull();

		flow.api.hostIdleMs = 0;
		await flow.user.click(back);

		expect(
			await screen.findByRole("button", { name: "Triângulo vermelho" }),
		).toBeVisible();
		expect(
			document.querySelector('[data-slot="player-total"]'),
		).toHaveTextContent("900");
		// The same player, not a new one.
		expect(flow.api.players.size).toBe(1);
	});

	it("no bar on the final screen", async () => {
		const flow = await withHostAway();

		flow.api.finished = true;
		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.stageChanged, {
				status: "finished",
				stage: null,
			}),
		);
		await pass(1_000);

		expect(bar()).toBeNull();
	});

	it("a failed check shows Tentando reconectar…", async () => {
		const flow = await playing();
		flow.api.offline = true;

		await pass(PLAY_CHECK_INTERVAL_MS);

		expect(bar()).toHaveTextContent("Conexão perdida");
		expect(bar()).toHaveTextContent("Tentando reconectar…");
		// Present and usable; how it comes in is the browser's to draw.
		expect(screen.getByRole("button", { name: "Sair" })).toBeEnabled();
	});

	it("the browser going offline shows the bar at once", async () => {
		await playing();

		act(() => {
			window.dispatchEvent(new Event("offline"));
		});

		expect(bar()).toHaveTextContent("Tentando reconectar…");
	});

	it("the device's own connection comes before the host's", async () => {
		const flow = await withHostAway();
		flow.api.offline = true;

		await pass(PLAY_CHECK_INTERVAL_MS);

		expect(bar()).toHaveTextContent("Tentando reconectar…");
		expect(bar()).not.toHaveTextContent("O anfitrião se desconectou");
	});

	it("returns to the current stage as the same player", async () => {
		const flow = await playing();
		flow.api.offline = true;
		await pass(PLAY_CHECK_INTERVAL_MS);
		expect(bar()).not.toBeNull();

		// The game went on to the next question meanwhile.
		flow.api.stage = stageOf("answering", 1);
		flow.api.totals.set("p1", 900);
		flow.api.offline = false;
		await pass(PLAY_CHECK_INTERVAL_MS);

		expect(bar()).toBeNull();
		expect(answerButtons()).toHaveLength(4);
		expect(
			document.querySelector('[data-slot="question-number"]'),
		).toHaveTextContent("2");
		expect(
			document.querySelector('[data-slot="player-total"]'),
		).toHaveTextContent("900");
		expect(flow.api.players.size).toBe(1);
	});

	it("an ended game leads to the PIN when the device is back", async () => {
		const flow = await playing();
		flow.api.offline = true;
		await pass(PLAY_CHECK_INTERVAL_MS);

		flow.api.ended = true;
		flow.api.offline = false;
		await pass(PLAY_CHECK_INTERVAL_MS);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"O anfitrião encerrou o jogo.",
		);
		expect(pinField()).toBeVisible();
		expect(bar()).toBeNull();
	});

	it("an answer that got no reply shows Sua resposta não foi enviada. and the buttons again", async () => {
		const flow = await playing();
		flow.api.offline = true;

		await flow.user.click(red());

		// With the bar at the bottom, the notice shows at the top, once.
		const notice = await screen.findByText("Sua resposta não foi enviada.");
		expect(notice).toHaveAttribute("role", "alert");
		expect(notice).toHaveClass("top-16");
		expect(answerButtons()).toHaveLength(4);
		expect(flow.api.answers).toEqual([]);
		// The failure also tells that the connection is gone.
		expect(bar()).toHaveTextContent("Tentando reconectar…");
	});

	it("the answer can be sent again", async () => {
		const flow = await playing();
		flow.api.offline = true;
		await flow.user.click(red());
		await screen.findByText("Sua resposta não foi enviada.");

		flow.api.offline = false;
		await flow.user.click(red());

		expect(flow.api.answers).toEqual([
			{ playerId: "p1", questionIndex: 0, choiceIds: ["choice-1"] },
		]);
		expect(answerButtons()).toHaveLength(0);
		expect(screen.queryByText("Sua resposta não foi enviada.")).toBeNull();
	});
});

describe("JoinFlow: the avatar (spec 028)", () => {
	/** The avatar drawn in the waiting screen's card. */
	const cardImages = () =>
		[...screen.getByTestId("avatar-card").querySelectorAll("img")].map(
			(image) => image.getAttribute("src"),
		);

	it("the waiting screen shows the avatar card with the pencil", async () => {
		const flow = renderFlow();

		await joinAs(flow, "Ana");

		expect(cardImages()).toEqual([
			"/avatars/characters/moon.svg",
			"/avatars/accessories/fire.svg",
		]);
		expect(
			screen.getByRole("button", { name: "Editar avatar" }),
		).toBeInTheDocument();
	});

	it("enter sends the remembered avatar", async () => {
		const store = memoryStore();
		store.rememberAvatar({ character: "fox", accessory: null });
		const flow = renderFlow({ store });

		await joinAs(flow, "Ana");

		expect(flow.api.entered).toEqual([{ character: "fox", accessory: null }]);
		expect(cardImages()).toEqual(["/avatars/characters/fox.svg"]);
	});

	it("the pencil opens the editor, and a successful change is shown and remembered", async () => {
		const flow = renderFlow();
		await joinAs(flow, "Ana");

		await flow.user.click(
			screen.getByRole("button", { name: "Editar avatar" }),
		);
		await flow.user.click(await screen.findByRole("button", { name: "Tigre" }));
		await flow.user.click(screen.getByRole("button", { name: "Pronto" }));

		await waitFor(() =>
			expect(cardImages()[0]).toBe("/avatars/characters/tiger.svg"),
		);
		expect(flow.api.players.get("p1")?.avatar).toEqual({
			character: "tiger",
			accessory: "fire",
		});
		expect(flow.store.avatar()).toEqual({
			character: "tiger",
			accessory: "fire",
		});
	});

	it("the editor closes when the session says the avatar is fixed", async () => {
		const flow = renderFlow();
		await joinAs(flow, "Ana");
		await flow.user.click(
			screen.getByRole("button", { name: "Editar avatar" }),
		);
		expect(
			await screen.findByRole("button", { name: "Pronto" }),
		).toBeInTheDocument();

		flow.api.stage = {
			questionIndex: 0,
			questionCount: 2,
			phase: "gameIntro",
			durationMs: 3_000,
			question: null,
		};
		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.stageChanged, {
				status: "playing",
				stage: flow.api.stage,
			}),
		);

		await waitFor(() =>
			expect(screen.queryByRole("button", { name: "Pronto" })).toBeNull(),
		);
		expect(screen.queryByRole("button", { name: "Editar avatar" })).toBeNull();
	});

	it("characters-changed refetches the session and closes the editor", async () => {
		const flow = renderFlow();
		await joinAs(flow, "Ana");
		await flow.user.click(
			screen.getByRole("button", { name: "Editar avatar" }),
		);
		expect(
			await screen.findByRole("button", { name: "Pronto" }),
		).toBeInTheDocument();

		flow.api.charactersOn = false;
		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.charactersChanged, {
				on: false,
			}),
		);

		await waitFor(() =>
			expect(screen.queryByRole("button", { name: "Pronto" })).toBeNull(),
		);
		// Without avatar the waiting screen is the one of spec 008.
		expect(screen.queryByTestId("avatar-card")).toBeNull();
		expect(screen.queryByRole("button", { name: "Editar avatar" })).toBeNull();
		expect(
			screen.getByText("Pronto! Está vendo seu apelido na tela?"),
		).toBeInTheDocument();
	});

	it("a player sitting out can open the editor", async () => {
		const api = new FakeJoinApi();
		api.stage = {
			questionIndex: 0,
			questionCount: 2,
			phase: "answering",
			durationMs: 20_000,
			question: null,
		};
		const flow = renderFlow({ api });
		await typePin(flow.user, PIN);
		await flow.user.type(
			await screen.findByRole("textbox", { name: "Apelido" }),
			"Caio",
		);
		await flow.user.click(
			screen.getByRole("button", { name: "Ok, vamos lá!" }),
		);

		await flow.user.click(
			await screen.findByRole("button", { name: "Editar avatar" }),
		);

		expect(
			await screen.findByRole("button", { name: "Pronto" }),
		).toBeInTheDocument();
	});
});

describe("JoinFlow and assignments (spec 029, RN-20)", () => {
	it("an eight-digit PIN of an assignment goes to the activity", async () => {
		const api = new FakeJoinApi();
		api.assignments.set("04352236", "assignment-1");
		const flow = renderFlow({ api });

		await typePin(flow.user, "04352236");

		await waitFor(() =>
			expect(flow.onAssignment).toHaveBeenCalledWith("assignment-1"),
		);
		expect(api.finds).toEqual(["04352236"]);
	});

	it("the PIN field takes eight digits", async () => {
		const flow = renderFlow();
		const field = await screen.findByRole("textbox", { name: "PIN" });

		await flow.user.type(field, "0435223699");

		expect(field).toHaveValue("04352236");
	});

	it("an eight-digit PIN of nothing is a wrong PIN", async () => {
		const flow = renderFlow();

		await typePin(flow.user, "11112222");

		expect(
			await screen.findByText(
				"Não foi possível reconhecer o PIN do jogo. Verifique-o e tente de novo.",
			),
		).toBeInTheDocument();
		expect(flow.onAssignment).not.toHaveBeenCalled();
	});
});

describe("JoinFlow: type answers in a row (spec 031, RN-19)", () => {
	const typeAnswerAt = (questionIndex: number): PublicStage => ({
		...stageOf("answering", questionIndex),
		question: {
			type: "typeAnswer",
			selection: "single",
			slider: null,
			text: null,
			textFormatting: {},
			image: null,
			choices: [],
		},
	});
	function moveTo(flow: ReturnType<typeof renderFlow>, stage: PublicStage) {
		flow.api.stage = stage;
		act(() =>
			flow.subscriber.emit(gameChannel(GAME), GAME_EVENTS.stageChanged, {
				status: "playing",
				stage,
			}),
		);
	}

	it("the next type answer starts with an empty field", async () => {
		const flow = renderFlow();
		await joinAs(flow, "ACT");
		moveTo(flow, typeAnswerAt(0));
		await flow.user.type(
			await screen.findByRole("textbox", { name: "Sua resposta" }),
			"Goku{Enter}",
		);

		moveTo(flow, typeAnswerAt(1));

		expect(
			await screen.findByRole("textbox", { name: "Sua resposta" }),
		).toHaveValue("");
	});
});
