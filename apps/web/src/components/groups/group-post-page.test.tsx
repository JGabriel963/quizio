import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { GroupPostData } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { GroupPostPage } from "./group-post-page";

const post = {
	id: "p1",
	kind: "message",
	headline: "message",
	author: { userId: "bruno", name: "Bruno", photoUrl: null },
	createdAt: "2026-10-26T20:43:00.000Z",
	message: "Prova na sexta",
	gameId: null,
	likeCount: 2,
	liked: false,
	attachment: null,
	file: null,
	quiz: null,
	canSeeReport: false,
	canDelete: false,
} as unknown as GroupPostData;

const actions = {
	origin: "http://localhost:3001",
	quizActions: {
		groupId: "g1",
		onDuplicate: vi.fn(),
		onUnshare: vi.fn(),
	},
	onLike: vi.fn(),
	onDelete: vi.fn(),
};

describe("GroupPostPage (spec 040, RN-19, RN-20)", () => {
	it("back to Atividade and the post with likes", async () => {
		renderWithRouter(<GroupPostPage groupId="g1" post={post} {...actions} />);

		const back = (await screen.findByLabelText("Voltar")).closest("a");
		expect(back).toHaveAttribute("href", "/groups/g1?tab=activity");
		expect(screen.getByRole("article")).toHaveTextContent("Prova na sexta");
		expect(screen.getByText("2 curtidas")).toBeVisible();
		expect(screen.getByRole("button", { name: /Curtir/ })).toBeVisible();
	});

	it("a deleted post says Esta publicação não está mais disponível. with Voltar ao grupo", async () => {
		renderWithRouter(<GroupPostPage groupId="g1" post={null} {...actions} />);

		expect(
			await screen.findByText("Esta publicação não está mais disponível."),
		).toBeVisible();
		expect(screen.getByText("Voltar ao grupo").closest("a")).toHaveAttribute(
			"href",
			"/groups/g1?tab=activity",
		);
	});
});
