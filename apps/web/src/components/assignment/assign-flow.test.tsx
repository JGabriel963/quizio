import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { AssignFlow } from "./assign-flow";

const now = new Date(2026, 9, 19, 14, 11);
const setup = {
	options: {
		gameCharacters: false,
		questionTimer: true,
		randomizeAnswers: false,
	},
	maxDeadlineDays: 28,
};

describe("AssignFlow (spec 029, RN-17, RN-26)", () => {
	it("after Criar uma tarefa, the share dialog shows the new PIN; closing it hands back the assignment", async () => {
		const user = userEvent.setup();
		const onDone = vi.fn();
		const onCreate = vi.fn(async () => ({ gameId: "game-9", pin: "04352236" }));
		renderWithRouter(
			<AssignFlow
				open
				onOpenChange={() => {}}
				quizTitle="Capitais"
				setup={setup}
				now={now}
				origin="https://quizio.app"
				openAssignments={[]}
				onCreate={onCreate}
				onDone={onDone}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "Criar uma tarefa" }),
		);
		expect(
			await screen.findByRole("dialog", {
				name: "Compartilhe com os participantes",
			}),
		).toHaveTextContent("0435 2236");
		expect(screen.getByRole("link", { name: /Capitais/ })).toHaveTextContent(
			"Termina: em 3 dias",
		);

		await user.click(screen.getByRole("button", { name: "Fechar" }));

		expect(onDone).toHaveBeenCalledWith({ gameId: "game-9" });
	});
});

describe("AssignFlow with open assignments (spec 029, RN-05a)", () => {
	const DAY_MS = 24 * 60 * 60 * 1000;
	const open = {
		gameId: "game-1",
		name: "Capitais",
		pin: "11112222",
		deadline: "2026-10-21T15:00:00.000Z",
		remainingMs: 2 * DAY_MS,
		participantCount: 1,
	};

	function renderFlow(openAssignments: (typeof open)[] | undefined) {
		const onCreate = vi.fn(async () => ({ gameId: "game-9", pin: "04352236" }));
		renderWithRouter(
			<AssignFlow
				open
				onOpenChange={() => {}}
				quizTitle="Capitais"
				setup={setup}
				now={now}
				origin="https://quizio.app"
				openAssignments={openAssignments}
				onCreate={onCreate}
				onDone={vi.fn()}
			/>,
		);
		return { onCreate, user: userEvent.setup() };
	}

	it("shows them first, and selecting one shares it", async () => {
		const { onCreate, user } = renderFlow([open]);

		await user.click(
			await screen.findByRole("button", { name: /Termina: em 2 dias/ }),
		);

		expect(
			await screen.findByRole("dialog", {
				name: "Compartilhe com os participantes",
			}),
		).toHaveTextContent("1111 2222");
		expect(onCreate).not.toHaveBeenCalled();
	});

	it("Criar novo creates another one, with its own PIN", async () => {
		const { onCreate, user } = renderFlow([open]);

		await user.click(await screen.findByRole("button", { name: "Criar novo" }));
		await user.click(
			await screen.findByRole("button", { name: "Criar uma tarefa" }),
		);

		expect(onCreate).toHaveBeenCalledOnce();
		expect(
			await screen.findByRole("dialog", {
				name: "Compartilhe com os participantes",
			}),
		).toHaveTextContent("0435 2236");
	});

	it("waits for the list before showing anything", async () => {
		renderFlow(undefined);
		// A dialog opens on the next frames: give it the time to.
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
