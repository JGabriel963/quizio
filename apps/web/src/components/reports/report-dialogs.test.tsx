import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DeleteReportDialog } from "./delete-report-dialog";
import { RenameReportDialog } from "./rename-report-dialog";

describe("RenameReportDialog (spec 015)", () => {
	function renderDialog(onRename = vi.fn().mockResolvedValue(undefined)) {
		const onClose = vi.fn();
		render(
			<RenameReportDialog
				report={{ name: "Capitais" }}
				onClose={onClose}
				onRename={onRename}
			/>,
		);
		return {
			onClose,
			onRename,
			user: userEvent.setup(),
			field: () => screen.getByRole("textbox", { name: "Nome do relatório" }),
			submit: () => screen.getByRole("button", { name: "Renomear" }),
		};
	}

	it("starts with the current name", () => {
		const { field } = renderDialog();

		expect(field()).toHaveValue("Capitais");
	});

	it("sends the trimmed name", async () => {
		const { user, field, submit, onRename, onClose } = renderDialog();

		await user.clear(field());
		await user.type(field(), "  Capitais — Turma A  ");
		await user.click(submit());

		expect(onRename).toHaveBeenCalledWith("Capitais — Turma A");
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("tells why the name is not accepted", async () => {
		const { user, field, submit, onRename, onClose } = renderDialog();

		await user.clear(field());
		await user.click(submit());
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Dê um nome ao relatório.",
		);

		await user.type(field(), "a".repeat(96));
		await user.click(submit());
		expect(screen.getByRole("alert")).toHaveTextContent(
			"O nome deve ter no máximo 95 caracteres.",
		);
		expect(field()).toHaveAttribute("aria-invalid", "true");
		expect(onRename).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("an unchanged name closes without sending", async () => {
		const { user, submit, onRename, onClose } = renderDialog();

		await user.click(submit());

		expect(onRename).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("a failed rename keeps the dialog open and warns", async () => {
		const { user, field, submit, onClose } = renderDialog(
			vi.fn().mockRejectedValue(new Error("offline")),
		);

		await user.clear(field());
		await user.type(field(), "Turma A");
		await user.click(submit());

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível renomear o relatório. Tente novamente.",
		);
		expect(onClose).not.toHaveBeenCalled();
		expect(submit()).toBeEnabled();
	});
});

describe("DeleteReportDialog (spec 015)", () => {
	it("tells that the game and its answers will be deleted", () => {
		render(
			<DeleteReportDialog
				names={["Capitais"]}
				onCancel={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);

		const dialog = screen.getByRole("alertdialog");
		expect(dialog).toHaveTextContent("Excluir “Capitais” definitivamente?");
		expect(dialog).toHaveTextContent(
			"A partida e as respostas dela serão apagadas.",
		);
		expect(dialog).toHaveTextContent("Esta ação não pode ser desfeita.");
	});

	it("counts them when there are several", () => {
		render(
			<DeleteReportDialog
				names={["Capitais", "Química", "História"]}
				onCancel={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);

		expect(screen.getByRole("alertdialog")).toHaveTextContent(
			"Excluir 3 relatórios definitivamente?",
		);
	});

	it("cancelling the confirmation changes nothing", async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(
			<DeleteReportDialog
				names={["Capitais"]}
				onCancel={onCancel}
				onConfirm={onConfirm}
			/>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(onConfirm).not.toHaveBeenCalled();
		expect(onCancel).toHaveBeenCalled();
	});

	it("confirming deletes", async () => {
		const onConfirm = vi.fn();
		render(
			<DeleteReportDialog
				names={["Capitais"]}
				onCancel={vi.fn()}
				onConfirm={onConfirm}
			/>,
		);

		await userEvent.click(
			screen.getByRole("button", { name: "Excluir definitivamente" }),
		);

		expect(onConfirm).toHaveBeenCalledOnce();
	});

	it("stays closed without reports", () => {
		render(
			<DeleteReportDialog
				names={null}
				onCancel={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);

		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});
});
