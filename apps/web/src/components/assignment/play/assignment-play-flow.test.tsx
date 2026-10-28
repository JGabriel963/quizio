import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AssignmentCoverData, AssignmentPlayData } from "@/lib/api-types";
import { createAssignmentSessionStore } from "@/lib/assignment-session";
import {
	type AssignmentPlayApi,
	AssignmentPlayFlow,
} from "./assignment-play-flow";
import { RESULT_SHOW_MS } from "./play-result";

const GAME = "game-1";
const SESSION = { gameId: GAME, playerId: "me", secret: "s3cret" };

const cover: AssignmentCoverData = {
	status: "open",
	name: "Capitais",
	creatorName: "Ana",
	remainingMs: 2 * 86_400_000,
	participantCount: 0,
	participants: [],
	coverUrl: null,
	questionCount: 2,
	themeId: "standard",
	customTheme: null,
};

const question = (index: number, text: string) => ({
	index,
	type: "quiz" as const,
	selection: "single" as const,
	slider: null,
	text,
	image: null,
	choices: [
		{ id: `q${index}-a`, shapeIndex: 0, text: "Brasília" },
		{ id: `q${index}-b`, shapeIndex: 1, text: "Recife" },
	],
});

const resultOf = (index: number, text: string, answered: boolean) => ({
	question: question(index, text),
	chosenIds: answered ? [`q${index}-a`] : [],
	rightIds: [`q${index}-a`],
	typedText: null,
	sliderValue: null,
	sliderAnswer: null,
	rightOrder: [],
	acceptedAnswers: [],
	result: answered ? ("correct" as const) : ("unanswered" as const),
	points: answered ? 950 : 0,
});

const me = (total: number) => ({
	playerId: "me",
	nickname: "John",
	avatar: null,
	total,
	rank: 1,
	climbed: false,
	previous: null,
});

function viewWith(screen: AssignmentPlayData["screen"]): AssignmentPlayData {
	return {
		themeId: "standard",
		customTheme: null,
		nickname: "John",
		avatar: null,
		questionCount: 2,
		activity: { name: "Capitais", creatorName: "Ana", remainingMs: 86_400_000 },
		endedEarly: false,
		screen,
		history: [],
	};
}

const answering = (remainingMs: number | null = 20_000) =>
	viewWith({
		phase: "answering",
		question: question(0, "Qual é a capital do Brasil?"),
		remainingMs,
		durationMs: remainingMs === null ? null : 20_000,
	});

/** A scripted server: each procedure answers what the test set. */
function fakeApi(overrides: Partial<AssignmentPlayApi> = {}) {
	const api: AssignmentPlayApi = {
		cover: vi.fn(async () => cover),
		join: vi.fn(async () => ({
			playerId: "me",
			secret: "s3cret",
			nickname: "John",
		})),
		play: vi.fn(async () => answering()),
		start: vi.fn(async () => answering()),
		answer: vi.fn(async () =>
			viewWith({
				phase: "results",
				result: resultOf(0, "Qual é a capital do Brasil?", true),
				total: 950,
			}),
		),
		advance: vi.fn(async () =>
			viewWith({
				phase: "scoreboard",
				questionIndex: 0,
				scoreboard: { top: [me(950)], viewer: null },
			}),
		),
		setAvatar: vi.fn(async ({ avatar }) => ({ avatar })),
		resume: vi.fn(async () => ({
			playerId: "me",
			secret: "s3cret",
			nickname: "John",
		})),
		...overrides,
	};
	return api;
}

function memoryStore(
	saved: (typeof SESSION & { nickname?: string }) | null = null,
) {
	const items = new Map<string, string>();
	const store = createAssignmentSessionStore({
		getItem: (key) => items.get(key) ?? null,
		setItem: (key, value) => void items.set(key, value),
		removeItem: (key) => void items.delete(key),
	});
	if (saved) {
		store.save(saved);
	}
	return store;
}

function renderFlow(api: AssignmentPlayApi, store = memoryStore()) {
	const onLeave = vi.fn();
	render(
		<AssignmentPlayFlow
			gameId={GAME}
			api={api}
			store={store}
			onLeave={onLeave}
		/>,
	);
	return { onLeave, store, user: userEvent.setup() };
}

