import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
	type FinishingTouches,
	FinishingTouchesDialog,
} from "./finishing-touches-dialog";

function renderDialog({
	initialDescription = null,
	result = null,
}: {
	initialDescription?: string | null;
	result?: string | null;
} = {}) {
	const props = {
		onCancel: vi.fn(),
		onSubmit: vi.fn(async (_touches: FinishingTouches) => result),
	};
	render(
		<FinishingTouchesDialog
			open
			initialDescription={initialDescription}
			{...props}
		/>,
	);
	return { props, user: userEvent.setup() };
}

const title = () => screen.getByRole("textbox", { name: "Título" });
const description = () =>
	screen.getByRole("textbox", { name: "Descrição (Opcional)" });
const continueButton = () => screen.getByRole("button", { name: "Continuar" });
const remaining = (field: "no título" | "na descrição") =>
	screen.getByRole("status", { name: `Caracteres restantes ${field}` });

describe("FinishingTouchesDialog", () => {
	it("opens empty, with the title focused and Continuar unavailable", () => {
		renderDialog();

		expect(
			screen.getByRole("heading", { name: "Toques finais" }),
		).toBeInTheDocument();
		expect(title()).toHaveValue("");
		expect(title()).toHaveFocus();
		expect(description()).toHaveValue("");
		expect(continueButton()).toBeDisabled();
	});

	it("shows the remaining characters and cuts at the limit", async () => {
		const { user } = renderDialog();
		expect(remaining("no título")).toHaveTextContent("95");
		expect(remaining("na descrição")).toHaveTextContent("500");

		await user.type(title(), "TESTE");
		expect(remaining("no título")).toHaveTextContent("90");

		await user.clear(title());
		await user.click(title());
		await user.paste("á".repeat(120));
		expect(title()).toHaveValue("á".repeat(95));
		expect(remaining("no título")).toHaveTextContent("0");

		await user.click(description());
		await user.paste("b".repeat(510));
		expect(description()).toHaveValue("b".repeat(500));
		expect(remaining("na descrição")).toHaveTextContent("0");
	});

	it("a title of spaces keeps Continuar unavailable; the description is optional", async () => {
		const { user } = renderDialog();

		await user.type(title(), "   ");
		expect(continueButton()).toBeDisabled();

		await user.type(title(), "Capitais");
		expect(continueButton()).toBeEnabled();
	});

	it("Continuar sends the trimmed title and description", async () => {
		const { props, user } = renderDialog();

		await user.type(title(), "  Capitais do mundo ");
		await user.type(description(), " Para a aula de geografia ");
		await user.click(continueButton());

		expect(props.onSubmit).toHaveBeenCalledExactlyOnceWith({
			title: "Capitais do mundo",
			description: "Para a aula de geografia",
		});
	});

	it("Enter in the title continues, and an empty description goes as null", async () => {
		const { props, user } = renderDialog();

		await user.type(title(), "Capitais{Enter}");

		expect(props.onSubmit).toHaveBeenCalledExactlyOnceWith({
			title: "Capitais",
			description: null,
		});
	});

	it("starts from the description the quiz already has", () => {
		renderDialog({ initialDescription: "Já escrita" });

		expect(description()).toHaveValue("Já escrita");
		expect(remaining("na descrição")).toHaveTextContent("490");
	});

	it("Cancelar leaves the draft untitled", async () => {
		const { props, user } = renderDialog();

		await user.type(title(), "Capitais");
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(props.onCancel).toHaveBeenCalledOnce();
		expect(props.onSubmit).not.toHaveBeenCalled();
	});

	it("shows why the quiz could not be saved", async () => {
		const { user } = renderDialog({
			result: "Não foi possível concluir. Tente novamente.",
		});

		await user.type(title(), "Capitais{Enter}");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível concluir. Tente novamente.",
		);
		expect(continueButton()).toBeEnabled();
	});
});
