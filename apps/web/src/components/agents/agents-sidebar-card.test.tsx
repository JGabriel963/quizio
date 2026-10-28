import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import {
	AgentsSidebarCard,
	AgentsSidebarNoticeView,
} from "./agents-sidebar-card";

describe("AgentsSidebarCard (spec 044)", () => {
	it("tells about the agents and leads to their section", async () => {
		const user = userEvent.setup();
		const onNavigate = vi.fn();
		renderWithRouter(<AgentsSidebarCard onNavigate={onNavigate} />);

		const card = await screen.findByRole("link", { name: /Agentes de IA/ });
		expect(card).toHaveAttribute("href", "/settings?section=agents");
		expect(card).toHaveTextContent(
			"Use o ChatGPT, o Claude ou outro agente no Quizio.",
		);

		await user.click(card);
		expect(onNavigate).toHaveBeenCalledOnce();
	});
});

describe("AgentsSidebarNoticeView (spec 044)", () => {
	const none = { connections: [], keys: [] };

	it("shows the card until an agent connects, and nothing while loading", async () => {
		const { unmount } = renderWithRouter(
			<AgentsSidebarNoticeView access={none} />,
		);
		expect(
			await screen.findByRole("link", { name: /Agentes de IA/ }),
		).toBeVisible();
		unmount();

		for (const access of [
			undefined,
			{
				...none,
				connections: [
					{
						id: "consent-1",
						agentName: "ChatGPT",
						connectedAt: "2026-10-20T12:00:00.000Z",
						lastUsedAt: null,
					},
				],
			},
		]) {
			const view = renderWithRouter(
				<AgentsSidebarNoticeView access={access} />,
			);
			await view.router.load();
			expect(screen.queryByRole("link", { name: /Agentes de IA/ })).toBeNull();
			view.unmount();
		}
	});
});
