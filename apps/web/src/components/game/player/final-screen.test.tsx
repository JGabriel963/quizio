import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PlayerFinalData } from "@/lib/api-types";

import { FinalScreen } from "./final-screen";

const finalOf = (
	rank: number,
	overrides: Partial<PlayerFinalData> = {},
): PlayerFinalData => ({
	title: "Capitais",
	rank,
	total: 3127,
	revealRemainingMs: 0,
	...overrides,
});

function renderFinal(final: PlayerFinalData | null) {
	const onLeave = vi.fn();
	render(
		<FinalScreen
			nickname="Claude"
			final={final}
			receivedAt={Date.now()}
			onLeave={onLeave}
		/>,
	);
	return { onLeave };
}

const slot = (name: string) =>
	document.querySelector(`[data-slot="${name}"]`)?.textContent ?? null;
const medal = () =>
	(document.querySelector('[data-slot="medal"]') as HTMLElement | null)?.dataset
		.place ?? null;
const confetti = () => document.querySelector('[data-slot="confetti"]');
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

afterEach(() => {
	vi.useRealTimers();
});

describe("FinalScreen (spec 011)", () => {
	it("waits while the podium is revealed, then shows the place", async () => {
		vi.useFakeTimers();
		renderFinal(finalOf(1, { revealRemainingMs: 7_000 }));

		expect(screen.getByRole("status")).toHaveTextContent("Rufar dos tambores…");
		expect(medal()).toBeNull();
		await tick(6_500);
		expect(screen.getByRole("status")).toBeVisible();

		await tick(700);

		expect(screen.queryByRole("status")).toBeNull();
		expect(screen.getByRole("heading", { name: "Imbatível!" })).toBeVisible();
	});

	it("waits when the end came before the session told the place", () => {
		renderFinal(null);

		expect(screen.getByRole("status")).toHaveTextContent("Rufar dos tambores…");
		expect(slot("player-total")).toBeNull();
	});

	it("shows the first place with the medal, the title and the total", () => {
		renderFinal(finalOf(1));

		expect(slot("quiz-title")).toBe("Capitais");
		expect(medal()).toBe("1");
		expect(screen.getByRole("heading", { name: "Imbatível!" })).toBeVisible();
		expect(slot("player-nickname")).toBe("Claude");
		expect(slot("player-total")).toBe("3127");
	});

	it.each([
		[2, "Por pouco!"],
		[3, "No pódio!"],
	])("shows the medal and the phrase of place %i", (rank, phrase) => {
		renderFinal(finalOf(rank));

		expect(medal()).toBe(String(rank));
		expect(screen.getByRole("heading", { name: phrase })).toBeVisible();
	});

	it("shows the place outside the podium, without a medal", () => {
		renderFinal(finalOf(5, { total: 1500 }));

		expect(medal()).toBeNull();
		expect(
			screen.getByRole("heading", { name: "Você ficou em 5º lugar" }),
		).toBeVisible();
		expect(screen.getByText("Obrigado por jogar!")).toBeVisible();
		expect(slot("player-total")).toBe("1500");
	});

	it("celebrates the first place only as the reveal ends, not when reopened", async () => {
		vi.useFakeTimers();
		renderFinal(finalOf(1, { revealRemainingMs: 1_000 }));
		await tick(1_200);
		expect(confetti()).not.toBeNull();
	});

	it("shows the final at once when reopened, with no confetti", () => {
		renderFinal(finalOf(1));

		expect(screen.queryByRole("status")).toBeNull();
		expect(confetti()).toBeNull();
	});

	it("leads to another game", async () => {
		const { onLeave } = renderFinal(finalOf(4));

		await userEvent.click(
			screen.getByRole("button", { name: "Entrar em outro jogo" }),
		);

		expect(onLeave).toHaveBeenCalledOnce();
	});
});