describe("AssignmentPlayFlow theme (spec 042, RN-15)", () => {
	const shownThemes = () =>
		[...document.querySelectorAll('[data-slot="game-screen"]')].map((node) =>
			node.getAttribute("data-theme"),
		);

	it("the cover and the game use the assignment's theme", async () => {
		const api = fakeApi({
			cover: vi.fn(async () => ({ ...cover, themeId: "lilac" as const })),
			play: vi.fn(async () => ({
				...viewWith({ phase: "ready" }),
				themeId: "lilac" as const,
			})),
		});
		const { user } = renderFlow(api);

		await screen.findByRole("button", { name: "Iniciar" });
		expect(shownThemes()).toEqual(["lilac"]);
		await user.click(screen.getByRole("button", { name: "Iniciar" }));
		await user.type(
			screen.getByRole("textbox", { name: "Insira um apelido" }),
			"John",
		);
		await user.click(screen.getByRole("button", { name: "Ok, vamos lá!" }));

		await screen.findByRole("button", { name: /Começar|Iniciar|Pronto/ });
		expect(new Set(shownThemes())).toEqual(new Set(["lilac"]));
	});
});

describe("AssignmentPlayFlow custom theme (spec 043)", () => {
	it("the cover and the game wear the assignment's custom look", async () => {
		const look = {
			pattern: "tiles" as const,
			backgroundColor: "#1b2a6b",
			imageUrl: null,
			imageTone: null,
			accentColor: "#ffd84d",
			logoUrl: null,
		};
		const api = fakeApi({
			cover: vi.fn(async () => ({ ...cover, customTheme: look })),
			play: vi.fn(async () => ({
				...viewWith({ phase: "ready" }),
				customTheme: look,
			})),
		});
		renderFlow(api);

		await screen.findByRole("button", { name: "Iniciar" });
		expect(
			document
				.querySelector('[data-slot="game-screen"]')
				?.getAttribute("data-theme"),
		).toBe("custom");
	});
});

