import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormattingToolbar } from "./formatting-toolbar";

const none = {
	bold: false,
	italic: false,
	subscript: false,
	superscript: false,
};

describe("FormattingToolbar (spec 047)", () => {
	it("has B, I, X₂, X², a separator and Ω, without f(x)", () => {
		render(
			<FormattingToolbar
				active={none}
				onToggle={() => {}}
				onSymbols={() => {}}
			/>,
		);
		const toolbar = screen.getByRole("toolbar", {
			name: "Formatação do enunciado",
		});

		expect(
			within(toolbar)
				.getAllByRole("button")
				.map((button) => button.getAttribute("aria-label")),
		).toEqual(["Negrito", "Itálico", "Subscrito", "Sobrescrito", "Símbolos"]);
		expect(within(toolbar).getByRole("separator")).toBeInTheDocument();
		expect(within(toolbar).queryByText("f(x)")).toBeNull();
	});

	it("a button is pressed while its mark is on", () => {
		render(
			<FormattingToolbar
				active={{ ...none, bold: true, superscript: true }}
				onToggle={() => {}}
				onSymbols={() => {}}
			/>,
		);

		expect(screen.getByRole("button", { name: "Negrito" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByRole("button", { name: "Itálico" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		expect(screen.getByRole("button", { name: "Sobrescrito" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("each button has its tooltip", async () => {
		const user = userEvent.setup();
		render(
			<FormattingToolbar
				active={none}
				onToggle={() => {}}
				onSymbols={() => {}}
			/>,
		);

		const tooltip = () =>
			document.querySelector('[data-slot="tooltip-content"]');

		await user.hover(screen.getByRole("button", { name: "Símbolos" }));
		await waitFor(() => expect(tooltip()).toHaveTextContent("Símbolos"));

		await user.hover(screen.getByRole("button", { name: "Subscrito" }));
		await waitFor(() => expect(tooltip()).toHaveTextContent("Subscrito"));
	});

	it("clicking a mark calls onToggle and Ω calls onSymbols", async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn();
		const onSymbols = vi.fn();
		render(
			<FormattingToolbar
				active={none}
				onToggle={onToggle}
				onSymbols={onSymbols}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Itálico" }));
		await user.click(screen.getByRole("button", { name: "Símbolos" }));

		expect(onToggle).toHaveBeenCalledWith("italic");
		expect(onSymbols).toHaveBeenCalledTimes(1);
	});

	it("a click does not take the focus", async () => {
		const user = userEvent.setup();
		render(
			<>
				<input aria-label="Pergunta" />
				<FormattingToolbar
					active={none}
					onToggle={() => {}}
					onSymbols={() => {}}
				/>
			</>,
		);
		const field = screen.getByRole("textbox", { name: "Pergunta" });
		field.focus();

		await user.click(screen.getByRole("button", { name: "Negrito" }));

		expect(field).toHaveFocus();
	});
});
