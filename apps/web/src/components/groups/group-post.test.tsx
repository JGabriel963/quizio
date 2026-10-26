import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { GroupPostData } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { GroupFeed } from "./group-feed";
import { GroupPost } from "./group-post";

function aPost(overrides: Partial<GroupPostData> = {}): GroupPostData {
	return {
		id: "post-1",
		headline: "assignment",
		file: null,
		author: { userId: "ana", name: "Ana" },
		createdAt: new Date(2026, 9, 26, 15, 1).toISOString(),
		message: "Revisem\naté sexta",
		gameId: "game-1",
		likeCount: 0,
		liked: false,
		attachment: {
			gameId: "game-1",
			name: "Capitais",
			questionCount: 5,
			coverUrl: null,
			ownerName: "Ana",
			remainingMs: 3 * 24 * 60 * 60 * 1000,
		},
		canSeeReport: true,
		canDelete: true,
		...overrides,
	} as GroupPostData;
}

function renderPost(
	post: GroupPostData,
	actions: Partial<{
		onLike: (liked: boolean) => Promise<unknown>;
		onDelete: () => Promise<unknown>;
	}> = {},
) {
	const user = userEvent.setup();
	renderWithRouter(
		<GroupPost
			post={post}
			origin="https://quizio.app"
			onLike={actions.onLike ?? (async () => {})}
			onDelete={actions.onDelete ?? (async () => {})}
		/>,
	);
	return { user };
}

