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
		renderPost(aPost({ attachment: null, likeCount: 1, liked: true }));

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
