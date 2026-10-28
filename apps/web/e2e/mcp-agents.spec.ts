import { expect, type Locator, type Page, test } from "@playwright/test";

import {
	agentCallback,
	enterNickname,
	lobbyPin,
	mcpClient,
	mcpPing,
	newParticipant,
	quizList,
	registerAgent,
	signIn,
	signUp,
} from "./support";

const AGENTS_SECTION = "/settings?section=agents";

const connectedAgents = (page: Page) =>
	page.getByRole("region", { name: "Agentes conectados" });
const accessKeys = (page: Page) =>
	page.getByRole("region", { name: "Chaves de acesso" });
const sidebarAgentsCard = (page: Page) =>
	page.getByRole("complementary").getByRole("link", { name: /Agentes de IA/ });
const questionItems = (page: Page) =>
	page.getByRole("list", { name: "Perguntas" }).getByRole("listitem");

const noSideScroll = (page: Page) =>
	page.evaluate(
		() =>
			document.documentElement.scrollWidth <=
			document.documentElement.clientWidth,
	);

/** A click before hydration is lost: click again until it takes. */
async function clickUntil(button: Locator, took: () => Promise<void>) {
	await expect(async () => {
		await button.click();
		await took();
	}).toPass({ timeout: 30_000 });
}

/** Criar chave in the section; returns the whole key, shown only there (RN-05). */
async function createAccessKey(page: Page, name: string): Promise<string> {
	const dialog = page.getByRole("dialog", { name: "Criar chave" });
	await clickUntil(
		accessKeys(page).getByRole("button", { name: "Criar chave" }),
		() => expect(dialog).toBeVisible({ timeout: 2_000 }),
	);
	await dialog.getByLabel("Nome").fill(name);
	await dialog.getByRole("button", { name: "Criar chave" }).click();

	const shown = page
		.getByRole("dialog", { name: "Sua chave de acesso" })
		.getByRole("group", { name: "Sua chave de acesso" });
	await expect(shown).toContainText(/^qz_/);
	const secret = (await shown.locator("code").textContent()) ?? "";
	await expect(
		page.getByText("Copie agora: esta chave não será mostrada de novo."),
	).toBeVisible();
	await page.getByRole("button", { name: "Concluído" }).click();
	await expect(page.getByRole("dialog")).toBeHidden();
	return secret;
}

/** An agent connected with a key created in the section, and its tool calls. */
async function agentFor(page: Page) {
	await page.goto(AGENTS_SECTION);
	const client = await mcpClient(await createAccessKey(page, "Agente E2E"));
	return {
		client,
		/** The structured answer of a call that must succeed. */
		async tool(name: string, args: Record<string, unknown> = {}) {
			const result = await client.callTool({ name, arguments: args });
			expect(
				result.isError,
				JSON.stringify(result.structuredContent),
			).toBeFalsy();
			return result.structuredContent as Record<string, unknown>;
		},
	};
}

