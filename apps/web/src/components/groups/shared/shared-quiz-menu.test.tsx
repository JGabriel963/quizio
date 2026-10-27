import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { SharedQuizMenu } from "./shared-quiz-menu";

function renderMenu(canUnshare: boolean) {
	const user = userEvent.setup();
	const actions = {
		groupId: "g1",
		onDuplicate: vi.fn(async () => {}),
		onUnshare: vi.fn(async () => {}),
	};
	renderWithRouter(
		<SharedQuizMenu
			quiz={{ quizId: "capitais", title: "Capitais", canUnshare }}
			actions={actions}
		/>,
	);
	const open = async () =>
		user.click(
			await screen.findByRole("button", { name: "Opções de Capitais" }),
		);
	return { user, actions, open };
}

describe("SharedQuizMenu (spec 037, RN-11, RN-13)", () => {
	it("everybody gets Duplicar; who shared and the admin get Remover do grupo", async () => {
		const member = renderMenu(false);
		await member.open();

		expect(
			(await screen.findAllByRole("menuitem")).map((item) => item.textContent),
		).toEqual(["Duplicar"]);
		await member.user.click(screen.getByRole("menuitem", { name: "Duplicar" }));
		expect(member.actions.onDuplicate).toHaveBeenCalledWith("capitais");
	});

	it("Remover do grupo? confirms and unshares", async () => {
		const { user, actions, open } = renderMenu(true);
		await open();

		await user.click(
			await screen.findByRole("menuitem", { name: "Remover do grupo" }),
		);
		const confirm = await screen.findByRole("alertdialog", {
			name: "Remover do grupo?",
		});
		expect(confirm).toHaveTextContent(
			"Os membros deixam de ver e de usar Capitais.",
		);
		expect(actions.onUnshare).not.toHaveBeenCalled();
		await user.click(screen.getByRole("button", { name: "Remover" }));

		expect(actions.onUnshare).toHaveBeenCalledWith("capitais");
	});
});
