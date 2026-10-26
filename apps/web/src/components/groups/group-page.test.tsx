import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { GroupViewData } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { GroupActivity } from "./group-activity";
import { GroupHeader } from "./group-header";
import { GroupInfoDialog } from "./group-info-dialog";
import { GroupSetupCard } from "./group-setup-card";
import { GroupTabs } from "./group-tabs";

function aGroupView(overrides: Partial<GroupViewData> = {}): GroupViewData {
	return {
		id: "g1",
		name: "Turma 7A",
		description: "",
		role: "admin",
		abilities: { invite: true, seeMembers: true },
		adminName: "Ana",
		memberCount: 2,
		createdAt: new Date(2026, 9, 26, 12).toISOString(),
		memberPreview: [
			{ userId: "ana", name: "Ana" },
			{ userId: "bruno", name: "Bruno" },
		],
		setup: { invited: false, assigned: false, posted: false },
		...overrides,
	} as GroupViewData;
}

const noop = () => {};
const headerActions = { onInfo: noop, onLeave: noop, onDelete: noop };

async function openOptions() {
	const user = userEvent.setup();
	await user.click(
		await screen.findByRole("button", { name: "Opções do grupo" }),
	);
	return (await screen.findByRole("menu")) as HTMLElement;
}

describe("GroupHeader (spec 034, RN-13, RN-18)", () => {
	it("the admin's gear links to the settings, and the admin's menu has Excluir and no Sair (spec 035, RN-01)", async () => {
		renderWithRouter(<GroupHeader group={aGroupView()} {...headerActions} />);

		expect(
			await screen.findByRole("heading", { name: "Turma 7A" }),
		).toBeVisible();
		// A link styled as a button (the design system's pattern).
		const settings = screen.getByRole("button", {
			name: "Configurações do grupo",
		});
		expect(settings).toHaveAttribute("href", "/groups/g1/settings");
		const menu = await openOptions();
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((item) => item.textContent),
		).toEqual(["Informações do grupo", "Ver membros", "Excluir grupo"]);
	});

	it("hides settings from a member, whose menu has Sair and no Excluir", async () => {
		renderWithRouter(
			<GroupHeader
				group={aGroupView({ role: "member", setup: null })}
				{...headerActions}
			/>,
		);

		await screen.findByRole("heading", { name: "Turma 7A" });
		expect(screen.queryByRole("link", { name: /Configurações/ })).toBeNull();
		const menu = await openOptions();
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((item) => item.textContent),
		).toEqual(["Informações do grupo", "Ver membros", "Sair do grupo"]);
	});

	it("shows up to 3 member icons and +N, linking to the members", async () => {
		renderWithRouter(
			<GroupHeader
				group={aGroupView({
					memberCount: 5,
					memberPreview: [
						{ userId: "ana", name: "Ana" },
						{ userId: "bruno", name: "Bruno" },
						{ userId: "carla", name: "Carla" },
					],
				})}
				{...headerActions}
			/>,
		);

		const members = await screen.findByRole("link", {
			name: "Ver os 5 membros",
		});
		expect(members).toHaveAttribute("href", "/groups/g1/members");
		expect(members.querySelectorAll('[data-slot="user-avatar"]')).toHaveLength(
			3,
		);
		expect(members).toHaveTextContent("+2");
	});

	it("a member without seeMembers has no icons nor Ver membros (spec 035, RN-13)", async () => {
		renderWithRouter(
			<GroupHeader
				group={aGroupView({
					role: "member",
					setup: null,
					memberPreview: [],
					abilities: { invite: true, seeMembers: false },
				})}
				{...headerActions}
			/>,
		);

		await screen.findByRole("heading", { name: "Turma 7A" });
		expect(screen.queryByRole("link", { name: /membros/ })).toBeNull();
		const menu = await openOptions();
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((item) => item.textContent),
		).toEqual(["Informações do grupo", "Sair do grupo"]);
	});
});

