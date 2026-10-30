import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { editorOf, formattedField } from "@/testing/formatted-text-editor";

import {
	FormattedTextField,
	type FormattedValue,
} from "./formatted-text-field";

/** Two answers, as the editor has them: each with its own editor and bar. */
async function renderTwo(first = "C = 2 × r") {
	const onChange = [
		vi.fn((_value: FormattedValue) => {}),
		vi.fn((_value: FormattedValue) => {}),
	];
	render(
		<>
			<button type="button">Fora</button>
			<FormattedTextField
				initialValue={{ text: first, formatting: {} }}
				maxLength={75}
				placeholder="Adicionar resposta 1"
				label="Resposta 1"
				toolbarLabel="Formatação da resposta 1"
				onChange={onChange[0]}
			/>
			<FormattedTextField
				initialValue={{ text: "Outra", formatting: {} }}
				maxLength={75}
				placeholder="Adicionar resposta 2"
				label="Resposta 2"
				toolbarLabel="Formatação da resposta 2"
				toolbarClassName="top-full mt-2"
				onChange={onChange[1]}
			/>
		</>,
	);
	const fields = await Promise.all(
		["Resposta 1", "Resposta 2"].map((name) =>
			formattedField(() => screen.getByRole("textbox", { name })),
		),
	);
	return { fields, onChange, user: userEvent.setup() };
}

const toolbarOf = (position: number) =>
	screen.queryByRole("toolbar", { name: `Formatação da resposta ${position}` });

describe("FormattedTextField (spec 048)", () => {
	it("shows the toolbar only while the field or the toolbar has the focus", async () => {
		const { fields, user } = await renderTwo();
		const [first, second] = fields as [HTMLElement, HTMLElement];
		expect(screen.queryByRole("toolbar")).toBeNull();

		act(() => first.focus());
		expect(toolbarOf(1)).toBeInTheDocument();
		expect(toolbarOf(2)).toBeNull();

		act(() => second.focus());
		expect(toolbarOf(1)).toBeNull();
		expect(toolbarOf(2)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Fora" }));
		expect(screen.queryByRole("toolbar")).toBeNull();
	});

	it("clicking a button keeps the focus", async () => {
		const { fields, user } = await renderTwo();
		const [first] = fields as [HTMLElement];
		act(() => first.focus());

		await user.click(
			within(toolbarOf(1) as HTMLElement).getByRole("button", {
				name: "Negrito",
			}),
		);

		expect(first).toHaveFocus();
		expect(toolbarOf(1)).toBeInTheDocument();
	});

	it("toolbarClassName places the toolbar", async () => {
		const { fields } = await renderTwo();
		const [first, second] = fields as [HTMLElement, HTMLElement];

		act(() => first.focus());
		expect(toolbarOf(1)).toHaveClass("bottom-full");
		act(() => second.focus());
		expect(toolbarOf(2)).toHaveClass("top-full");
		expect(toolbarOf(2)).not.toHaveClass("bottom-full");
	});

	it("a picked symbol goes into this field at the cursor", async () => {
		const { fields, onChange, user } = await renderTwo();
		const [first, second] = fields as [HTMLElement, HTMLElement];
		act(() => {
			first.focus();
			// After the "2": 5 in the text, 6 in the document.
			editorOf(first).commands.setTextSelection(6);
		});

		await user.click(screen.getByRole("button", { name: "Símbolos" }));
		const dialog = screen.getByRole("dialog", { name: "Insira um símbolo" });
		await user.click(within(dialog).getByRole("tab", { name: "Matemática" }));
		await user.click(within(dialog).getByRole("button", { name: "π" }));

		expect(first).toHaveTextContent("C = 2π × r");
		expect(second).toHaveTextContent("Outra");
		expect(onChange[0]).toHaveBeenLastCalledWith({
			text: "C = 2π × r",
			formatting: {},
		});
		expect(onChange[1]).not.toHaveBeenCalled();
	});

	it("a symbol that does not fit changes nothing", async () => {
		const full = "a".repeat(75);
		const { fields, user } = await renderTwo(full);
		const [first] = fields as [HTMLElement];
		act(() => {
			first.focus();
			editorOf(first).commands.setTextSelection(10);
		});

		await user.click(screen.getByRole("button", { name: "Símbolos" }));
		await user.click(
			within(screen.getByRole("dialog")).getByRole("button", { name: "Ç" }),
		);

		expect(first).toHaveTextContent(full);
	});

	it("closing the dialog gives the focus back to this field", async () => {
		const { fields, user } = await renderTwo();
		const [first] = fields as [HTMLElement];
		act(() => {
			first.focus();
			editorOf(first).commands.setTextSelection(6);
		});

		await user.click(screen.getByRole("button", { name: "Símbolos" }));
		await user.click(
			within(screen.getByRole("dialog")).getByRole("button", {
				name: "Cancelar",
			}),
		);

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(first).toHaveFocus();
		expect(editorOf(first).state.selection.from).toBe(6);
	});
});
