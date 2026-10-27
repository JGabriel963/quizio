import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { GroupMemberData } from "@/lib/api-types";

import {
	DeleteGroupDialog,
	LeaveGroupDialog,
	RemoveMemberDialog,
} from "./confirm-group-dialogs";
import { MemberInfoDialog } from "./member-info-dialog";
import { MembersTable } from "./members-table";

const members: GroupMemberData[] = [
	{ userId: "ana", name: "Ana", email: "ana@exemplo.com", role: "admin" },
	{
		userId: "bruno",
		name: "Bruno",
		email: "bruno@exemplo.com",
		role: "member",
	},
];

const actions = { onInfo: vi.fn(), onRemove: vi.fn() };

function renderTable(viewerId: string, isAdmin: boolean) {
	render(
		<MembersTable
			members={members}
			viewerId={viewerId}
			isAdmin={isAdmin}
			{...actions}
		/>,
	);
	return screen.getByRole("table", { name: "Membros do grupo" });
}

async function menuOf(name: string) {
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: `Ações para ${name}` }));
	return (await screen.findByRole("menu")) as HTMLElement;
}

describe("MembersTable (spec 034, RN-32, RN-33)", () => {
	it("renders the Administrador badge and Ativo for each member", () => {
		const table = renderTable("ana", true);

		const rows = within(table).getAllByRole("row").slice(1);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveTextContent("Ana");
		expect(
			within(rows[0] as HTMLElement).getByText("Administrador"),
		).toBeVisible();
		expect(rows[1]).toHaveTextContent("Bruno");
		expect(
			within(rows[1] as HTMLElement).queryByText("Administrador"),
		).toBeNull();
		for (const row of rows) {
			expect(row).toHaveTextContent("Ativo");
		}
	});

	it("Remover only for the admin and never on their own row", async () => {
		renderTable("ana", true);

		const brunoMenu = await menuOf("Bruno");
		expect(
			within(brunoMenu).getByRole("menuitem", { name: "Remover" }),
		).toBeVisible();
	});

	it("the admin's own row has no Remover", async () => {
		renderTable("ana", true);

		const anaMenu = await menuOf("Ana");
		expect(
			within(anaMenu).queryByRole("menuitem", { name: "Remover" }),
		).toBeNull();
	});

	it("a member sees no Remover; Ver perfil is Em breve", async () => {
		renderTable("bruno", false);

		const menu = await menuOf("Ana");
		expect(
			within(menu).queryByRole("menuitem", { name: "Remover" }),
		).toBeNull();
		expect(
			within(menu).getByRole("menuitem", { name: "Ver perfil (em breve)" }),
		).toHaveAttribute("aria-disabled", "true");
	});

	it("ⓘ and Informações do membro open the member's details", async () => {
		const user = userEvent.setup();
		const onInfo = vi.fn();
		render(
			<MembersTable
				members={members}
				viewerId="ana"
				isAdmin
				onInfo={onInfo}
				onRemove={() => {}}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Informações de Bruno" }),
		);

		expect(onInfo).toHaveBeenCalledWith(members[1]);
	});
});

describe("MemberInfoDialog (spec 034, RN-34)", () => {
	it("shows name, email, role and status", async () => {
		render(<MemberInfoDialog member={members[1] ?? null} onClose={() => {}} />);

		const dialog = await screen.findByRole("dialog", {
			name: "Informações do membro",
		});
		expect(dialog).toHaveTextContent("Bruno");
		expect(dialog).toHaveTextContent("bruno@exemplo.com");
		expect(dialog).toHaveTextContent("Membro");
		expect(dialog).toHaveTextContent("Ativo");
	});

	it("omits the email line without it", async () => {
		render(
			<MemberInfoDialog
				member={{ userId: "ana", name: "Ana", email: null, role: "admin" }}
				onClose={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog");
		expect(dialog).toHaveTextContent("Administrador");
		expect(dialog).not.toHaveTextContent("E-mail");
	});
});

describe("confirmations (spec 034, RN-35 to RN-37)", () => {
	it("Remover confirms with the member's name", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		render(
			<RemoveMemberDialog
				name="Bruno"
				onCancel={() => {}}
				onConfirm={onConfirm}
			/>,
		);

		const dialog = await screen.findByRole("alertdialog", {
			name: "Remover Bruno do grupo?",
		});
		expect(dialog).toHaveTextContent(
			"Bruno deixa de ver o grupo. Para impedir que volte pelo link, redefina o link de convite.",
		);
		await user.click(within(dialog).getByRole("button", { name: "Remover" }));
		expect(onConfirm).toHaveBeenCalled();
	});

	it("Sair confirms with the group's name", async () => {
		render(
			<LeaveGroupDialog
				name="Turma 7A"
				onCancel={() => {}}
				onConfirm={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("alertdialog", {
			name: "Sair de Turma 7A?",
		});
		expect(dialog).toHaveTextContent(
			"Você deixa de ver o grupo. Para voltar, vai precisar do link de convite.",
		);
		expect(within(dialog).getByRole("button", { name: "Sair" })).toBeVisible();
	});

	it("Excluir confirms that it cannot be undone", async () => {
		render(
			<DeleteGroupDialog
				name="Turma 7A"
				onCancel={() => {}}
				onConfirm={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("alertdialog", {
			name: "Excluir Turma 7A?",
		});
		expect(dialog).toHaveTextContent(
			"O grupo é excluído para todos os membros e o link de convite deixa de funcionar. Esta ação não pode ser desfeita.",
		);
		expect(
			within(dialog).getByRole("button", { name: "Excluir" }),
		).toBeVisible();
	});
});
