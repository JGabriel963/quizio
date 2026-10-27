import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { DeleteAccountSection } from "./delete-account-section";

const account = {
	userId: "ana",
	name: "Ana",
	email: "ana@quizio.test",
	photoUrl: null,
	hasPassword: true,
};

async function setup({
	hasPassword = true,
	onDelete = vi.fn(async () => {}),
} = {}) {
	const user = userEvent.setup();
	renderWithRouter(
		<DeleteAccountSection
			account={{ ...account, hasPassword }}
			onDelete={onDelete}
		/>,
	);
	await screen.findByText(
		"Ao excluir sua conta, você perderá o acesso a todos os quizzes que criou.",
	);
	return { user, onDelete };
}

async function openForm(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "Excluir conta" }));
	return screen.getByRole("combobox", { name: "Motivo para excluir a conta" });
}

describe("DeleteAccountSection (spec 039, RN-35 to RN-38)", () => {
	it("the eight reasons in order", async () => {
		const { user } = await setup();
		const reason = await openForm(user);

		expect(
			Array.from((reason as HTMLSelectElement).options).map(
				(option) => option.textContent,
			),
		).toEqual([
			"Escolha uma opção",
			"Tenho outra conta",
			"Quero criar um novo perfil",
			"Pensei que precisava de uma conta para jogar",
			"Falta de recursos",
			"Problemas técnicos",
			"Eu não uso esta conta",
			"O Quizio não era o que eu pensei que fosse",
			"Outro",
		]);
		expect(
			screen.getByText(/todos os quizzes, relatórios e grupos/),
		).toBeVisible();
	});

	it("Excluir conta disabled without a reason", async () => {
		const { user } = await setup();
		const reason = await openForm(user);
		const submit = screen.getByRole("button", { name: "Excluir conta" });

		expect(submit).toBeDisabled();
		await user.selectOptions(reason, "Problemas técnicos");
		expect(submit).toBeEnabled();
	});

	it("feedback stops at 1000", async () => {
		const { user } = await setup();
		await openForm(user);
		const feedback = screen.getByRole("textbox", {
			name: "Gostaria de compartilhar algum feedback? (opcional)",
		});

		await user.click(feedback);
		await user.paste("a".repeat(1005));

		expect((feedback as HTMLTextAreaElement).value).toHaveLength(1000);
	});

	it("Cancelar returns to the link", async () => {
		const { user } = await setup();
		await openForm(user);

		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(screen.queryByRole("combobox")).toBeNull();
		expect(screen.getByRole("button", { name: "Excluir conta" })).toBeVisible();
	});

	it("password confirmation and its error", async () => {
		const onDelete = vi
			.fn()
			.mockRejectedValueOnce({
				data: { domainCode: "IDENTITY.WRONG_PASSWORD" },
			})
			.mockResolvedValueOnce(undefined);
		const { user } = await setup({ onDelete });
		const reason = await openForm(user);
		await user.selectOptions(reason, "Eu não uso esta conta");
		await user.type(
			screen.getByRole("textbox", {
				name: "Gostaria de compartilhar algum feedback? (opcional)",
			}),
			"Obrigada",
		);
		await user.click(screen.getByRole("button", { name: "Excluir conta" }));

		const dialog = await screen.findByRole("alertdialog", {
			name: "Excluir sua conta?",
		});
		expect(dialog).toHaveTextContent(
			"Tudo o que você criou será excluído. Esta ação não pode ser desfeita.",
		);
		await user.type(screen.getByLabelText("Senha"), "errada");
		await user.click(
			screen.getByRole("button", { name: "Excluir minha conta" }),
		);
		expect(await screen.findByText("A senha está incorreta.")).toBeVisible();

		await user.clear(screen.getByLabelText("Senha"));
		await user.type(screen.getByLabelText("Senha"), "segredo-123");
		await user.click(
			screen.getByRole("button", { name: "Excluir minha conta" }),
		);

		await waitFor(() =>
			expect(onDelete).toHaveBeenLastCalledWith({
				reason: "notUsing",
				feedback: "Obrigada",
				confirmation: { kind: "password", password: "segredo-123" },
			}),
		);
	});

	it("Google-only enables only with the account's email", async () => {
		const { user, onDelete } = await setup({ hasPassword: false });
		const reason = await openForm(user);
		await user.selectOptions(reason, "Outro");
		await user.click(screen.getByRole("button", { name: "Excluir conta" }));

		const confirm = await screen.findByRole("button", {
			name: "Excluir minha conta",
		});
		const email = screen.getByLabelText("Digite seu e-mail para confirmar");
		await user.type(email, "outra@quizio.test");
		expect(confirm).toBeDisabled();
		await user.clear(email);
		await user.type(email, "ANA@quizio.test");
		expect(confirm).toBeEnabled();
		await user.click(confirm);

		await waitFor(() =>
			expect(onDelete).toHaveBeenCalledWith({
				reason: "other",
				feedback: null,
				confirmation: { kind: "email", email: "ANA@quizio.test" },
			}),
		);
	});
});
