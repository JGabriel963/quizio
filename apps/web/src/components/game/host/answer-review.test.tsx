import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TypedAnswerGroupData } from "@/lib/api-types";

import { AnswerReview } from "./answer-review";

const group = (
	text: string,
	count: number,
	overrides: Partial<TypedAnswerGroupData> = {},
): TypedAnswerGroupData => ({
	key: text.toLowerCase(),
	text,
	count,
	correct: false,
	accepted: false,
	similar: false,
	...overrides,
});

const groups = [
	group("Pedro", 1, { correct: true, accepted: true }),
	group("Pedra", 2, { similar: true }),
	group("Paulo", 1),
];

function renderReview(props: Partial<Parameters<typeof AnswerReview>[0]> = {}) {
	const onSubmit = vi.fn();
	const onCancel = vi.fn();
	render(
		<AnswerReview
			questionText="Quem andou sobre as águas?"
			questionFormatting={{}}
			groups={groups}
			busy={false}
			error={null}
			onSubmit={onSubmit}
			onCancel={onCancel}
			{...props}
		/>,
	);
	return { onSubmit, onCancel, user: userEvent.setup() };
}

const lane = (name: string) => screen.getByRole("list", { name });
const send = () => screen.getByRole("button", { name: "Enviar" });

describe("AnswerReview (spec 031, RN-27 to RN-29)", () => {
	it("the review shows the statement formatted (spec 047, RN-25)", () => {
		renderReview({
			questionText: "Quem andou sobre as águas?",
			questionFormatting: { italic: [[20, 25]] },
		});

		const heading = screen.getByRole("heading", {
			name: "Quem andou sobre as águas?",
		});
		expect(heading.querySelector("em")).toHaveTextContent("águas");
	});

	it("lists correct, similar and other answers with counts", () => {
		renderReview();

		expect(
			screen.getByText(
				"Clique nas respostas para marcá-las como corretas ou incorretas",
			),
		).toBeInTheDocument();
		expect(lane("Respostas corretas")).toHaveTextContent("Pedro1");
		expect(lane("Parecidas com as respostas corretas")).toHaveTextContent(
			"Pedra2",
		);
		expect(lane("Respostas incorretas")).toHaveTextContent("Paulo1");
		expect(send()).toBeDisabled();
	});

	it("marking moves the tag and leaves its place empty", async () => {
		const { user } = renderReview();

		await user.click(screen.getByRole("button", { name: /Pedra/ }));

		const moved = within(lane("Respostas corretas")).getByRole("button", {
			name: /Pedra/,
		});
		expect(moved).toHaveAttribute("aria-pressed", "true");
		expect(
			lane("Parecidas com as respostas corretas").querySelector(
				"[data-slot=review-gap]",
			),
		).not.toBeNull();
		expect(send()).toBeEnabled();
	});

	it("clicking twice puts it back and disables Enviar", async () => {
		const { user } = renderReview();

		await user.click(screen.getByRole("button", { name: /Pedra/ }));
		await user.click(screen.getByRole("button", { name: /Pedra/ }));

		expect(
			within(lane("Parecidas com as respostas corretas")).getByRole("button", {
				name: /Pedra/,
			}),
		).toHaveAttribute("aria-pressed", "false");
		expect(send()).toBeDisabled();
	});

	it("accepted answers do not move", async () => {
		const { user } = renderReview();

		const pedro = screen.getByRole("button", { name: /Pedro/ });
		expect(pedro).toBeDisabled();
		await user.click(pedro);

		expect(lane("Respostas corretas")).toHaveTextContent("Pedro");
		expect(send()).toBeDisabled();
	});

	it("Enviar sends the changes", async () => {
		const { onSubmit, user } = renderReview();

		await user.click(screen.getByRole("button", { name: /Pedra/ }));
		await user.click(send());

		expect(onSubmit).toHaveBeenCalledExactlyOnceWith([
			{ key: "pedra", correct: true },
		]);
	});

	it("Cancelar sends nothing", async () => {
		const { onSubmit, onCancel, user } = renderReview();

		await user.click(screen.getByRole("button", { name: /Pedra/ }));
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(onCancel).toHaveBeenCalledOnce();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("a failure keeps the review open with the message", () => {
		renderReview({ error: "Não foi possível revisar as respostas." });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Não foi possível revisar as respostas.",
		);
	});
});
