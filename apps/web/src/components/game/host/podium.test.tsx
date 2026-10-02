import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { HostFinalData, HostGameData } from "@/lib/api-types";
import { stubReducedMotion } from "@/testing/reduced-motion";

import { Podium, type PodiumActions } from "./podium";

const NAMES = ["Caio", "Ana", "Fábio", "Bia", "Eva", "Duda", "Gil"];
const TOTALS = [975, 950, 925, 900, 875, 850, 0];

function finalOf(players: number, revealRemainingMs: number): HostFinalData {
	return {
		standings: NAMES.slice(0, players).map((nickname, index) => ({
			playerId: `p${index + 1}`,
			nickname,
			total: TOTALS[index] ?? 0,
			rank: index + 1,
		})),
		revealRemainingMs,
	};
}

const game: HostGameData = {
	gameId: "game-1",
	quizId: "quiz-1",
	title: "Capitais",
	pin: "265914",
	status: "finished",
	endReason: null,
	locked: false,
	players: NAMES.map((nickname, index) => ({ id: `p${index + 1}`, nickname })),
	questionCount: 3,
	stage: null,
	final: null,
};

function renderPodium(
	final: HostFinalData,
	props: Partial<Parameters<typeof Podium>[0]> = {},
) {
	const actions: PodiumActions = { playAgain: vi.fn(), exit: vi.fn() };
	render(
		<Podium
			game={game}
			final={final}
			receivedAt={Date.now()}
			playingAgain={false}
			playAgainError={null}
			actions={actions}
			{...props}
		/>,
	);
	return { actions };
}

/** Who stands on each step, by place; null for a step nobody is on (yet). */
function steps(): Record<string, string | null> {
	const podium = screen.getByRole("list", { name: "Pódio" });
	return Object.fromEntries(
		within(podium)
			.getAllByRole("listitem")
			.map((step) => {
				const player = step.querySelector('[data-slot="podium-player"]');
				const total = step.querySelector('[data-slot="podium-total"]');
				return [
					step.dataset.place,
					player ? `${player.textContent} ${total?.textContent}` : null,
				];
			}),
	);
}
const confetti = () => document.querySelector('[data-slot="confetti"]');
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const action = (name: string) => screen.queryByRole("button", { name });

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("Podium: the reveal (spec 011)", () => {
	it("shows the title and nobody before two seconds", async () => {
		vi.useFakeTimers();
		renderPodium(finalOf(7, 7_000));

		expect(screen.getByRole("heading", { name: "Capitais" })).toBeVisible();
		await tick(1_900);

		expect(steps()).toEqual({ 1: null, 2: null, 3: null });
		expect(action("Jogar novamente")).toBeNull();
	});

	it("reveals third, second and first in order, the first with the confetti", async () => {
		vi.useFakeTimers();
		renderPodium(finalOf(7, 7_000));

		await tick(2_200);
		expect(steps()).toEqual({ 1: null, 2: null, 3: "Fábio 925" });

		await tick(2_000);
		expect(steps()).toEqual({ 1: null, 2: "Ana 950", 3: "Fábio 925" });
		expect(confetti()).toBeNull();
		expect(action("Jogar novamente")).toBeNull();

		await tick(3_000);
		expect(steps()).toEqual({
			1: "Caio 975",
			2: "Ana 950",
			3: "Fábio 925",
		});
		expect(confetti()).not.toBeNull();
		// Only the first three: the others are in the standings.
		expect(screen.queryByText("Bia")).toBeNull();
	});

	it("goes on from where the reveal is after a reload", async () => {
		vi.useFakeTimers();
		renderPodium(finalOf(7, 4_500));

		await tick(100);
		expect(steps()).toEqual({ 1: null, 2: null, 3: "Fábio 925" });

		await tick(1_700);
		expect(steps()).toMatchObject({ 2: "Ana 950", 1: null });
	});

	it("leaves the steps without a player empty", () => {
		renderPodium(finalOf(2, 0));
		expect(steps()).toEqual({ 1: "Caio 975", 2: "Ana 950", 3: null });
	});

	it("shows only the first place when one player played", () => {
		renderPodium(finalOf(1, 0));
		expect(steps()).toEqual({ 1: "Caio 975", 2: null, 3: null });
	});

	it("shows the whole podium when reopened, without the celebration again", () => {
		renderPodium(finalOf(7, 0));

		expect(steps()).toEqual({
			1: "Caio 975",
			2: "Ana 950",
			3: "Fábio 925",
		});
		expect(confetti()).toBeNull();
		expect(action("Jogar novamente")).toBeVisible();
	});

	it("still shows one place at a time with reduced motion, without confetti", async () => {
		stubReducedMotion(true);
		vi.useFakeTimers();
		renderPodium(finalOf(3, 7_000));

		await tick(2_200);
		expect(steps()).toEqual({ 1: null, 2: null, 3: "Fábio 925" });

		await tick(5_000);
		expect(steps()).toMatchObject({ 1: "Caio 975" });
		expect(confetti()).toBeNull();
	});
});

