import type { TextFormatting } from "@quizio/core/shared/domain/text-formatting";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createSaveTracker, SaveTrackerProvider } from "@/lib/save-tracker";
import {
	editorOf,
	formattedField,
	typeInEditor,
} from "@/testing/formatted-text-editor";

import { QuestionTextField, type Statement } from "./question-text-field";

function field(
	initialText: string | null = null,
	{
		hint = false,
		formatting = {},
	}: { hint?: boolean; formatting?: TextFormatting } = {},
) {
	return (onSave: (statement: Statement) => Promise<unknown>) => (
		<QuestionTextField
			questionId="a"
			initialText={initialText}
			initialFormatting={formatting}
			hint={hint}
			onSave={onSave}
		/>
	);
}

async function renderField(...args: Parameters<typeof field>) {
	const tracker = createSaveTracker();
	const onSave = vi.fn(async (_statement: Statement) => {});
	render(
		<SaveTrackerProvider tracker={tracker}>
			<button type="button">Fora</button>
			{field(...args)(onSave)}
		</SaveTrackerProvider>,
	);
	const textbox = await formattedField(() =>
		screen.getByRole("textbox", { name: "Pergunta" }),
	);
	return {
		onSave,
		tracker,
		textbox,
		editor: editorOf(textbox),
		user: userEvent.setup(),
	};
}

const toolbar = () =>
	screen.queryByRole("toolbar", { name: "Formatação do enunciado" });

