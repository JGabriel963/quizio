import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GroupDetailsDialog } from "./group-details-dialog";

async function renderDialog(
	onSave: (details: {
		name: string;
		description: string;
	}) => Promise<unknown> = async () => {},
) {
	const user = userEvent.setup();
	const onClose = vi.fn();
	render(
		<GroupDetailsDialog
			details={{ name: "Turma 7A", description: "Revisão" }}
			onClose={onClose}
			onSave={onSave}
		/>,
	);
	const dialog = await screen.findByRole("dialog", {
		name: "Nome e descrição",
	});
	return {
		user,
		dialog,
		onClose,
		name: within(dialog).getByLabelText("Nome"),
		description: within(dialog).getByLabelText("Descrição"),
		save: within(dialog).getByRole("button", { name: "Salvar" }),
	};
}

describe("GroupDetailsDialog (spec 035, RN-04)", () => {
	it("opens with the saved name and description", async () => {
		const { name, description } = await renderDialog();

		expect(name).toHaveValue("Turma 7A");
		expect(description).toHaveValue("Revisão");
	});

	it("disables Salvar without a name", async () => {
		const { user, name, save } = await renderDialog();

		await user.clear(name);
		expect(save).toBeDisabled();
		await user.type(name, "  ");
		expect(save).toBeDisabled();
	});

	it("stops the description at 500", async () => {
		const { user, dialog, description } = await renderDialog();

		await user.clear(description);
		await user.click(description);
		await user.paste("a".repeat(510));

		expect(description).toHaveValue("a".repeat(500));
		expect(within(dialog).getAllByText("0").length).toBeGreaterThan(0);
	});

	it("sends both, trimmed", async () => {
		const onSave = vi.fn(async () => {});
		const { user, name, description, save } = await renderDialog(onSave);

		await user.clear(name);
		await user.type(name, " Turma 7B ");
		await user.clear(description);
		await user.type(description, " Prova{Enter}de quinta ");
		await user.click(save);

		expect(onSave).toHaveBeenCalledWith({
			name: "Turma 7B",
			description: "Prova\nde quinta",
		});
	});

	it("shows the server's refusal beside the field", async () => {
		const { user, dialog, save } = await renderDialog(async () => {
			throw { data: { domainCode: "GROUP.INVALID_DESCRIPTION" } };
		});

		await user.click(save);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"A descrição deve ter até 500 caracteres.",
		);
	});

	it("Cancelar keeps the saved values", async () => {
		const onSave = vi.fn();
		const { user, dialog, name, onClose } = await renderDialog(onSave);

		await user.type(name, "X");
		await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

		expect(onClose).toHaveBeenCalled();
		expect(onSave).not.toHaveBeenCalled();
	});
});