test.describe("agentes de IA (spec 044)", () => {
	test("uma chave conecta um cliente MCP que cria e publica um quiz de três perguntas", async ({
		page,
	}, testInfo) => {
		// Sign-ups and several screens on the dev server.
		test.setTimeout(90_000);
		// The wide screen's sidebar is always there; the phone's opens as a sheet.
		const wide = testInfo.project.name === "desktop";
		await signUp(page);
		await page.goto(AGENTS_SECTION);
		await expect(
			accessKeys(page).getByText("Nenhuma chave criada."),
		).toBeVisible();
		if (wide) {
			await expect(sidebarAgentsCard(page)).toBeVisible();
		}

		const secret = await createAccessKey(page, "Script da escola");
		const row = accessKeys(page).getByRole("listitem");
		await expect(row).toContainText("Script da escola");
		await expect(row).toContainText(secret.slice(0, 9));
		await expect(row).not.toContainText(secret);
		await expect(row).toContainText("Ainda não usado");
		await expect(row).toContainText(/Criada em /);

		const agent = await mcpClient(secret);
		const created = await agent.callTool({
			name: "create_quiz",
			arguments: {
				title: "Revolução Francesa",
				questions: [
					{
						type: "quiz",
						text: "Em que ano caiu a Bastilha?",
						choices: [
							{ text: "1789", correct: true },
							{ text: "1815", correct: false },
						],
					},
					{
						type: "trueFalse",
						text: "Luís XVI foi o último rei antes da revolução.",
						correct: true,
					},
					{
						type: "typeAnswer",
						text: "Qual é o lema da revolução? (primeira palavra)",
						acceptedAnswers: ["Liberdade"],
					},
				],
			},
		});
		expect(created.isError).toBeFalsy();
		const { quiz, links } = created.structuredContent as {
			quiz: { id: string };
			links: { editor: string; page: string };
		};
		expect(links.editor).toContain(`/creator/${quiz.id}`);

		const published = await agent.callTool({
			name: "publish_quiz",
			arguments: { quizId: quiz.id },
		});
		expect(published.isError).toBeFalsy();
		await agent.close();

		// Published in the library (CA-11), each question with the AI mark.
		await page.goto("/library");
		const item = quizList(page)
			.getByRole("listitem")
			.filter({ hasText: "Revolução Francesa" });
		await expect(item).toBeVisible();
		await expect(item.getByText("Rascunho")).toHaveCount(0);
		// The sidebar's reminder goes once an agent used the key.
		if (wide) {
			await expect(sidebarAgentsCard(page)).toHaveCount(0);
		}
		await page.goto(`/creator/${quiz.id}`);
		await expect(questionItems(page)).toHaveCount(3);
		for (const question of await questionItems(page).all()) {
			await expect(question).toContainText("feita com IA");
		}

		await page.goto(AGENTS_SECTION);
		await expect(accessKeys(page).getByRole("listitem")).toContainText(
			"Último uso agora",
		);
	});

	test("um agente se conecta pela autorização depois do login e é desconectado", async ({
		page,
		browser,
	}) => {
		// Sign-ups and several screens on the dev server.
		test.setTimeout(90_000);
		const { email } = await signUp(page);
		const agent = await registerAgent("Claude Code");

		// Without a session the request goes through the login and comes back (CA-02).
		const visitor = await newParticipant(browser);
		const { reached } = await agentCallback(visitor);
		await visitor.goto(agent.authorizeUrl);
		await expect(visitor).toHaveURL(/\/login\?agent=/);
		await signIn(visitor, email);
		await expect(visitor).toHaveURL(/\/connect\?request=/);

		await expect(
			visitor.getByRole("heading", {
				name: "Claude Code quer acessar sua conta do Quizio",
			}),
		).toBeVisible();
		await expect(visitor.getByText(email)).toBeVisible();
		await expect(visitor.getByText("O agente poderá:")).toBeVisible();
		await expect(
			visitor.getByText(
				"O agente não poderá excluir sua conta nem trocar sua senha.",
			),
		).toBeVisible();
		await expect(
			visitor.getByText("Depois, você volta para 127.0.0.1."),
		).toBeVisible();
		await visitor.getByRole("button", { name: "Permitir" }).click();

		const callback = await reached;
		expect(callback.searchParams.get("state")).toBe("e2e-state");
		const token = await agent.exchange(callback.searchParams.get("code") ?? "");
		const client = await mcpClient(token);
		const { tools } = await client.listTools();
		expect(tools.map((tool) => tool.name)).toContain("list_quizzes");
		const listed = await client.callTool({
			name: "list_quizzes",
			arguments: {},
		});
		expect(listed.isError).toBeFalsy();
		await client.close();

		await page.goto(AGENTS_SECTION);
		const row = connectedAgents(page).getByRole("listitem");
		await expect(row).toContainText("Claude Code");
		await expect(row).toContainText(/Conectado em /);
		await clickUntil(
			connectedAgents(page).getByRole("button", {
				name: "Desconectar Claude Code",
			}),
			() =>
				expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 2_000 }),
		);
		await page
			.getByRole("alertdialog")
			.getByRole("button", { name: "Desconectar" })
			.click();
		await expect(
			connectedAgents(page).getByText("Nenhum agente conectado."),
		).toBeVisible();

		// Disconnecting is at once: the next request has no connection (CA-07).
		expect(await mcpPing(token)).toBe(401);
	});

	test("Usar outra conta troca de conta e Cancelar volta ao agente sem acesso", async ({
		page,
		browser,
	}) => {
		// Sign-ups and several screens on the dev server.
		test.setTimeout(90_000);
		const ana = await signUp(page, { name: "Ana E2E" });
		const other = await newParticipant(browser);
		const bruno = await signUp(other, { name: "Bruno E2E" });
		await other.context().close();
		const agent = await registerAgent("Codex");

		const { reached } = await agentCallback(page);
		await page.goto(agent.authorizeUrl);
		await expect(page).toHaveURL(/\/connect\?request=/);
		await expect(page.getByText(ana.email)).toBeVisible();

		await clickUntil(
			page.getByRole("button", { name: "Usar outra conta" }),
			() => expect(page).toHaveURL(/\/login\?agent=/, { timeout: 2_000 }),
		);
		await signIn(page, bruno.email);
		await expect(page).toHaveURL(/\/connect\?request=/);
		await expect(page.getByText(bruno.email)).toBeVisible();

		await page.getByRole("button", { name: "Cancelar" }).click();
		const callback = await reached;
		expect(callback.searchParams.get("error")).toBe("access_denied");
		expect(callback.searchParams.get("code")).toBeNull();

		await page.goto(AGENTS_SECTION);
		await expect(
			connectedAgents(page).getByText("Nenhum agente conectado."),
		).toBeVisible();
	});

	test("no celular a tela de autorização e a seção cabem na largura", async ({
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile", "only on the phone");
		await signUp(page);
		const agent = await registerAgent("Gemini CLI");

		await page.goto(agent.authorizeUrl);
		await expect(page.getByRole("button", { name: "Permitir" })).toBeVisible();
		expect(await noSideScroll(page)).toBe(true);

		await page.goto(AGENTS_SECTION);
		await expect(
			page.getByRole("tablist", { name: "Como conectar" }),
		).toBeVisible();
		await page.getByRole("tab", { name: "Codex" }).click();
		await expect(page.getByRole("tabpanel")).toContainText("codex mcp add");
		expect(await noSideScroll(page)).toBe(true);
	});
});

