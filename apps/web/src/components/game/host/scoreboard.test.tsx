import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ScoreboardEntryData } from "@/lib/api-types";
import { GAME_MOTION } from "@/lib/game-motion";
import { stubReducedMotion } from "@/testing/reduced-motion";

import { GameScreen } from "../game-screen";
import { SCOREBOARD_HOLD_MS, Scoreboard } from "./scoreboard";

const entry = (
	nickname: string,
	rank: number,
	total: number,
	previous: { rank: number; total: number } | null,
): ScoreboardEntryData => ({
	playerId: nickname.toLowerCase(),
	nickname,
	rank,
	total,
	climbed: previous !== null && rank < previous.rank,
	previous,
});

function renderBoard(
	entries: ScoreboardEntryData[],
	leavers: ScoreboardEntryData[] = [],
) {
	const onAdvance = vi.fn();
	render(
		<GameScreen>
			<Scoreboard
				entries={entries}
				leavers={leavers}
				busy={false}
				onAdvance={onAdvance}
			/>
		</GameScreen>,
	);
	return { onAdvance };
}

const board = () => screen.getByRole("list", { name: "Placar" });
/** Each row as "nickname total", in the order shown. */
const rows = () =>
	within(board())
		.getAllByRole("listitem")
		.map((row) => {
			const total = row.querySelector('[data-slot="scoreboard-total"]');
			return `${row.firstElementChild?.textContent} ${total?.textContent}`;
		});
const arrows = () =>
	document.querySelectorAll('[data-slot="scoreboard-climbed"]').length;
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
/** The whole sequence: the hold, the count and the rows settling. */
const SEQUENCE_MS = SCOREBOARD_HOLD_MS + GAME_MOTION.countMs + 1_000;

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("Scoreboard: the animation (spec 011)", () => {
	it("the points go up for who keeps the place", async () => {
		vi.useFakeTimers();
		renderBoard([
			entry("Ana", 1, 1340, { rank: 1, total: 639 }),
			entry("Bia", 2, 500, { rank: 2, total: 500 }),
		]);

		expect(rows()).toEqual(["Ana 639", "Bia 500"]);

		await tick(SEQUENCE_MS);

		expect(rows()).toEqual(["Ana 1340", "Bia 500"]);
		expect(arrows()).toBe(0);
	});

	it("opens as it was before the question, then ends with the new order and the arrow", async () => {
		vi.useFakeTimers();
		renderBoard([
			entry("Bia", 1, 701, { rank: 2, total: 0 }),
			entry("Ana", 2, 639, { rank: 1, total: 639 }),
		]);

		expect(rows()).toEqual(["Ana 639", "Bia 0"]);
		expect(arrows()).toBe(0);
		expect(board().dataset.step).toBe("before");

		// The points go up first, with the rows where they were.
		await tick(SCOREBOARD_HOLD_MS + GAME_MOTION.countMs - 1);
		expect(board().dataset.step).toBe("counting");
		expect(rows().map((row) => row.split(" ")[0])).toEqual(["Ana", "Bia"]);

		await tick(1_001);

		expect(board().dataset.step).toBe("after");
		expect(rows()).toEqual(["Bia 701", "Ana 639"]);
		expect(arrows()).toBe(1);
		const [leader, second] = within(board()).getAllByRole("listitem");
		expect(leader?.dataset.leader).toBe("true");
		expect(second?.dataset.leader).toBe("false");
	});

	it("a row comes into the five and another leaves", async () => {
		vi.useFakeTimers();
		renderBoard(
			[
				entry("Ana", 1, 700, { rank: 1, total: 700 }),
				entry("Bia", 2, 600, { rank: 2, total: 600 }),
				entry("Caio", 3, 500, { rank: 3, total: 500 }),
				entry("Gil", 4, 450, { rank: 6, total: 100 }),
				entry("Duda", 5, 400, { rank: 4, total: 400 }),
			],
			[entry("Eva", 6, 300, { rank: 5, total: 300 })],
		);

		expect(rows()).toEqual([
			"Ana 700",
			"Bia 600",
			"Caio 500",
			"Duda 400",
			"Eva 300",
		]);

		// Nobody on screen scored, so there is no count to wait for.
		await tick(SCOREBOARD_HOLD_MS + 50);
		expect(board().dataset.step).toBe("after");
		await tick(1_000);

		expect(rows()).toEqual([
			"Ana 700",
			"Bia 600",
			"Caio 500",
			"Gil 450",
			"Duda 400",
		]);
	});

	it("the first scoreboard counts up from zero, with no arrows", async () => {
		vi.useFakeTimers();
		renderBoard([entry("Ana", 1, 875, null), entry("Bia", 2, 700, null)]);

		expect(rows()).toEqual(["Ana 0", "Bia 0"]);

		await tick(SEQUENCE_MS);

		expect(rows()).toEqual(["Ana 875", "Bia 700"]);
		expect(arrows()).toBe(0);
	});

	it("stays still when nothing changed", () => {
		renderBoard([
			entry("Bia", 1, 1000, { rank: 1, total: 1000 }),
			entry("Ana", 2, 0, { rank: 2, total: 0 }),
		]);

		expect(board().dataset.step).toBe("after");
		expect(rows()).toEqual(["Bia 1000", "Ana 0"]);
	});

	it("advances in the middle of the animation", async () => {
		const { onAdvance } = renderBoard([
			entry("Bia", 1, 701, { rank: 2, total: 0 }),
			entry("Ana", 2, 639, { rank: 1, total: 639 }),
		]);
		expect(board().dataset.step).toBe("before");

		await userEvent.click(screen.getByRole("button", { name: "Avançar" }));

		expect(onAdvance).toHaveBeenCalledOnce();
	});

	it("shows the new state at once with reduced motion", () => {
		stubReducedMotion(true);
		renderBoard([
			entry("Bia", 1, 701, { rank: 2, total: 0 }),
			entry("Ana", 2, 639, { rank: 1, total: 639 }),
		]);

		expect(board().dataset.step).toBe("after");
		expect(rows()).toEqual(["Bia 701", "Ana 639"]);
		expect(arrows()).toBe(1);
	});
});