describe("GroupPost (spec 038)", () => {
	it("shows atribuiu um kahoot, the date, the message, the card and Iniciar to a new tab", async () => {
		renderPost(aPost());

		const post = await screen.findByRole("article");
		expect(post).toHaveTextContent("Ana atribuiu um kahoot");
		expect(post).toHaveTextContent("26 de outubro às 15:01");
		expect(within(post).getByText(/Revisem/).textContent).toBe(
			"Revisem\naté sexta",
		);
		expect(post).toHaveTextContent("Capitais");
		expect(post).toHaveTextContent("5 perguntas");
		// A link styled as a button (the design system's pattern).
		const start = within(post).getByText("Iniciar").closest("a");
		expect(start).toHaveAttribute(
			"href",
			"https://quizio.app/assignment/game-1",
		);
		expect(start).toHaveAttribute("target", "_blank");
	});

	it("an ended one shows compartilhou um arquivo and the removed box, keeping likes", async () => {
		renderPost(
			aPost({
				headline: "file",
				attachment: null,
				likeCount: 1,
				liked: true,
			}),
		);

		const post = await screen.findByRole("article");
		expect(post).toHaveTextContent("Ana compartilhou um arquivo");
		expect(post).toHaveTextContent("Ana excluiu o anexo da publicação");
		expect(within(post).queryByText("Iniciar")).toBeNull();
		expect(post).toHaveTextContent("1 curtida");
		expect(within(post).getByRole("button", { name: "Curtida" })).toBeVisible();
	});

	it("Curtir / Curtida and N curtidas, going back on failure", async () => {
		const onLike = vi.fn(async (_liked: boolean) => {});
		const { user } = renderPost(aPost(), { onLike });

		await user.click(await screen.findByRole("button", { name: "Curtir" }));
		expect(onLike).toHaveBeenCalledWith(true);
		expect(screen.getByText("1 curtida")).toBeVisible();
		expect(screen.getByRole("button", { name: "Curtida" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("a failed like goes back", async () => {
		const { user } = renderPost(aPost(), {
			onLike: async () => {
				throw new Error("offline");
			},
		});

		await user.click(await screen.findByRole("button", { name: "Curtir" }));

		expect(await screen.findByText("0 curtidas")).toBeVisible();
		expect(screen.getByRole("button", { name: "Curtir" })).toBeVisible();
	});

	it("the ⋮ has Ver relatório and Excluir publicação when allowed, none otherwise", async () => {
		const { user } = renderPost(aPost());

		await user.click(
			await screen.findByRole("button", { name: "Opções da publicação" }),
		);
		const menu = await screen.findByRole("menu");
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((item) => item.textContent),
		).toEqual(["Ver relatório", "Excluir publicação"]);
		expect(
			within(menu).getByRole("menuitem", { name: "Ver relatório" }),
		).toHaveAttribute("href", "/reports/game-1");
	});

	it("no ⋮ without options", async () => {
		renderPost(aPost({ canSeeReport: false, canDelete: false }));

		await screen.findByRole("article");
		expect(
			screen.queryByRole("button", { name: "Opções da publicação" }),
		).toBeNull();
	});

	it("Excluir publicação asks first", async () => {
		const onDelete = vi.fn(async () => {});
		const { user } = renderPost(aPost(), { onDelete });

		await user.click(
			await screen.findByRole("button", { name: "Opções da publicação" }),
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Excluir publicação" }),
		);
		const confirm = await screen.findByRole("alertdialog", {
			name: "Excluir a publicação?",
		});
		await user.click(within(confirm).getByRole("button", { name: "Excluir" }));

		expect(onDelete).toHaveBeenCalled();
	});
});

/** A message post of spec 036, by Bruno. */
function aMessage(overrides: Partial<GroupPostData> = {}): GroupPostData {
	return aPost({
		headline: "message",
		author: { userId: "bruno", name: "Bruno" },
		message: "Prova na sexta\nTragam lápis",
		gameId: null,
		attachment: null,
		canSeeReport: false,
		...overrides,
	});
}

describe("GroupPost with a message (spec 036)", () => {
	it("a message post: compartilhou uma mensagem, the text with line breaks, likes", async () => {
		renderPost(aMessage());

		const post = await screen.findByRole("article");
		expect(post).toHaveTextContent("Bruno compartilhou uma mensagem");
		expect(within(post).getByText(/Prova na sexta/).textContent).toBe(
			"Prova na sexta\nTragam lápis",
		);
		expect(post).not.toHaveTextContent("excluiu o anexo");
		expect(post).toHaveTextContent("0 curtidas");
		expect(within(post).getByRole("button", { name: "Curtir" })).toBeVisible();
	});

	it("links open in a new tab; markup shows as typed", async () => {
		renderPost(
			aMessage({
				message: "Veja https://exemplo.com/aula, e <b>oi</b>",
			}),
		);

		const post = await screen.findByRole("article");
		const link = within(post).getByRole("link", {
			name: "https://exemplo.com/aula",
		});
		expect(link).toHaveAttribute("href", "https://exemplo.com/aula");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
		expect(post).toHaveTextContent(", e <b>oi</b>");
		expect(post.querySelector("b")).toBeNull();
	});

	it("an image post opens enlarged and closes with Esc", async () => {
		const { user } = renderPost(
			aMessage({
				headline: "image",
				message: null,
				file: {
					type: "image",
					url: "https://media.test/groups/g/quadro.png",
					name: "quadro.png",
					sizeBytes: 2048,
				},
			}),
		);

		const post = await screen.findByRole("article");
		expect(post).toHaveTextContent("Bruno compartilhou uma imagem");
		const image = within(post).getByRole("img", {
			name: "Imagem publicada por Bruno",
		});
		expect(image).toHaveAttribute(
			"src",
			"https://media.test/groups/g/quadro.png",
		);
		await user.click(
			within(post).getByRole("button", { name: "Ampliar a imagem" }),
		);
		const viewer = await screen.findByRole("dialog", {
			name: "Imagem publicada por Bruno",
		});
		expect(within(viewer).getByRole("img")).toHaveAttribute(
			"src",
			"https://media.test/groups/g/quadro.png",
		);
		await user.keyboard("{Escape}");
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("a PDF post: compartilhou um arquivo, name, 2,4 MB, link in a new tab", async () => {
		renderPost(
			aMessage({
				headline: "file",
				message: "Leiam até o cap. 3",
				file: {
					type: "pdf",
					url: "https://media.test/groups/g/a.pdf",
					name: "apostila.pdf",
					sizeBytes: 2.4 * 1024 * 1024,
				},
			}),
		);

		const post = await screen.findByRole("article");
		expect(post).toHaveTextContent("Bruno compartilhou um arquivo");
		expect(post).not.toHaveTextContent("excluiu o anexo");
		const card = within(post).getByRole("link", { name: /apostila\.pdf/ });
		expect(card).toHaveTextContent("2,4 MB");
		expect(card).toHaveAttribute("href", "https://media.test/groups/g/a.pdf");
		expect(card).toHaveAttribute("target", "_blank");
	});

	it("the menu of a message has only Excluir publicação, with the file wording", async () => {
		const { user } = renderPost(
			aMessage({
				headline: "file",
				file: {
					type: "pdf",
					url: "https://media.test/groups/g/a.pdf",
					name: "apostila.pdf",
					sizeBytes: 10,
				},
			}),
		);

		await user.click(
			await screen.findByRole("button", { name: "Opções da publicação" }),
		);
		const menu = await screen.findByRole("menu");
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((item) => item.textContent),
		).toEqual(["Excluir publicação"]);
		await user.click(
			within(menu).getByRole("menuitem", { name: "Excluir publicação" }),
		);
		expect(
			await screen.findByRole("alertdialog", { name: "Excluir a publicação?" }),
		).toHaveTextContent("Ela some do mural para todos, com o arquivo.");
	});
});

describe("GroupFeed (spec 038, RN-13)", () => {
	it("posts in order", async () => {
		renderWithRouter(
			<GroupFeed
				posts={[
					aPost({ id: "new", message: "Nova" }),
					aPost({ id: "old", message: "Antiga" }),
				]}
				origin="https://quizio.app"
				onLike={async () => {}}
				onDelete={async () => {}}
			/>,
		);

		const posts = await screen.findAllByRole("article");
		expect(posts.map((post) => post.textContent?.includes("Nova"))).toEqual([
			true,
			false,
		]);
	});
});
