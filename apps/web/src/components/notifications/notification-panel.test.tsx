import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { NotificationData } from "@/lib/api-types";

import { NotificationPanel } from "./notification-panel";

const HOUR = 60 * 60 * 1000;

function aNotification(overrides: Partial<NotificationData>): NotificationData {
	return {
		id: "post:p1",
		kind: "post",
		actor: { userId: "bruno", name: "Bruno", photoUrl: null },
		group: { id: "g1", name: "GRUPO 1" },
		postId: "p1",
		read: false,
		ageMs: 15 * HOUR,
		...overrides,
	};
}

const items: NotificationData[] = [
	aNotification({
		id: "post:p2",
		postId: "p2",
		actor: {
			userId: "bruno",
			name: "Bruno",
			photoUrl: "https://media.test/profiles/bruno/b.webp",
		},
	}),
	aNotification({ id: "post:p1", read: true, ageMs: 20 * HOUR }),
	aNotification({
		id: "notice:n1",
		kind: "removed",
		actor: null,
		postId: null,
		group: { id: null, name: "GRUPO 2" },
		read: false,
	}),
];

function renderPanel(
	props: Partial<Parameters<typeof NotificationPanel>[0]> = {},
) {
	const actions = {
		onOpen: vi.fn(),
		onReadAll: vi.fn(),
		onLoadMore: vi.fn(),
		onRetry: vi.fn(),
	};
	render(
		<NotificationPanel
			status="ready"
			items={items}
			hasMore={false}
			hasUnread
			{...actions}
			{...props}
		/>,
	);
	return { user: userEvent.setup(), ...actions };
}

describe("NotificationPanel (spec 040, RN-12 to RN-17)", () => {
	it("Novo and Anteriores, unread with the dot and blue time, read in gray", () => {
		renderPanel();

		const novo = screen.getByRole("list", { name: "Novo" });
		const anteriores = screen.getByRole("list", { name: "Anteriores" });
		expect(within(novo).getAllByRole("listitem")).toHaveLength(2);
		expect(within(anteriores).getAllByRole("listitem")).toHaveLength(1);

		const unread = within(novo).getAllByRole("button")[0] as HTMLElement;
		expect(unread).toHaveTextContent(
			"Bruno compartilhou uma nova postagem com o grupo GRUPO 1.",
		);
		expect(unread).toHaveAttribute("data-read", "false");
		expect(within(unread).getByText("há 15 horas")).toHaveClass("text-primary");
		expect(unread.querySelector('[data-slot="unread-dot"]')).not.toBeNull();

		const read = within(anteriores).getByRole("button");
		expect(read).toHaveAttribute("data-read", "true");
		expect(read.querySelector('[data-slot="unread-dot"]')).toBeNull();
	});

	it("the actor's photo with the group mark; the group icon for notices", () => {
		renderPanel();
		const [withPhoto, notice] = within(
			screen.getByRole("list", { name: "Novo" }),
		).getAllByRole("button") as HTMLElement[];

		expect(withPhoto?.querySelector("img")).toHaveAttribute(
			"src",
			"https://media.test/profiles/bruno/b.webp",
		);
		expect(withPhoto?.querySelector('[data-slot="group-mark"]')).not.toBeNull();
		expect(notice).toHaveTextContent("Você foi removido do grupo GRUPO 2.");
		expect(notice?.querySelector('[data-slot="group-icon"]')).not.toBeNull();
	});

	it("opening one calls onOpen with it", async () => {
		const { user, onOpen } = renderPanel();

		await user.click(
			screen.getByRole("button", {
				name: /Você foi removido do grupo GRUPO 2/,
			}),
		);

		expect(onOpen).toHaveBeenCalledWith(items[2]);
	});

	it("Marcar todas como lidas, disabled without unread", async () => {
		const { user, onReadAll } = renderPanel();

		await user.click(
			screen.getByRole("button", { name: "Opções das notificações" }),
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Marcar todas como lidas" }),
		);
		expect(onReadAll).toHaveBeenCalledOnce();
	});

	it("Marcar todas como lidas is disabled when nothing in the inbox is unread", async () => {
		const { user } = renderPanel({
			items: items.map((item) => ({ ...item, read: true })),
			hasUnread: false,
		});

		await user.click(
			screen.getByRole("button", { name: "Opções das notificações" }),
		);

		expect(
			await screen.findByRole("menuitem", { name: "Marcar todas como lidas" }),
		).toHaveAttribute("aria-disabled", "true");
		expect(screen.queryByRole("list", { name: "Novo" })).toBeNull();
	});

	it("Marcar todas como lidas follows the whole inbox, not the loaded page (Codex review of PR #23)", async () => {
		const { user, onReadAll } = renderPanel({
			items: items.map((item) => ({ ...item, read: true })),
			hasUnread: true,
		});

		await user.click(
			screen.getByRole("button", { name: "Opções das notificações" }),
		);
		const markAll = await screen.findByRole("menuitem", {
			name: "Marcar todas como lidas",
		});
		expect(markAll).not.toHaveAttribute("aria-disabled", "true");
		await user.click(markAll);

		expect(onReadAll).toHaveBeenCalledOnce();
	});

	it("empty, loading and error with Tentar de novo", async () => {
		const { unmount } = render(
			<NotificationPanel
				status="ready"
				items={[]}
				hasMore={false}
				hasUnread={false}
				onOpen={vi.fn()}
				onReadAll={vi.fn()}
				onLoadMore={vi.fn()}
				onRetry={vi.fn()}
			/>,
		);
		expect(screen.getByText("Você não tem notificações.")).toBeVisible();
		expect(
			screen.getByText("As novidades dos seus grupos aparecem aqui."),
		).toBeVisible();
		unmount();

		const loading = render(
			<NotificationPanel
				status="loading"
				items={[]}
				hasMore={false}
				hasUnread={false}
				onOpen={vi.fn()}
				onReadAll={vi.fn()}
				onLoadMore={vi.fn()}
				onRetry={vi.fn()}
			/>,
		);
		expect(screen.getByLabelText("Carregando notificações")).toBeVisible();
		loading.unmount();

		const onRetry = vi.fn();
		render(
			<NotificationPanel
				status="error"
				items={[]}
				hasMore={false}
				hasUnread={false}
				onOpen={vi.fn()}
				onReadAll={vi.fn()}
				onLoadMore={vi.fn()}
				onRetry={onRetry}
			/>,
		);
		expect(
			screen.getByText("Não foi possível carregar as notificações."),
		).toBeVisible();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Tentar de novo" }));
		expect(onRetry).toHaveBeenCalledOnce();
	});

	it("the end of the list asks for more", async () => {
		const { user, onLoadMore } = renderPanel({ hasMore: true });

		await user.click(screen.getByRole("button", { name: "Mostrar mais" }));

		expect(onLoadMore).toHaveBeenCalledOnce();
	});
});
