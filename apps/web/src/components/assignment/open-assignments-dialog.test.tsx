import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OpenAssignmentsDialog } from "./open-assignments-dialog";

const DAY_MS = 24 * 60 * 60 * 1000;
const assignment = (
	gameId: string,
	days: number,
	participantCount: number,
) => ({
	gameId,
	name: "Capitais",
	pin: "04352236",
	deadline: "2026-10-22T15:00:00.000Z",
	remainingMs: days * DAY_MS,
	participantCount,
});

function renderDialog(
	assignments = [assignment("a-1", 2, 1), assignment("a-2", 3, 0)],
) {
	const props = {
		onOpenChange: vi.fn(),
		onSelect: vi.fn(),
		onCreateNew: vi.fn(),
	};
	render(<OpenAssignmentsDialog open assignments={assignments} {...props} />);
	return { props, user: userEvent.setup() };
}

describe("OpenAssignmentsDialog (spec 029, RN-05a)", () => {
	it("lists the open assignments with their time left and participants", async () => {
		renderDialog();

		const dialog = await screen.findByRole("dialog", {
			name: "2 atividades em andamento",
		});
		expect(dialog).toHaveTextContent(
			"É possível selecionar a atividade abaixo para convidar mais participantes ou criar uma nova atividade.",
		);
		const items = within(dialog).getAllByRole("button", { name: /Capitais/ });
		expect(items.map((item) => item.textContent)).toEqual([
			"CapitaisTermina: em 2 diasParticipantes: 1",
			"CapitaisTermina: em 3 diasParticipantes: 0",
		]);
	});

	it("says atividade em andamento for one", async () => {
		renderDialog([assignment("a-1", 2, 1)]);

		expect(
			await screen.findByRole("dialog", { name: "Atividade em andamento" }),
		).toBeInTheDocument();
	});

	it("selecting one hands it back to share it", async () => {
		const { props, user } = renderDialog();

		await user.click(
			(
				await screen.findAllByRole("button", { name: /Capitais/ })
			)[1] as HTMLElement,
		);

		expect(props.onSelect).toHaveBeenCalledWith(assignment("a-2", 3, 0));
	});

	it("Criar novo goes on to a new one, and Cancelar closes", async () => {
		const { props, user } = renderDialog();

		await user.click(await screen.findByRole("button", { name: "Criar novo" }));
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(props.onCreateNew).toHaveBeenCalledOnce();
		expect(props.onOpenChange).toHaveBeenCalledWith(false);
	});
});
