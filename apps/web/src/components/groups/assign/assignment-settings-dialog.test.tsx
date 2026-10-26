import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { AssignmentSettingsDialog } from "./assignment-settings-dialog";

const now = new Date(2026, 9, 26, 15, 1);
const setup = {
	maxDeadlineDays: 28,
	options: {
		gameCharacters: true,
		questionTimer: false,
		randomizeAnswers: true,
	},
};

async function renderDialog(
	onAssignNow: (input: unknown) => Promise<void> = async () => {},
	onAddMessage = vi.fn(),
) {
	const user = userEvent.setup();
	const onClose = vi.fn();
	renderWithRouter(
		<AssignmentSettingsDialog
			open
			setup={setup}
			now={now}
			onAssignNow={onAssignNow}
			onAddMessage={onAddMessage}
			onClose={onClose}
		/>,
	);
	const dialog = await screen.findByRole("dialog", {
		name: "Configurações da atividade atribuída",
	});
	return { user, dialog, onClose, onAddMessage };
}

describe("AssignmentSettingsDialog (spec 038, RN-07 to RN-10)", () => {
	it("starts in 3 days at 12:00 with the remembered options", async () => {
		const { dialog } = await renderDialog();

		expect(
			within(dialog).getByRole("combobox", { name: "Data" }),
		).toHaveTextContent("29 de outubro de 2026");
		expect(
			within(dialog).getByRole("combobox", { name: "Hora" }),
		).toHaveTextContent("12:00");
		expect(
			within(dialog).getByRole("switch", { name: "Timer da pergunta" }),
		).not.toBeChecked();
		expect(
			within(dialog).getByRole("switch", {
				name: "Ordem aleatória de respostas",
			}),
		).toBeChecked();
		expect(
			within(dialog).getByRole("switch", { name: "Personagens" }),
		).toBeChecked();
	});

	it("Gerador de apelido is Em breve; no participant limit", async () => {
		const { dialog } = await renderDialog();

		expect(
			within(dialog).getByRole("switch", { name: "Gerador de apelido" }),
		).toHaveAttribute("aria-disabled", "true");
		expect(within(dialog).getByText("Em breve")).toBeVisible();
		expect(within(dialog).queryByText(/Limite de participantes/)).toBeNull();
	});

	it("Atribuir agora sends the deadline and the options; Adicionar mensagem too", async () => {
		const onAssignNow = vi.fn(async () => {});
		const { user, dialog, onAddMessage } = await renderDialog(onAssignNow);

		await user.click(
			within(dialog).getByRole("switch", { name: "Personagens" }),
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Adicionar mensagem" }),
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Atribuir agora" }),
		);

		const expected = {
			deadline: new Date(2026, 9, 29, 12),
			options: {
				gameCharacters: false,
				questionTimer: false,
				randomizeAnswers: true,
			},
		};
		expect(onAddMessage).toHaveBeenCalledWith(expected);
		expect(onAssignNow).toHaveBeenCalledWith(expected);
	});

	it("a refused deadline shows under the fields and keeps the dialog", async () => {
		const { user, dialog, onClose } = await renderDialog(async () => {
			throw { data: { domainCode: "ASSIGNMENT.DEADLINE_PASSED" } };
		});

		await user.click(
			within(dialog).getByRole("button", { name: "Atribuir agora" }),
		);

		expect(await within(dialog).findByRole("alert")).toBeVisible();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("Fechar closes", async () => {
		const { user, dialog, onClose } = await renderDialog();

		await user.click(within(dialog).getByRole("button", { name: "Fechar" }));

		expect(onClose).toHaveBeenCalled();
	});
});
