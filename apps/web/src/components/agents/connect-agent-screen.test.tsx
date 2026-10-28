import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { ConnectAgentScreen } from "./connect-agent-screen";

const ready = {
	kind: "ready" as const,
	agentName: "Claude Code",
	returnDomain: "localhost",
	account: {
		userId: "ana",
		name: "Ana",
		email: "ana@quizio.test",
		photoUrl: null,
	},
};

function setup(
	overrides: Partial<Parameters<typeof ConnectAgentScreen>[0]> = {},
) {
	const props = {
		state: ready,
		onAllow: vi.fn(async () => {}),
		onCancel: vi.fn(async () => {}),
		onSwitchAccount: vi.fn(async () => {}),
		...overrides,
	};
	renderWithRouter(<ConnectAgentScreen {...props} />);
	return { ...props, user: userEvent.setup() };
}

describe("ConnectAgentScreen (spec 044, RN-03, RN-04; CA-01, CA-03, CA-04)", () => {
	it("shows the agent, the account, what it may and may not do and the return domain", async () => {
		setup();

		expect(
			await screen.findByRole("heading", {
				name: "Claude Code quer acessar sua conta do Quizio",
			}),
		).toBeInTheDocument();
		expect(screen.getByText("Ana")).toBeInTheDocument();
		expect(screen.getByText("ana@quizio.test")).toBeInTheDocument();
		expect(screen.getByText("O agente poderá:")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Criar, editar, publicar e excluir seus quizzes e temas",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText("Organizar partidas ao vivo e atribuições"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Ler, renomear e excluir seus relatórios"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Gerenciar seus grupos, membros e publicações"),
		).toBeInTheDocument();
		expect(screen.getByText("Ler suas notificações")).toBeInTheDocument();
		expect(
			screen.getByText(
				"O agente não poderá excluir sua conta nem trocar sua senha.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText("Depois, você volta para localhost."),
		).toBeInTheDocument();
	});

	it("Permitir and Cancelar call their actions and disable while sending", async () => {
		let finish = () => {};
		const onAllow = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		);
		const { user, onCancel } = setup({ onAllow });

		await user.click(await screen.findByRole("button", { name: "Permitir" }));
		expect(onAllow).toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Permitir" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
		finish();

		await vi.waitFor(() =>
			expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled(),
		);
		await user.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(onCancel).toHaveBeenCalled();
	});

	it("Usar outra conta calls its action", async () => {
		const { user, onSwitchAccount } = setup();

		await user.click(
			await screen.findByRole("button", { name: "Usar outra conta" }),
		);

		expect(onSwitchAccount).toHaveBeenCalled();
	});

	it("the invalid state shows the message and Ir para o início, without Permitir", async () => {
		setup({ state: { kind: "invalid" } });

		expect(
			await screen.findByText("Este pedido de conexão não é válido."),
		).toBeInTheDocument();
		expect(screen.getByText("Ir para o início").closest("a")).toHaveAttribute(
			"href",
			"/",
		);
		expect(screen.queryByRole("button", { name: "Permitir" })).toBeNull();
	});
});
