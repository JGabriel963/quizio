import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GroupSettingsPanel } from "./group-settings";

const settings = {
	name: "Turma 7A",
	description: "",
	permissions: {
		membersCanInvite: true,
		membersCanSeeMembers: true,
		membersCanShare: true,
		membersCanAssign: false,
	},
};

describe("GroupSettingsPanel (spec 035, RN-03)", () => {
	it("shows the four sections in order, with the texts of Kahoot", () => {
		render(
			<GroupSettingsPanel
				settings={settings}
				onToggle={async () => {}}
				onEditDetails={() => {}}
			/>,
		);

		expect(
			screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
		).toEqual([
			"Personalizar grupo",
			"Pessoas",
			"Conteúdo compartilhado",
			"Atividades atribuídas",
		]);
		expect(screen.getByText("Fale um pouco sobre o seu grupo.")).toBeVisible();
		expect(
			screen.getByText(
				"A lista de membros ficará visível para todos no grupo.",
			),
		).toBeVisible();
	});

	it("a switch shows its value and calls onToggle", async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn(async () => {});
		render(
			<GroupSettingsPanel
				settings={settings}
				onToggle={onToggle}
				onEditDetails={() => {}}
			/>,
		);

		const invite = screen.getByRole("switch", {
			name: "Os membros podem convidar outras pessoas",
		});
		const assign = screen.getByRole("switch", {
			name: "Os membros podem criar atividades",
		});
		expect(invite).toBeChecked();
		expect(assign).not.toBeChecked();

		await user.click(assign);

		expect(onToggle).toHaveBeenCalledWith("membersCanAssign", true);
		expect(assign).toBeChecked();
	});

	it("a failed switch goes back and tells Não foi possível salvar a configuração.", async () => {
		const user = userEvent.setup();
		render(
			<GroupSettingsPanel
				settings={settings}
				onToggle={async () => {
					throw new Error("offline");
				}}
				onEditDetails={() => {}}
			/>,
		);
		const share = screen.getByRole("switch", {
			name: "Os membros podem compartilhar conteúdo",
		});

		await user.click(share);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível salvar a configuração.",
		);
		expect(share).toBeChecked();
	});

	it("Editar opens Nome e descrição", async () => {
		const user = userEvent.setup();
		const onEditDetails = vi.fn();
		render(
			<GroupSettingsPanel
				settings={settings}
				onToggle={async () => {}}
				onEditDetails={onEditDetails}
			/>,
		);

		const details = screen.getByRole("region", { name: "Personalizar grupo" });
		await user.click(within(details).getByRole("button", { name: "Editar" }));

		expect(onEditDetails).toHaveBeenCalled();
	});
});
