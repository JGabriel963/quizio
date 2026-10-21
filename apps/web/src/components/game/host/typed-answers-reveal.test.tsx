import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/testing/reduced-motion";

import { REVEAL_WRONG_MS, TypedAnswersReveal } from "./typed-answers-reveal";

const tags = [
	{ text: "Colosseum", count: 2, correct: true },
	{ text: "The Colosseum", count: 0, correct: true },
	{ text: "the coloseum", count: 1, correct: false },
];
const image = {
	url: "https://cdn.test/coliseu.png",
	placement: "media" as const,
	crop: null,
	altText: "O Coliseu",
};

afterEach(() => {
	vi.useRealTimers();
});

describe("TypedAnswersReveal (spec 031, RN-23 to RN-25)", () => {
	it("shows every tag, then only the correct ones with counts", async () => {
		vi.useFakeTimers();
		render(<TypedAnswersReveal tags={tags} image={null} seed="0" animate />);

		expect(
			screen.getByRole("list", { name: "Respostas enviadas" }),
		).toHaveTextContent("the coloseum");

		await act(() => vi.advanceTimersByTimeAsync(REVEAL_WRONG_MS));
		await act(() => vi.advanceTimersByTimeAsync(1_000));

		expect(
			screen.getByRole("heading", { name: "As respostas corretas são:" }),
		).toBeInTheDocument();
		expect(screen.queryByText("the coloseum")).toBeNull();
		expect(screen.getByText("2 jogadores")).toBeInTheDocument();
		expect(screen.getByText("0 jogadores")).toBeInTheDocument();
	});

	it("goes straight to the correct ones when mounted already in the results", () => {
		render(
			<TypedAnswersReveal tags={tags} image={null} seed="0" animate={false} />,
		);

		expect(
			screen.getByRole("heading", { name: "As respostas corretas são:" }),
		).toBeInTheDocument();
		expect(screen.queryByText("the coloseum")).toBeNull();
	});

	it("goes straight to the correct ones with reduced motion", () => {
		stubReducedMotion(true);
		render(<TypedAnswersReveal tags={tags} image={null} seed="0" animate />);

		expect(
			screen.getByRole("heading", { name: "As respostas corretas são:" }),
		).toBeInTheDocument();
	});

	it("Mostrar mídia swaps the tags for the image", async () => {
		const user = userEvent.setup();
		render(
			<TypedAnswersReveal tags={tags} image={image} seed="0" animate={false} />,
		);

		await user.click(screen.getByRole("button", { name: "Mostrar mídia" }));

		expect(screen.getByRole("img", { name: "O Coliseu" })).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "As respostas corretas são:" }),
		).toBeNull();

		await user.click(screen.getByRole("button", { name: "Ocultar mídia" }));

		expect(
			screen.getByRole("heading", { name: "As respostas corretas são:" }),
		).toBeInTheDocument();
	});
});
