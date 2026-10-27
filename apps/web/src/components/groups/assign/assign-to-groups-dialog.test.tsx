import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AssignableGroupData } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { AssignToGroupsDialog } from "./assign-to-groups-dialog";

async function renderDialog(
	groups: AssignableGroupData[] | undefined,
	onAssign = vi.fn(async (_groupIds: string[]) => {}),
) {
	const user = userEvent.setup();
	const onClose = vi.fn();
	renderWithRouter(
		<AssignToGroupsDialog
			open
			groups={groups}
			onAssign={onAssign}
			onClose={onClose}
		/>,
	);
	const dialog = await screen.findByRole("dialog", {
		name: "Atribuir a grupos",
	});
	return { user, dialog, onAssign, onClose };
}

describe("AssignToGroupsDialog (spec 038, RN-26, RN-27)", () => {
	it("lists the groups with checks; Já atribuída is checked and disabled", async () => {
		const { dialog } = await renderDialog([
			{ id: "g1", name: "Turma 7A", alreadyAssigned: false },
			{ id: "g2", name: "Coral", alreadyAssigned: true },
		]);

		const turma = within(dialog).getByRole("checkbox", { name: "Turma 7A" });
		expect(turma).not.toBeChecked();
		const coral = within(dialog).getByRole("checkbox", { name: /Coral/ });
		expect(coral).toBeChecked();
		expect(coral).toHaveAttribute("aria-disabled", "true");
		expect(dialog).toHaveTextContent("Já atribuída");
	});

	it("Atribuir is disabled without a check and sends the checked groups", async () => {
		const { user, dialog, onAssign, onClose } = await renderDialog([
			{ id: "g1", name: "Turma 7A", alreadyAssigned: false },
			{ id: "g2", name: "Coral", alreadyAssigned: false },
			{ id: "g3", name: "Jovens", alreadyAssigned: true },
		]);

		const assign = within(dialog).getByRole("button", { name: "Atribuir" });
		expect(assign).toBeDisabled();
		await user.click(
			within(dialog).getByRole("checkbox", { name: "Turma 7A" }),
		);
		await user.click(within(dialog).getByRole("checkbox", { name: "Coral" }));
		await user.click(assign);

		expect(onAssign).toHaveBeenCalledWith(["g1", "g2"]);
		expect(onClose).toHaveBeenCalled();
	});

	it("a refusal keeps the dialog open", async () => {
		const { user, dialog, onClose } = await renderDialog(
			[{ id: "g1", name: "Turma 7A", alreadyAssigned: false }],
			vi.fn(async () => {
				throw new Error("refused");
			}),
		);

		await user.click(
			within(dialog).getByRole("checkbox", { name: "Turma 7A" }),
		);
		await user.click(within(dialog).getByRole("button", { name: "Atribuir" }));

		expect(onClose).not.toHaveBeenCalled();
		expect(
			within(dialog).getByRole("button", { name: "Atribuir" }),
		).toBeEnabled();
	});

	it("without groups offers Criar grupo", async () => {
		const { dialog } = await renderDialog([]);

		expect(dialog).toHaveTextContent(
			"Você não tem grupos onde possa atribuir.",
		);
		expect(
			within(dialog).getByText("Criar grupo").closest("a"),
		).toHaveAttribute("href", "/groups?section=managed");
		expect(
			within(dialog).queryByRole("button", { name: "Atribuir" }),
		).toBeNull();
	});
});
