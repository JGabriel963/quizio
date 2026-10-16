import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NewQuizDialog } from "./new-quiz-dialog";

function renderDialog() {
	const handlers = { onChoose: vi.fn(), onClose: vi.fn() };
	render(<NewQuizDialog open {...handlers} />);
	return { ...handlers, user: userEvent.setup() };
}

describe("NewQuizDialog (spec 027)", () => {
	it("offers topic, PDF and blank", async () => {
		const { onChoose, user } = renderDialog();

		expect(
			screen.getByRole("dialog", { name: "Criar um novo quiz" }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /PDF para quiz/ }));
		await user.click(screen.getByRole("button", { name: /Assunto > quiz/ }));

		expect(onChoose.mock.calls).toEqual([["pdf"], ["topic"]]);
	});

	it("blank and close leave the editor as it is", async () => {
		const { onChoose, onClose, user } = renderDialog();

		await user.click(screen.getByRole("button", { name: /Tela em branco/ }));
		await user.click(screen.getByRole("button", { name: "Fechar" }));

		expect(onChoose).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledTimes(2);
	});
});
