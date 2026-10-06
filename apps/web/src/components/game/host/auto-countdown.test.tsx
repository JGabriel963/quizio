import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AutoCountdown } from "./auto-countdown";

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

afterEach(() => {
	vi.useRealTimers();
});

describe("AutoCountdown (spec 014)", () => {
	it("is a timer named after what it counts", () => {
		render(
			<AutoCountdown
				label="Inicia em"
				remainingMs={8_000}
				receivedAt={Date.now()}
			/>,
		);

		const timer = screen.getByRole("timer", { name: "Inicia em" });
		expect(timer).toHaveTextContent("8");
		// The unit is said, not shown.
		expect(timer).toHaveAccessibleDescription("segundos");
	});

	it("counts down in whole seconds", async () => {
		vi.useFakeTimers();
		render(
			<AutoCountdown
				label="Avança em"
				remainingMs={5_000}
				receivedAt={Date.now()}
			/>,
		);
		const shown = () =>
			document.querySelector('[data-slot="auto-countdown-seconds"]')
				?.textContent;

		expect(shown()).toBe("5");
		await tick(1_200);
		expect(shown()).toBe("4");
		await tick(3_000);
		expect(shown()).toBe("1");
	});

	it("shows 0 only when the time is up", async () => {
		vi.useFakeTimers();
		render(
			<AutoCountdown
				label="Avança em"
				remainingMs={1_000}
				receivedAt={Date.now()}
			/>,
		);
		const shown = () =>
			document.querySelector('[data-slot="auto-countdown-seconds"]')
				?.textContent;

		await tick(800);
		expect(shown()).toBe("1");
		await tick(400);
		expect(shown()).toBe("0");
	});

	it("goes on from the time the server told, not from the top", () => {
		// The screen was reloaded: 2 s are left, as told 500 ms ago.
		render(
			<AutoCountdown
				label="Avança em"
				remainingMs={2_000}
				receivedAt={Date.now() - 500}
			/>,
		);

		expect(screen.getByRole("timer", { name: "Avança em" })).toHaveTextContent(
			"2",
		);
	});

	it("does not animate with reduced motion", () => {
		render(
			<AutoCountdown
				label="Inicia em"
				remainingMs={8_000}
				receivedAt={Date.now()}
			/>,
		);

		const number = document.querySelector(
			'[data-slot="auto-countdown-seconds"]',
		);
		// Only where motion is welcome: the class itself carries the condition.
		expect(number).toHaveClass("motion-safe:animate-pop-in");
		expect(number).not.toHaveClass("animate-pop-in");
	});
});
