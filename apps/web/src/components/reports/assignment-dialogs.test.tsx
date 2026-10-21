import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChangeDeadlineDialog } from "./change-deadline-dialog";
import { EndAssignmentDialog } from "./end-assignment-dialog";

const now = new Date(2026, 9, 19, 14, 11);

describe("ChangeDeadlineDialog (spec 029, RN-36, RN-43)", () => {
	function renderDialog(onSave = vi.fn(async () => {})) {
		const onOpenChange = vi.fn();
		render(
			<ChangeDeadlineDialog
				open
				onOpenChange={onOpenChange}
				deadline={new Date(2026, 9, 22, 12, 0)}
				now={now}
				maxDays={28}
				onSave={onSave}
			/>,
		);
		return { onSave, onOpenChange, user: userEvent.setup() };
	}

	it("opens with the current deadline", async () => {
		renderDialog();

		expect(
			await screen.findByRole("dialog", { name: "Alterar o prazo" }),
		).toHaveTextContent(
			"Os participantes devem completar o quiz atribuído até:",
		);
		expect(
			screen.getByRole("button", { name: "22 de outubro de 2026" }),
		).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("combobox", { name: "Tempo" })).toHaveTextContent(
			"12:00",
		);
	});

	it("Salvar sends the new deadline", async () => {
		const { onSave, onOpenChange, user } = renderDialog();

		await user.click(
			await screen.findByRole("button", { name: "29 de outubro de 2026" }),
		);
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(onSave).toHaveBeenCalledWith(new Date(2026, 9, 29, 12, 0));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("a failure keeps the old deadline and says so", async () => {
		const { onOpenChange, user } = renderDialog(
			vi.fn(async () => {
				throw new TypeError("Failed to fetch");
			}),
		);

		await user.click(await screen.findByRole("button", { name: "Salvar" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível alterar o prazo. Tente novamente.",
		);
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
	});
});

describe("EndAssignmentDialog (spec 029, RN-39)", () => {
	function renderDialog() {
		const onCancel = vi.fn();
		const onConfirm = vi.fn();
		render(
			<EndAssignmentDialog open onCancel={onCancel} onConfirm={onConfirm} />,
		);
		return { onCancel, onConfirm, user: userEvent.setup() };
	}

	it("asks before ending", async () => {
		renderDialog();

		const dialog = await screen.findByRole("alertdialog", {
			name: "Encerrar este quiz atribuído?",
		});
		expect(dialog).toHaveTextContent(
			"O link e o PIN não estarão mais disponíveis, e os jogadores não poderão entrar ou jogar este quiz atribuído.",
		);
	});

	it("Cancelar keeps it open", async () => {
		const { onCancel, onConfirm, user } = renderDialog();

		await user.click(await screen.findByRole("button", { name: "Cancelar" }));

		expect(onCancel).toHaveBeenCalled();
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("Encerrar agora ends it", async () => {
		const { onConfirm, user } = renderDialog();

		await user.click(
			await screen.findByRole("button", { name: "Encerrar agora" }),
		);

		expect(onConfirm).toHaveBeenCalledOnce();
	});
});