describe("GroupTabs (spec 034, RN-14, RN-16)", () => {
	it("keeps the open tab in the address and offers Adicionar membros to the admin", async () => {
		const user = userEvent.setup();
		const onAddMembers = vi.fn();
		renderWithRouter(
			<GroupTabs
				groupId="g1"
				tab="shared"
				canInvite
				onAddMembers={onAddMembers}
			/>,
		);

		const shared = await screen.findByRole("link", { name: "Compartilhado" });
		expect(shared).toHaveAttribute("href", "/groups/g1?tab=shared");
		expect(shared).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: "Atividade" })).toHaveAttribute(
			"href",
			"/groups/g1?tab=activity",
		);
		await user.click(screen.getByRole("button", { name: "Adicionar membros" }));
		expect(onAddMembers).toHaveBeenCalled();
	});

	it("no Adicionar membros without abilities.invite (spec 035, RN-12)", async () => {
		renderWithRouter(
			<GroupTabs
				groupId="g1"
				tab="activity"
				canInvite={false}
				onAddMembers={noop}
			/>,
		);

		await screen.findByRole("link", { name: "Atribuições" });
		expect(
			screen.queryByRole("button", { name: "Adicionar membros" }),
		).toBeNull();
	});
});

describe("GroupActivity (spec 034, RN-15, RN-17)", () => {
	const activity = { onInvite: noop, onDismissSetup: noop };

	it("Publicar algo and its actions are Em breve; Atribuir only for the admin", () => {
		render(
			<GroupActivity
				isAdmin
				setup={{ invited: false, assigned: false, posted: false }}
				{...activity}
			/>,
		);

		const composer = screen.getByRole("region", { name: "Publicar algo" });
		for (const name of ["Criar publicação", "Compart.", "Atribuir"]) {
			expect(
				within(composer).getByRole("button", { name: `${name} (em breve)` }),
			).toHaveAttribute("aria-disabled", "true");
		}
		expect(
			screen.getByText(
				"Ainda não há nenhuma atividade neste grupo. Faça uma publicação para começar.",
			),
		).toBeVisible();
	});

	it("shows the setup card only to the admin", () => {
		const { rerender } = render(
			<GroupActivity
				isAdmin
				setup={{ invited: false, assigned: false, posted: false }}
				{...activity}
			/>,
		);
		expect(
			screen.getByRole("region", { name: "Configurar seu grupo" }),
		).toBeVisible();

		rerender(<GroupActivity isAdmin={false} setup={null} {...activity} />);

		expect(
			screen.queryByRole("region", { name: "Configurar seu grupo" }),
		).toBeNull();
		const composer = screen.getByRole("region", { name: "Publicar algo" });
		expect(
			within(composer).queryByRole("button", { name: /Atribuir/ }),
		).toBeNull();
	});
});

describe("GroupSetupCard (spec 034, RN-17)", () => {
	it("marks Convidar membros done", () => {
		render(
			<GroupSetupCard
				setup={{ invited: true, assigned: false, posted: false }}
				onInvite={noop}
				onDismiss={noop}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Convidar membros (feito)" }),
		).toBeVisible();
	});

	it("Convidar membros invites and Pular configuração dismisses", async () => {
		const user = userEvent.setup();
		const onInvite = vi.fn();
		const onDismiss = vi.fn();
		render(
			<GroupSetupCard
				setup={{ invited: false, assigned: false, posted: false }}
				onInvite={onInvite}
				onDismiss={onDismiss}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Convidar membros" }));
		await user.click(
			screen.getByRole("button", { name: "Pular configuração" }),
		);

		expect(onInvite).toHaveBeenCalled();
		expect(onDismiss).toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: "Atribuir (em breve)" }),
		).toHaveAttribute("aria-disabled", "true");
	});
});

describe("GroupInfoDialog (spec 034, RN-19)", () => {
	it("tells the admin's name, member count and creation date", async () => {
		render(
			<GroupInfoDialog group={aGroupView({ memberCount: 3 })} onClose={noop} />,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Informações do grupo",
		});
		expect(dialog).toHaveTextContent("Turma 7A");
		expect(dialog).toHaveTextContent("Ana");
		expect(dialog).toHaveTextContent("3 membros");
		expect(dialog).toHaveTextContent("26 de outubro de 2026");
	});

	it("shows the description with its line breaks, and no line without one (spec 035, RN-06)", async () => {
		const { rerender } = render(
			<GroupInfoDialog
				group={aGroupView({ description: "Prova\nde quinta" })}
				onClose={noop}
			/>,
		);

		const description = await screen.findByText(/Prova/);
		expect(description.textContent).toBe("Prova\nde quinta");
		expect(description.className).toContain("whitespace-pre-line");

		rerender(<GroupInfoDialog group={aGroupView()} onClose={noop} />);

		expect(screen.queryByText("Descrição:")).toBeNull();
	});
});