describe("QuestionTextField (spec 003, RN-10; spec 047)", () => {
	it("is a textbox named Pergunta", async () => {
		const { textbox } = await renderField("Capital?");

		expect(textbox).toHaveAttribute("contenteditable", "true");
		expect(textbox).toHaveAttribute(
			"aria-placeholder",
			"Comece a digitar a pergunta",
		);
		expect(textbox).toHaveTextContent("Capital?");
		expect(textbox).toHaveClass("font-normal", "overflow-y-auto");
		expect(textbox.className).toMatch(/max-h-/);
	});

	it("shows the toolbar only while the statement or the toolbar has focus", async () => {
		const { textbox, user } = await renderField("Capital?");
		expect(toolbar()).toBeNull();

		act(() => textbox.focus());
		expect(toolbar()).toBeInTheDocument();
		await user.click(
			within(toolbar() as HTMLElement).getByRole("button", {
				name: "Negrito",
			}),
		);
		expect(toolbar()).toBeInTheDocument();
		expect(textbox).toHaveFocus();

		await user.click(screen.getByRole("button", { name: "Fora" }));
		expect(toolbar()).toBeNull();
	});

	it("saves the text and its formatting after the pause and on blur", async () => {
		const { editor, onSave, textbox, tracker, user } = await renderField("");
		act(() => textbox.focus());

		typeInEditor(textbox, "Qual destas ");
		await user.click(screen.getByRole("button", { name: "Negrito" }));
		typeInEditor(textbox, "não");
		await user.click(screen.getByRole("button", { name: "Negrito" }));
		typeInEditor(textbox, " é capital?");
		await act(() => tracker.flush());

		expect(onSave).toHaveBeenLastCalledWith({
			text: "Qual destas não é capital?",
			formatting: { bold: [[12, 15]] },
		});
		expect(editor.isActive("bold")).toBe(false);
	});

	it("an empty statement saves no text and no formatting", async () => {
		const { editor, onSave, textbox, tracker } = await renderField("x", {
			formatting: { bold: [[0, 1]] },
		});
		act(() => textbox.focus());

		act(() => {
			editor.chain().selectAll().deleteSelection().run();
		});
		await act(() => tracker.flush());

		expect(onSave).toHaveBeenLastCalledWith({ text: null, formatting: {} });
	});

	it("the counter ignores the formatting", async () => {
		const { editor, textbox } = await renderField(
			"Texto normal, texto em negrito, texto em itálico e negrito",
		);
		act(() => textbox.focus());
		expect(screen.getByText("102 caracteres restantes")).toBeInTheDocument();

		act(() => {
			editor.chain().selectAll().toggleBold().run();
		});

		expect(screen.getByText("102 caracteres restantes")).toBeInTheDocument();
	});

	it("a picked symbol goes in at the cursor and the counter drops by one", async () => {
		const { editor, onSave, textbox, tracker, user } =
			await renderField("Quanto vale ?");
		act(() => {
			textbox.focus();
			editor.commands.setTextSelection(13);
		});
		expect(screen.getByText("147 caracteres restantes")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Símbolos" }));
		const dialog = screen.getByRole("dialog", { name: "Insira um símbolo" });
		await user.click(within(dialog).getByRole("tab", { name: "Matemática" }));
		await user.click(within(dialog).getByRole("button", { name: "π" }));
		await act(() => tracker.flush());

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(textbox).toHaveTextContent("Quanto vale π?");
		expect(onSave).toHaveBeenLastCalledWith({
			text: "Quanto vale π?",
			formatting: {},
		});
		expect(screen.getByText("146 caracteres restantes")).toBeInTheDocument();
	});

	it("a symbol replaces the selection and takes the marks where it goes", async () => {
		const { editor, onSave, textbox, tracker, user } = await renderField(
			"Custa 10 dólares",
			{
				formatting: { bold: [[0, 5]] },
			},
		);
		act(() => {
			textbox.focus();
			// "dólares": from 9 to 16 in the text, 10 to 17 in the document.
			editor.commands.setTextSelection({ from: 10, to: 17 });
		});

		await user.click(screen.getByRole("button", { name: "Símbolos" }));
		const dialog = screen.getByRole("dialog", { name: "Insira um símbolo" });
		await user.click(within(dialog).getByRole("tab", { name: "Moeda" }));
		await user.click(within(dialog).getByRole("button", { name: "$" }));
		act(() => {
			editor.commands.setTextSelection(4);
		});
		await user.click(screen.getByRole("button", { name: "Símbolos" }));
		await user.click(
			within(screen.getByRole("dialog")).getByRole("tab", { name: "Grego" }),
		);
		await user.click(
			within(screen.getByRole("dialog")).getByRole("button", { name: "Ω" }),
		);
		await act(() => tracker.flush());

		expect(onSave).toHaveBeenLastCalledWith({
			text: "CusΩta 10 $",
			formatting: { bold: [[0, 6]] },
		});
	});

	it("a symbol that does not fit changes nothing", async () => {
		const full = "a".repeat(160);
		const { editor, textbox, user } = await renderField(full);
		act(() => {
			textbox.focus();
			editor.commands.setTextSelection(81);
		});

		await user.click(screen.getByRole("button", { name: "Símbolos" }));
		await user.click(
			within(screen.getByRole("dialog")).getByRole("button", { name: "Ç" }),
		);

		expect(textbox).toHaveTextContent(full);
		expect(screen.getByText("0 caracteres restantes")).toBeInTheDocument();
	});

	it("closing the dialog gives the focus back to the field", async () => {
		const { editor, textbox, user } = await renderField("Quanto vale ?");
		act(() => {
			textbox.focus();
			editor.commands.setTextSelection(13);
		});

		await user.click(screen.getByRole("button", { name: "Símbolos" }));
		await user.click(
			within(screen.getByRole("dialog")).getByRole("button", {
				name: "Cancelar",
			}),
		);

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(textbox).toHaveFocus();
		expect(editor.state.selection.from).toBe(13);
		expect(textbox).toHaveTextContent("Quanto vale ?");
	});

	it("before the editor mounts, the statement shows formatted", () => {
		const html = renderToString(
			<SaveTrackerProvider tracker={createSaveTracker()}>
				{field("H2O", { formatting: { subscript: [[1, 2]] } })(async () => {})}
			</SaveTrackerProvider>,
		);

		expect(html).toContain("H<sub>2</sub>O");
	});

	it("hints an empty text only when asked to, and describes the field with it", async () => {
		const { textbox } = await renderField(null, { hint: true });

		expect(textbox).toHaveAccessibleDescription(
			"Nenhuma pergunta foi adicionada.",
		);
		typeInEditor(textbox, "Capital?");

		expect(screen.queryByText("Nenhuma pergunta foi adicionada.")).toBeNull();
	});

	it("shows no hint by default", async () => {
		await renderField();

		expect(screen.queryByText("Nenhuma pergunta foi adicionada.")).toBeNull();
	});

	it("an empty focused field shows the whole limit, and only while focused", async () => {
		const { textbox, user } = await renderField();
		expect(screen.queryByText(/caracteres restantes/)).toBeNull();

		act(() => textbox.focus());
		expect(screen.getByText("160 caracteres restantes")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Fora" }));
		expect(screen.queryByText(/caracteres restantes/)).toBeNull();
	});
});
