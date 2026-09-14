import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
	QuizDetailsDialog,
	type QuizDetailsDialogProps,
} from "./quiz-details-dialog";

function renderDialog(overrides: Partial<QuizDetailsDialogProps> = {}) {
	const props: QuizDetailsDialogProps = {
		open: true,
		onOpenChange: vi.fn(),
		mode: "create",
		onSubmit: vi.fn(async () => ({ error: null })),
		uploadCover: vi.fn(),
		...overrides,
	};
	render(<QuizDetailsDialog {...props} />);
	return props;
}

describe("QuizDetailsDialog", () => {
	it("counts title and description characters and blocks saving above the limits", async () => {
		const user = userEvent.setup();
		const props = renderDialog();

		await user.type(screen.getByLabelText("Título"), "Bom");
		expect(screen.getByText("3/95")).toBeInTheDocument();

		await user.click(screen.getByLabelText("Título"));
		await user.paste("a".repeat(93));
		await user.click(screen.getByLabelText("Descrição"));
		await user.paste("d".repeat(501));
		await user.click(screen.getByRole("button", { name: "Criar quiz" }));

		expect(
			await screen.findByText("O título deve ter no máximo 95 caracteres."),
		).toBeInTheDocument();
		expect(
			screen.getByText("A descrição deve ter no máximo 500 caracteres."),
		).toBeInTheDocument();
		expect(props.onSubmit).not.toHaveBeenCalled();
	});

	it("creates a private quiz by default", async () => {
		const user = userEvent.setup();
		const props = renderDialog();

		await user.type(screen.getByLabelText("Título"), "Geografia");
		await user.click(screen.getByRole("button", { name: "Criar quiz" }));

		expect(props.onSubmit).toHaveBeenCalledWith({
			title: "Geografia",
			description: null,
			visibility: "private",
			cover: { type: "keep" },
		});
	});

	it("prefills the current details and saves the changes", async () => {
		const user = userEvent.setup();
		const props = renderDialog({
			mode: "edit",
			initialValues: {
				title: "Bom de Bíblia",
				description: "Atos 1 a 7",
				visibility: "private",
				coverImageUrl: null,
			},
		});

		expect(screen.getByLabelText("Título")).toHaveValue("Bom de Bíblia");
		await user.click(screen.getByRole("radio", { name: "Não listado" }));
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(props.onSubmit).toHaveBeenCalledWith({
			title: "Bom de Bíblia",
			description: "Atos 1 a 7",
			visibility: "unlisted",
			cover: { type: "keep" },
		});
	});

	it("shows the error returned by the server and keeps the dialog open", async () => {
		const user = userEvent.setup();
		const props = renderDialog({
			onSubmit: vi.fn(async () => ({
				error: { message: "Não foi possível salvar o quiz." },
			})),
		});

		await user.click(screen.getByRole("button", { name: "Criar quiz" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível salvar o quiz.",
		);
		expect(props.onOpenChange).not.toHaveBeenCalledWith(false);
	});
});
