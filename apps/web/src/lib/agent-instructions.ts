/**
 * "Como conectar" in Agentes de IA (spec 044, RN-01, RN-13): the steps and
 * commands of each reference agent, with the server's address filled in.
 *
 * Checked on 2026-10-28 against each agent's documentation; menus and
 * commands change often, so check again when an agent changes them:
 * - Claude Code: `claude mcp add --transport http`, then /mcp › Authenticate
 *   (docs.anthropic.com/claude-code/mcp).
 * - claude.ai and Claude Desktop: Settings › Connectors › Add custom connector
 *   (support.claude.com, article 11175166).
 * - ChatGPT: Plugins › Adicionar › Adicionar servidor MCP personalizado, with
 *   the server URL and OAuth; followed step by step by the user on
 *   2026-10-28, on the free plan, with no developer mode.
 * - Codex: `codex mcp add <name> --url`, `codex mcp login`,
 *   `--bearer-token-env-var` (developers.openai.com/codex/mcp).
 * - Cursor: `mcpServers.<name>.url` in ~/.cursor/mcp.json (cursor.com/docs/mcp).
 * - VS Code: `servers.<name>` with `"type": "http"` in .vscode/mcp.json
 *   (code.visualstudio.com/docs/copilot/reference/mcp-configuration).
 * - Gemini CLI: `gemini mcp add --transport http`, then /mcp auth
 *   (geminicli.com/docs/tools/mcp-server).
 */
export const AGENT_TABS = [
	"chatgpt",
	"claude",
	"codex",
	"cursor",
	"vscode",
	"gemini",
	"other",
] as const;

export type AgentTab = (typeof AGENT_TABS)[number];

export interface AgentInstruction {
	id: AgentTab;
	label: string;
	steps: string[];
	commands: { label: string; code: string }[];
}

const json = (value: unknown) => JSON.stringify(value, null, 2);

export function agentInstructions(serverUrl: string): AgentInstruction[] {
	const address = { label: "Endereço", code: serverUrl };
	return [
		{
			id: "chatgpt",
			label: "ChatGPT",
			steps: [
				"Na barra lateral do ChatGPT, abra Plugins e escolha Adicionar › Adicionar servidor MCP personalizado.",
				"Dê o nome Quizio e, em Conexão › URL do servidor, cole o endereço abaixo. Em Autenticação, deixe OAuth.",
				"Marque Entendo e quero continuar e confirme.",
				"Na janela Conectar a Quizio, escolha Conectar e permita o acesso na tela do Quizio.",
			],
			commands: [address],
		},
		{
			id: "claude",
			label: "Claude",
			steps: [
				"No claude.ai ou no Claude Desktop: em Configurações › Conectores, escolha Adicionar conector personalizado, dê o nome Quizio e cole o endereço.",
				"Escolha Conectar e permita o acesso na tela do Quizio.",
				"No Claude Code: rode o comando abaixo, depois /mcp › quizio › Authenticate.",
			],
			commands: [
				address,
				{
					label: "Claude Code",
					code: `claude mcp add --transport http quizio ${serverUrl}`,
				},
			],
		},
		{
			id: "codex",
			label: "Codex",
			steps: [
				"Rode o primeiro comando no terminal.",
				"Depois, rode o segundo e permita o acesso na tela do Quizio.",
				"Com uma chave de acesso em vez disso, guarde-a na variável QUIZIO_ACCESS_KEY e use o terceiro comando.",
			],
			commands: [
				{ label: "Adicionar", code: `codex mcp add quizio --url ${serverUrl}` },
				{ label: "Conectar", code: "codex mcp login quizio" },
				{
					label: "Com chave de acesso",
					code: `codex mcp add quizio --url ${serverUrl} --bearer-token-env-var QUIZIO_ACCESS_KEY`,
				},
			],
		},
		{
			id: "cursor",
			label: "Cursor",
			steps: [
				"Acrescente o Quizio em ~/.cursor/mcp.json (ou em .cursor/mcp.json, só neste projeto).",
				"O Cursor abre a tela do Quizio para você permitir o acesso.",
			],
			commands: [
				{
					label: "mcp.json",
					code: json({ mcpServers: { quizio: { url: serverUrl } } }),
				},
			],
		},
		{
			id: "vscode",
			label: "VS Code",
			steps: [
				"Acrescente o Quizio em .vscode/mcp.json, ou use MCP: Add Server › HTTP na paleta de comandos.",
				"No primeiro uso, o VS Code abre a tela do Quizio para você permitir o acesso.",
			],
			commands: [
				{
					label: ".vscode/mcp.json",
					code: json({ servers: { quizio: { type: "http", url: serverUrl } } }),
				},
			],
		},
		{
			id: "gemini",
			label: "Gemini CLI",
			steps: [
				"Rode o comando abaixo no terminal.",
				"No Gemini CLI, rode /mcp auth quizio e permita o acesso na tela do Quizio.",
			],
			commands: [
				{
					label: "Adicionar",
					code: `gemini mcp add --transport http quizio ${serverUrl}`,
				},
			],
		},
		{
			id: "other",
			label: "Outro agente",
			steps: [
				"Use o endereço abaixo como servidor MCP por HTTP (Streamable HTTP).",
				"Se o agente aceitar OAuth, ele abre a tela do Quizio para você permitir o acesso.",
				"Se só aceitar uma chave fixa, crie uma chave de acesso aqui embaixo e envie-a no cabeçalho Authorization.",
			],
			commands: [
				address,
				{
					label: "Cabeçalho",
					code: "Authorization: Bearer <sua chave de acesso>",
				},
			],
		},
	];
}