describe("Podium: after the reveal (spec 011)", () => {
	it("offers the actions once the first place shows", async () => {
		vi.useFakeTimers();
		renderPodium(finalOf(3, 7_000));

		await tick(6_500);
		expect(action("Classificação")).toBeNull();

		await tick(700);
		for (const name of ["Classificação", "Jogar novamente", "Voltar ao quiz"]) {
			expect(action(name)).toBeVisible();
		}
	});

	it("shows the full standings and goes back to the podium", async () => {
		renderPodium(finalOf(7, 0));

		await userEvent.click(
			screen.getByRole("button", { name: "Classificação" }),
		);

		const standings = within(
			screen.getByRole("list", { name: "Classificação final" }),
		).getAllByRole("listitem");
		expect(standings.map((row) => row.textContent)).toEqual([
			"1ºCaioPontos: 975",
			"2ºAnaPontos: 950",
			"3ºFábioPontos: 925",
			"4ºBiaPontos: 900",
			"5ºEvaPontos: 875",
			"6ºDudaPontos: 850",
			"7ºGilPontos: 0",
		]);
		expect(screen.queryByRole("list", { name: "Pódio" })).toBeNull();

		await userEvent.click(
			screen.getByRole("button", { name: "Voltar ao pódio" }),
		);

		expect(screen.getByRole("list", { name: "Pódio" })).toBeVisible();
	});

	it("does not celebrate again when coming back from the standings", async () => {
		vi.useFakeTimers();
		renderPodium(finalOf(3, 7_000));
		await tick(7_200);
		expect(confetti()).not.toBeNull();
		vi.useRealTimers();

		await userEvent.click(
			screen.getByRole("button", { name: "Classificação" }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Voltar ao pódio" }),
		);

		expect(steps()).toEqual({
			1: "Caio 975",
			2: "Ana 950",
			3: "Fábio 925",
		});
		expect(confetti()).toBeNull();
	});

	it("plays again", async () => {
		const { actions } = renderPodium(finalOf(3, 0));

		await userEvent.click(
			screen.getByRole("button", { name: "Jogar novamente" }),
		);

		expect(actions.playAgain).toHaveBeenCalledOnce();
	});

	it("waits while the new game is being opened", () => {
		renderPodium(finalOf(3, 0), { playingAgain: true });

		expect(action("Jogar novamente")).toBeDisabled();
	});

	it("tells when the quiz cannot be played anymore, and stays on the podium", () => {
		renderPodium(finalOf(3, 0), {
			playAgainError: "Este quiz não pode mais ser jogado.",
		});

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Este quiz não pode mais ser jogado.",
		);
		expect(screen.getByRole("list", { name: "Pódio" })).toBeVisible();
	});

	it("leaves without asking, by the header or by Voltar ao quiz", async () => {
		const { actions } = renderPodium(finalOf(3, 0));

		await userEvent.click(screen.getByRole("button", { name: "Sair" }));
		await userEvent.click(
			screen.getByRole("button", { name: "Voltar ao quiz" }),
		);

		expect(actions.exit).toHaveBeenCalledTimes(2);
		expect(screen.queryByText("Encerrar o jogo?")).toBeNull();
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
