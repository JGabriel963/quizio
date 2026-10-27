import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { GroupPostData } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { GroupFeed } from "./group-feed";

const aMessage = (id: string): GroupPostData =>
	({
		id,
		kind: "message",
		headline: "message",
		quiz: null,
		author: { userId: "ana", name: "Ana" },
		createdAt: new Date(2026, 9, 26, 15, 1).toISOString(),
		message: `Publicação ${id}`,
		gameId: null,
		file: null,
		likeCount: 0,
		liked: false,
		attachment: null,
		canSeeReport: false,
		canDelete: false,
	}) as GroupPostData;

/** One page, then the last one when asked. */
function Harness() {
	const [pages, setPages] = useState(1);
	const posts = pages === 1 ? [aMessage("1")] : [aMessage("1"), aMessage("2")];
	return (
		<GroupFeed
			posts={posts}
			origin="https://quizio.app"
			quizActions={{
				groupId: "g1",
				onDuplicate: async () => {},
				onUnshare: async () => {},
			}}
			hasMore={pages === 1}
			onLoadMore={() => setPages(2)}
			onLike={async () => {}}
			onDelete={async () => {}}
		/>
	);
}

describe("GroupFeed (spec 036, RN-18)", () => {
	it("Mostrar mais publicações loads the next page and goes away", async () => {
		const user = userEvent.setup();
		renderWithRouter(<Harness />);

		expect(await screen.findAllByRole("article")).toHaveLength(1);
		await user.click(
			screen.getByRole("button", { name: "Mostrar mais publicações" }),
		);

		expect(await screen.findAllByRole("article")).toHaveLength(2);
		expect(
			screen.queryByRole("button", { name: "Mostrar mais publicações" }),
		).toBeNull();
	});
});
