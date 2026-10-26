import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { InviteDialog } from "./invite-dialog";

async function renderDialog(
	onReset: () => Promise<unknown> = async () => {},
	code = "code-a",
) {
	const user = userEvent.setup();
	const view = renderWithRouter(
		<InviteDialog
			open
			onClose={() => {}}
			origin="https://quizio.app"
			code={code}
			canReset
			onReset={onReset}
		/>,
	);
	const dialog = await screen.findByRole("dialog", {
		name: "Convidar usuários",
	});
	return { user, dialog, view };
}

describe("InviteDialog (spec 034, RN-21, RN-24)", () => {
	it("shows the link and copies it with Link copiado", async () => {
		const { user, dialog } = await renderDialog();

		const field = within(dialog).getByLabelText("Compartilhar link de convite");
		expect(field).toHaveValue("https://quizio.app/invite/code-a");
		expect(field).toHaveAttribute("readonly");
		await user.click(within(dialog).getByRole("button", { name: "Copiar" }));

		expect(await navigator.clipboard.readText()).toBe(
			"https://quizio.app/invite/code-a",
		);
		expect(await within(dialog).findByText("Link copiado")).toBeVisible();
	});

	it("explains Redefinir link in its help", async () => {
		const { dialog } = await renderDialog();

		expect(
			within(dialog).getByRole("button", {
				name: "Gera um novo link. O link atual deixa de funcionar.",
			}),
		).toBeVisible();
	});

	it("Redefinir link asks first and then resets", async () => {
		const onReset = vi.fn(async () => {});
		const { user, dialog } = await renderDialog(onReset);

		await user.click(
			within(dialog).getByRole("button", { name: "Redefinir link" }),
		);
		const confirm = await screen.findByRole("alertdialog", {
			name: "Redefinir o link de convite?",
		});
		expect(confirm).toHaveTextContent(
			"O link atual deixará de funcionar. Quem já entrou continua no grupo.",
		);
		await user.click(
			within(confirm).getByRole("button", { name: "Redefinir" }),
		);

		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it("cancelling the confirmation keeps the link", async () => {
		const onReset = vi.fn(async () => {});
		const { user, dialog } = await renderDialog(onReset);

		await user.click(
			within(dialog).getByRole("button", { name: "Redefinir link" }),
		);
		const confirm = await screen.findByRole("alertdialog");
		await user.click(within(confirm).getByRole("button", { name: "Cancelar" }));

		expect(onReset).not.toHaveBeenCalled();
		expect(
			within(dialog).getByLabelText("Compartilhar link de convite"),
		).toHaveValue("https://quizio.app/invite/code-a");
	});

	it("waits for the code before showing a link", async () => {
		renderWithRouter(
			<InviteDialog
				open
				onClose={() => {}}
				origin="https://quizio.app"
				code={null}
				canReset
				onReset={async () => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog");
		expect(
			within(dialog).getByRole("button", { name: "Copiar" }),
		).toBeDisabled();
	});

	it("no Redefinir link without canReset (spec 035, RN-11)", async () => {
		renderWithRouter(
			<InviteDialog
				open
				onClose={() => {}}
				origin="https://quizio.app"
				code="code-a"
				canReset={false}
				onReset={async () => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog");
		expect(
			within(dialog).getByLabelText("Compartilhar link de convite"),
		).toHaveValue("https://quizio.app/invite/code-a");
		expect(
			within(dialog).queryByRole("button", { name: "Redefinir link" }),
		).toBeNull();
	});
});