test.describe("agentes de IA na partida e nos grupos (spec 044, etapa 2)", () => {
	test("o agente organiza uma partida e muda o lobby, e a tela do anfitrião acompanha", async ({
		page: host,
		browser,
	}) => {
		// Sign-up, two players and the agent's calls on the dev server.
		test.setTimeout(120_000);
		await signUp(host);
		const agent = await agentFor(host);
		const { quiz } = (await agent.tool("create_quiz", {
			title: "Capitais",
			questions: [
				{
					type: "quiz",
					text: "Capital do Brasil?",
					choices: [
						{ text: "Brasília", correct: true },
						{ text: "Rio de Janeiro", correct: false },
					],
				},
			],
		})) as { quiz: { id: string } };
		await agent.tool("publish_quiz", { quizId: quiz.id });

		const hosted = await agent.tool("host_live_game", { quizId: quiz.id });
		const { gameId, pin } = hosted.game as { gameId: string; pin: string };
		const links = hosted.links as { hostScreen: string };
		await host.goto(links.hostScreen);
		expect(await lobbyPin(host)).toBe(pin);

		const players = host.getByRole("list", { name: "Participantes" });
		for (const nickname of ["ACT", "Bia"]) {
			const player = await newParticipant(browser);
			await player.goto(`/join/${pin}`);
			await enterNickname(player, nickname);
		}
		await expect(players.getByRole("button")).toHaveText([/ACT/, /Bia/]);

		// The open host screen follows each change in a few seconds (CA-18).
		const followsSoon = { timeout: 8_000 };
		await agent.tool("update_live_game", { gameId, locked: true });
		await expect(
			host.getByText("Jogo bloqueado: ninguém mais pode entrar"),
		).toBeVisible(followsSoon);
		const { game } = await agent.tool("get_live_game", { gameId });
		const act = (
			game as { players: { id: string; nickname: string }[] }
		).players.find((player) => player.nickname === "ACT");
		await agent.tool("remove_player", { gameId, playerId: act?.id });
		await expect(players.getByRole("button")).toHaveText([/Bia/], followsSoon);
		await agent.tool("update_live_game", {
			gameId,
			options: { autoplay: true },
		});
		await expect(host.getByRole("timer")).toBeVisible(followsSoon);

		// Ended before autoplay would start it.
		await agent.tool("end_live_game", { gameId });
		await expect(
			host.getByRole("heading", { name: "Esta partida foi encerrada." }),
		).toBeVisible(followsSoon);
		await agent.client.close();
	});

	test("o agente publica no grupo e o sino do outro membro acende", async ({
		page: ana,
		browser,
	}) => {
		// Two sign-ups, the invite and the bell on the dev server.
		test.setTimeout(150_000);
		await signUp(ana, { name: "Ana Agente" });
		const agent = await agentFor(ana);
		const created = await agent.tool("create_group", { name: "GRUPO AGENTE" });
		const { id: groupId } = created.group as { id: string };
		const { link } = created.invite as { link: string };

		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno Membro" });
		await bruno.goto(new URL(link).pathname);
		await bruno.getByRole("button", { name: "Aceitar convite" }).click();
		await expect(
			bruno.getByRole("heading", { name: "GRUPO AGENTE" }),
		).toBeVisible();
		await bruno.goto("/");

		await agent.tool("create_group_post", {
			groupId,
			message: "Prova na sexta",
		});

		// Without reloading: the realtime hint, or the 60 s check (CA-22).
		await expect(
			bruno.getByRole("button", {
				name: "Notificações, há novidades",
				exact: true,
			}),
		).toBeVisible({ timeout: 70_000 });
		await bruno.getByRole("button", { name: /^Notificações/ }).click();
		await expect(
			bruno
				.getByRole("dialog", { name: "Notificações" })
				.getByRole("list", { name: "Novo" })
				.getByRole("button", {
					name: /Ana Agente compartilhou uma nova postagem com o grupo GRUPO AGENTE/,
				}),
		).toBeVisible();
		await agent.client.close();
	});
});