describe("AssignmentPlayFlow (spec 030)", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("after the result's animation, Pontuações comes by itself", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const api = fakeApi({
			play: vi.fn(async () =>
				viewWith({
					phase: "results",
					result: resultOf(0, "Qual é a capital do Brasil?", true),
					total: 950,
				}),
			),
		});
		renderFlow(api, memoryStore(SESSION));

		expect(await screen.findByText("Correto")).toBeInTheDocument();
		expect(api.advance).not.toHaveBeenCalled();
		await act(() => vi.advanceTimersByTimeAsync(RESULT_SHOW_MS));

		expect(api.advance).toHaveBeenCalledWith({
			...SESSION,
			from: { questionIndex: 0, phase: "results" },
		});
		expect(
			await screen.findByRole("list", { name: "Pontuações" }),
		).toBeInTheDocument();
	});

	it("without a session: cover → nickname → first question", async () => {
		const api = fakeApi();
		const { store, user } = renderFlow(api);

		await user.click(await screen.findByRole("button", { name: "Iniciar" }));
		await user.type(
			screen.getByRole("textbox", { name: "Insira um apelido" }),
			"John",
		);
		await user.click(screen.getByRole("button", { name: "Ok, vamos lá!" }));

		expect(
			await screen.findByRole("heading", {
				name: "Qual é a capital do Brasil?",
			}),
		).toBeInTheDocument();
		expect(api.join).toHaveBeenCalledWith({
			gameId: GAME,
			nickname: "John",
			avatar: null,
		});
		expect(store.load(GAME)).toEqual({ ...SESSION, nickname: "John" });
	});

	it("with a session: Você é John?, and Sim goes where John was", async () => {
		const api = fakeApi({
			play: vi.fn(async () =>
				viewWith({
					phase: "scoreboard",
					questionIndex: 0,
					scoreboard: { top: [me(950)], viewer: null },
				}),
			),
		});
		const { user } = renderFlow(
			api,
			memoryStore({ ...SESSION, nickname: "John" }),
		);

		expect(
			await screen.findByRole("heading", { name: "Você é John?" }),
		).toBeInTheDocument();
		expect(api.play).not.toHaveBeenCalled();
		await user.click(screen.getByRole("button", { name: "Sim" }));

		expect(
			await screen.findByRole("list", { name: "Pontuações" }),
		).toBeInTheDocument();
		expect(api.resume).toHaveBeenCalledWith({ gameId: GAME, nickname: "John" });
		await user.click(screen.getByRole("button", { name: "Próximo" }));
		expect(api.advance).toHaveBeenCalledWith({
			...SESSION,
			from: { questionIndex: 0, phase: "scoreboard" },
		});
	});

	it("Não forgets John in this browser and asks for another nickname", async () => {
		const api = fakeApi();
		const { store, user } = renderFlow(
			api,
			memoryStore({ ...SESSION, nickname: "John" }),
		);

		await user.click(await screen.findByRole("button", { name: "Não" }));

		expect(
			await screen.findByRole("textbox", { name: "Insira um apelido" }),
		).toBeInTheDocument();
		expect(store.load(GAME)).toBeNull();
		expect(api.resume).not.toHaveBeenCalled();
	});

	it("a nickname in use asks Você é…? and Sim resumes it", async () => {
		const api = fakeApi({
			join: vi.fn(async () => {
				throw Object.assign(new Error("taken"), {
					data: { domainCode: "GAME.NICKNAME_TAKEN" },
				});
			}),
		});
		const { store, user } = renderFlow(api);

		await user.click(await screen.findByRole("button", { name: "Iniciar" }));
		await user.type(
			screen.getByRole("textbox", { name: "Insira um apelido" }),
			"john",
		);
		await user.click(screen.getByRole("button", { name: "Ok, vamos lá!" }));
		await user.click(await screen.findByRole("button", { name: "Sim" }));

		expect(api.resume).toHaveBeenCalledWith({ gameId: GAME, nickname: "john" });
		expect(
			await screen.findByRole("heading", {
				name: "Qual é a capital do Brasil?",
			}),
		).toBeInTheDocument();
		expect(store.load(GAME)).toEqual({ ...SESSION, nickname: "John" });
	});

	it("a finished participant who comes back sees the end, without ←", async () => {
		const api = fakeApi({
			play: vi.fn(async () => ({
				...viewWith({
					phase: "finished",
					place: 1,
					total: 950,
					scoreboard: { top: [me(950)], viewer: null },
				}),
				history: [resultOf(0, "Primeira", true), resultOf(1, "Segunda", true)],
			})),
		});
		const { onLeave, user } = renderFlow(
			api,
			memoryStore({ ...SESSION, nickname: "John" }),
		);

		await user.click(await screen.findByRole("button", { name: "Sim" }));
		await user.click(
			await screen.findByRole("button", { name: "Entrar em outro jogo" }),
		);

		expect(screen.queryByRole("button", { name: "Anterior" })).toBeNull();
		expect(onLeave).toHaveBeenCalledOnce();
	});

	it("the screen asks again when the time runs out", async () => {
		const play = vi
			.fn<AssignmentPlayApi["play"]>()
			.mockResolvedValueOnce(answering(50))
			.mockResolvedValue(
				viewWith({
					phase: "results",
					result: resultOf(0, "Qual é a capital do Brasil?", false),
					total: 0,
				}),
			);
		renderFlow(fakeApi({ play }), memoryStore(SESSION));

		expect(
			await screen.findByText("Tempo esgotado", {}, { timeout: 3000 }),
		).toBeInTheDocument();
		expect(play).toHaveBeenCalledTimes(2);
	});

	it("a lost connection is told and the answer can be sent again", async () => {
		const answer = vi
			.fn<AssignmentPlayApi["answer"]>()
			.mockRejectedValueOnce(new TypeError("Failed to fetch"))
			.mockResolvedValue(
				viewWith({
					phase: "results",
					result: resultOf(0, "Qual é a capital do Brasil?", true),
					total: 950,
				}),
			);
		const { user } = renderFlow(fakeApi({ answer }), memoryStore(SESSION));

		await user.click(await screen.findByRole("button", { name: /Brasília/ }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Sua resposta não foi enviada.",
		);
		await user.click(screen.getByRole("button", { name: /Brasília/ }));

		await waitFor(() =>
			expect(screen.getByText("Correto")).toBeInTheDocument(),
		);
		expect(answer).toHaveBeenLastCalledWith({
			...SESSION,
			questionIndex: 0,
			choiceIds: ["q0-a"],
		});
	});
});
