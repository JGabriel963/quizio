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
