import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TypedAnswerInput } from "./typed-answer-input";

function renderInput(initialText?: string) {
	const onSubmit = vi.fn();
	render(<TypedAnswerInput initialText={initialText} onSubmit={onSubmit} />);
	return { onSubmit, user: userEvent.setup() };
}

const field = () => screen.getByRole("textbox", { name: "Sua resposta" });
const send = () => screen.getByRole("button", { name: "Enviar" });

describe("TypedAnswerInput (spec 031, RN-17)", () => {
	it("Enviar is disabled while blank", async () => {
		const { user } = renderInput();
		expect(send()).toBeDisabled();

		await user.type(field(), "   ");

		expect(send()).toBeDisabled();
	});

	it("counts down from 20", async () => {
		const { user } = renderInput();
		expect(screen.getByText("20 caracteres restantes")).toBeInTheDocument();

		await user.type(field(), "the coloseum");

		expect(screen.getByText("8 caracteres restantes")).toHaveTextContent("8");
		await user.type(field(), "x".repeat(20));
		expect(field()).toHaveValue(`the coloseum${"x".repeat(8)}`);
	});

	it("sends the trimmed text once, also with Enter", async () => {
		const { onSubmit, user } = renderInput();

		await user.type(field(), "  Pedro {Enter}");

		expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Pedro");
	});

	it("gives the text back when it was not sent", () => {
		renderInput("Pedro");

		expect(field()).toHaveValue("Pedro");
		expect(send()).toBeEnabled();
	});
});
