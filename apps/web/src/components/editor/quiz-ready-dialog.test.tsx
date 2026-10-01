import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuizReadyDialog } from "./quiz-ready-dialog";

function renderDialog(open = true) {
	const props = { onBack: vi.fn(), onDone: vi.fn(), onHostLive: vi.fn() };
	render(<QuizReadyDialog open={open} {...props} />);
	return { props, user: userEvent.setup() };
}

describe("QuizReadyDialog", () => {
	it("shows the four options, the undelivered ones as coming soon", () => {
		renderDialog();

		expect(
			screen.getByRole("heading", { name: "O quiz está pronto" }),
		).toBeInTheDocument();
		const options = within(
			screen.getByRole("list", { name: "Próximos passos" }),
		).getAllByRole("listitem");
		expect(options.map((option) => option.textContent)).toEqual(
			[
				"Iniciar demonstraçãoExecute uma sessão de teste antes de apresentar ao vivoEm breve",
				"Organizar ao vivoApresente em uma tela grande",
				"PalestraApresentação de slides interativaEm breve",
				"CompartilharPermita que outros organizadores usem este quiz",
			].map((text, index) => (index === 3 ? `${text}Em breve` : text)),
		);
	});

	it("only Organizar ao vivo can be activated (spec 008, RN-03)", async () => {
		const { props, user } = renderDialog();

		expect(
			screen.getAllByRole("button").map((button) => button.textContent),
		).toEqual([
			"Organizar ao vivoApresente em uma tela grande",
			"Voltar para edição",
			"Pronto",
		]);
		expect(screen.queryByRole("link")).toBeNull();

		await user.click(screen.getByRole("button", { name: /Organizar ao vivo/ }));

		expect(props.onHostLive).toHaveBeenCalledOnce();
		expect(props.onDone).not.toHaveBeenCalled();
	});

	it("Pronto finishes", async () => {
		const { props, user } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Pronto" }));

		expect(props.onDone).toHaveBeenCalledOnce();
		expect(props.onBack).not.toHaveBeenCalled();
	});

	it("Voltar para edição and Esc stay in the editor", async () => {
		const { props, user } = renderDialog();

		await user.click(
			screen.getByRole("button", { name: "Voltar para edição" }),
		);
		await user.keyboard("{Escape}");

		expect(props.onBack).toHaveBeenCalledTimes(2);
		expect(props.onDone).not.toHaveBeenCalled();
	});

	it("is closed until the quiz is saved", () => {
		renderDialog(false);

		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
