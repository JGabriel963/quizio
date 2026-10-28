import { describe, expect, it } from "vitest";

import { AGENT_TABS, agentInstructions } from "./agent-instructions";
import { connectedLabel, lastUseLabel } from "./agent-labels";

const URL = "https://quizio.app/mcp";

describe("agentInstructions (spec 044, RN-01, RN-13)", () => {
	it("the order is ChatGPT, Claude, Codex, Cursor, VS Code, Gemini CLI, Outro agente", () => {
		expect(agentInstructions(URL).map((agent) => agent.label)).toEqual([
			"ChatGPT",
			"Claude",
			"Codex",
			"Cursor",
			"VS Code",
			"Gemini CLI",
			"Outro agente",
		]);
		expect(AGENT_TABS).toHaveLength(7);
	});

	it("ChatGPT adds a custom MCP server from Plugins, as it was connected on 2026-10-28", () => {
		const chatgpt = agentInstructions(URL).find(({ id }) => id === "chatgpt");
		const steps = chatgpt?.steps.join(" ") ?? "";

		expect(steps).toContain(
			"Plugins e escolha Adicionar › Adicionar servidor MCP personalizado",
		);
		expect(steps).toContain("URL do servidor");
		expect(steps).toContain("OAuth");
		expect(steps).toContain("Entendo e quero continuar");
		// The free plan connected without it.
		expect(steps).not.toContain("Modo de desenvolvedor");
	});

	it("every reference agent and Outro agente has steps", () => {
		for (const agent of agentInstructions(URL)) {
			expect(agent.steps.length, agent.label).toBeGreaterThan(0);
		}
	});

	it("every agent shows the server URL in a command to copy", () => {
		for (const agent of agentInstructions(URL)) {
			expect(
				agent.commands.some((command) => command.code.includes(URL)),
				agent.label,
			).toBe(true);
		}
	});

	it("gives the commands of the agents that have one", () => {
		const codes = agentInstructions(URL).flatMap((agent) =>
			agent.commands.map((command) => command.code),
		);

		expect(codes).toContain(`claude mcp add --transport http quizio ${URL}`);
		expect(codes).toContain(`codex mcp add quizio --url ${URL}`);
		expect(codes).toContain(`gemini mcp add --transport http quizio ${URL}`);
	});
});

describe("agent labels", () => {
	const now = new Date("2026-10-28T12:00:00.000Z");

	it("says when an agent was last used, or that it was not yet", () => {
		expect(lastUseLabel(null, now)).toBe("Ainda não usado");
		expect(lastUseLabel(new Date("2026-10-28T11:59:40.000Z"), now)).toBe(
			"Último uso agora",
		);
		expect(lastUseLabel(new Date("2026-10-28T09:00:00.000Z"), now)).toBe(
			"Último uso há 3 horas",
		);
	});

	it("says the day it connected", () => {
		expect(connectedLabel(new Date("2026-10-28T12:00:00.000Z"))).toMatch(
			/^Conectado em \d{2}\/\d{2}\/2026$/,
		);
	});
});
