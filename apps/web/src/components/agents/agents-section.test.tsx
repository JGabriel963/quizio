import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AgentsSection } from "./agents-section";

const empty = {
	serverUrl: "https://quizio.app/mcp",
	connections: [],
	keys: [],
	keyLimit: 20,
};

const actions = {
	onCreateKey: async () => ({
		key: {
			id: "k1",
			name: "x",
			start: "qz_abc123",
			createdAt: "2026-10-28T12:00:00.000Z",
			lastUsedAt: null,
		},
		secret: "qz_abc123secret",
	}),
	onRevokeKey: async () => {},
	onDisconnect: async () => {},
};

describe("AgentsSection (spec 044, RN-13; CA-30)", () => {
	it("shows the explanation, the server URL with Copiar and the tabs", async () => {
		const user = userEvent.setup();
		render(<AgentsSection access={empty} {...actions} />);

		expect(
			screen.getByText(
				/Conecte o ChatGPT, o Claude, o Codex ou outro agente de IA/,
			),
		).toBeInTheDocument();
		const address = screen.getByRole("group", { name: "Endereço do servidor" });
		expect(address).toHaveTextContent("https://quizio.app/mcp");
		expect(
			within(address).getByRole("button", { name: "Copiar" }),
		).toBeInTheDocument();

		const tabs = screen.getByRole("tablist", { name: "Como conectar" });
		expect(
			within(tabs)
				.getAllByRole("tab")
				.map((tab) => tab.textContent),
		).toEqual([
			"ChatGPT",
			"Claude",
			"Codex",
			"Cursor",
			"VS Code",
			"Gemini CLI",
			"Outro agente",
		]);
		await user.click(within(tabs).getByRole("tab", { name: "Codex" }));
		expect(screen.getByRole("tabpanel")).toHaveTextContent(
			"codex mcp add quizio --url https://quizio.app/mcp",
		);
	});

	it("empty states say Nenhum agente conectado. and Nenhuma chave criada.", () => {
		render(<AgentsSection access={empty} {...actions} />);

		expect(screen.getByText("Nenhum agente conectado.")).toBeInTheDocument();
		expect(screen.getByText("Nenhuma chave criada.")).toBeInTheDocument();
	});
});
