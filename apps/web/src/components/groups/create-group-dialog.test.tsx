import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { CreateGroupDialog } from "./create-group-dialog";

async function renderDialog(
	onCreate: (name: string) => Promise<unknown> = async () => {},
) {
	const user = userEvent.setup();
	const onClose = vi.fn();
	renderWithRouter(
		<CreateGroupDialog open onClose={onClose} onCreate={onCreate} />,
	);
	const dialog = await screen.findByRole("dialog", { name: "Criar grupo" });
	const field = within(dialog).getByLabelText("Nome");
	const submit = within(dialog).getByRole("button", { name: "Criar grupo" });
	return { user, dialog, field, submit, onClose };
}

describe("CreateGroupDialog (spec 034, RN-11)", () => {
	it("disables Criar grupo while the name is blank", async () => {
		const { user, field, submit } = await renderDialog();

		expect(submit).toBeDisabled();
		await user.type(field, "   ");
		expect(submit).toBeDisabled();
		await user.type(field, "A");
		expect(submit).toBeEnabled();
	});

	it("counts down from 20 and stops at 20 characters", async () => {
		const { user, dialog, field } = await renderDialog();

		expect(within(dialog).getByText("20")).toBeVisible();
		await user.type(field, "Turma 7A");
		expect(within(dialog).getByText("12")).toBeVisible();
		await user.type(field, "x".repeat(20));
		expect(field).toHaveValue(`Turma 7A${"x".repeat(12)}`);
		expect(within(dialog).getByText("0")).toBeVisible();
	});

	it("sends the trimmed name", async () => {
		const onCreate = vi.fn(async () => {});
		const { user, field, submit } = await renderDialog(onCreate);

		await user.type(field, " Coral ");
		await user.click(submit);

		expect(onCreate).toHaveBeenCalledWith("Coral");
	});

	it("shows the server's refusal beside the field", async () => {
		const { user, dialog, field, submit } = await renderDialog(async () => {
			throw { data: { domainCode: "GROUP.INVALID_NAME" } };
		});

		await user.type(field, "Coral");
		await user.click(submit);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"O nome deve ter de 1 a 20 caracteres.",
		);
	});

	it("Cancelar closes", async () => {
		const { user, dialog, onClose } = await renderDialog();

		await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

		expect(onClose).toHaveBeenCalled();
	});
});
