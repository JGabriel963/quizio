import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConnectedAgentsCard } from "./connected-agents-card";

const now = new Date("2026-10-28T12:00:00.000Z");
const claude = {
	id: "consent-1",
	agentName: "Claude Code",
	connectedAt: "2026-10-20T12:00:00.000Z",
	lastUsedAt: "2026-10-28T09:00:00.000Z",
};

describe("ConnectedAgentsCard (spec 044, RN-14, RN-16; CA-07)", () => {
	it("lists each agent with when it connected and its last use", () => {
		render(
			<ConnectedAgentsCard
				connections={[
					claude,
					{ ...claude, id: "consent-2", agentName: null, lastUsedAt: null },
				]}
				now={now}
				onDisconnect={async () => {}}
			/>,
		);

		expect(screen.getByText("Claude Code")).toBeInTheDocument();
		expect(screen.getByText("Último uso há 3 horas")).toBeInTheDocument();
		expect(screen.getByText("Agente sem nome")).toBeInTheDocument();
		expect(screen.getByText("Ainda não usado")).toBeInTheDocument();
		expect(screen.getAllByText(/^Conectado em /)).toHaveLength(2);
	});

	it("Desconectar asks first and then disconnects", async () => {
		const user = userEvent.setup();
		const onDisconnect = vi.fn(async () => {});
		render(
			<ConnectedAgentsCard
				connections={[claude]}
				now={now}
				onDisconnect={onDisconnect}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Desconectar Claude Code" }),
		);
		const dialog = screen.getByRole("alertdialog");
		expect(dialog).toHaveTextContent("Desconectar Claude Code?");
		expect(dialog).toHaveTextContent("Ele perde o acesso à sua conta na hora.");
		expect(onDisconnect).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "Desconectar" }));

		expect(onDisconnect).toHaveBeenCalledWith("consent-1");
	});

	it("a failure keeps the dialog open and tells", async () => {
		const user = userEvent.setup();
		render(
			<ConnectedAgentsCard
				connections={[claude]}
				now={now}
				onDisconnect={async () => {
					throw new Error("offline");
				}}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Desconectar Claude Code" }),
		);
		await user.click(screen.getByRole("button", { name: "Desconectar" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível desconectar o agente.",
		);
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();
	});
});
