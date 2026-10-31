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
				label="Formatação do enunciado"
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
				label="Formatação do enunciado"
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
				label="Formatação do enunciado"
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
				label="Formatação do enunciado"
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
					label="Formatação do enunciado"
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

describe("FormattingToolbar on an answer (spec 048)", () => {
	it("the toolbar takes its label", () => {
		render(
			<FormattingToolbar
				label="Formatação da resposta 2"
				active={{
					bold: false,
					italic: false,
					subscript: false,
					superscript: false,
				}}
				onToggle={() => {}}
				onSymbols={() => {}}
			/>,
		);

		expect(
			screen.getByRole("toolbar", { name: "Formatação da resposta 2" }),
		).toBeInTheDocument();
	});
});

describe("FormattingToolbar with an image (spec 049, RN-05)", () => {
	it("with onImage, the first button is the image with its tip, and a click calls it", async () => {
		const onImage = vi.fn();
		render(
			<FormattingToolbar
				label="Formatação da resposta 1"
				active={none}
				onToggle={() => {}}
				onSymbols={() => {}}
				onImage={onImage}
			/>,
		);
		const buttons = within(
			screen.getByRole("toolbar", { name: "Formatação da resposta 1" }),
		).getAllByRole("button");

		expect(buttons[0]).toHaveAccessibleName(
			"Adicione imagem como resposta alternativa",
		);
		await userEvent.click(buttons[0] as HTMLElement);
		expect(onImage).toHaveBeenCalledOnce();
	});
});
