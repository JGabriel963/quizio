import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LibraryItemView } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { AssignInGroupFlow } from "./assign-in-group-flow";

const quiz = (id: string, title: string) =>
	({
		id,
		title,
		description: "",
		coverImageUrl: null,
		visibility: "private",
		status: "published",
		hasUnpublishedChanges: false,
		questionCount: 5,
		updatedAt: new Date().toISOString(),
		trashedAt: null,
	}) as LibraryItemView;

const setup = {
	maxDeadlineDays: 28,
	options: {
		gameCharacters: false,
		questionTimer: true,
		randomizeAnswers: false,
	},
};
const now = new Date(2026, 9, 26, 15, 1);
const deadline = new Date(2026, 9, 29, 12);

async function renderFlow(onAssign = vi.fn(async () => {})) {
	const user = userEvent.setup();
	const onClose = vi.fn();
	renderWithRouter(
		<AssignInGroupFlow
			open
			quizzes={[quiz("quiz-1", "Capitais"), quiz("quiz-2", "Geografia")]}
			ownerName="Ana"
			setup={setup}
			now={now}
			onAssign={onAssign}
			onClose={onClose}
		/>,
	);
	const pick = async (title: string) =>
		user.click(
			within(
				await screen.findByRole("dialog", { name: "Selecionar kahoot" }),
			).getByRole("button", { name: new RegExp(title) }),
		);
	const settings = () =>
		screen.findByRole("dialog", {
			name: "Configurações da atividade atribuída",
		});
	const post = () => screen.findByRole("dialog", { name: "Criar publicação" });
	return { user, onAssign, onClose, pick, settings, post };
}

describe("AssignInGroupFlow (spec 038, RN-04 to RN-11)", () => {
	it("select, configure and assign now", async () => {
		const { user, onAssign, onClose, pick, settings } = await renderFlow();

		await pick("Capitais");
		await user.click(
			within(await settings()).getByRole("button", { name: "Atribuir agora" }),
		);

		expect(onAssign).toHaveBeenCalledWith({
			quizId: "quiz-1",
			deadline,
			options: setup.options,
		});
		expect(onClose).toHaveBeenCalled();
	});

	it("with a message", async () => {
		const { user, onAssign, pick, settings, post } = await renderFlow();

		await pick("Capitais");
		await user.click(
			within(await settings()).getByRole("button", {
				name: "Adicionar mensagem",
			}),
		);
		const dialog = await post();
		await user.type(
			within(dialog).getByPlaceholderText("Digite seu texto"),
			"Revisem",
		);
		await user.click(within(dialog).getByRole("button", { name: "Publicar" }));

		expect(onAssign).toHaveBeenCalledWith({
			quizId: "quiz-1",
			deadline,
			options: setup.options,
			message: "Revisem",
		});
	});

	it("Cancelar on the message creates nothing", async () => {
		const { user, onAssign, onClose, pick, settings, post } =
			await renderFlow();

		await pick("Capitais");
		await user.click(
			within(await settings()).getByRole("button", {
				name: "Adicionar mensagem",
			}),
		);
		await user.click(
			within(await post()).getByRole("button", { name: "Cancelar" }),
		);

		expect(onAssign).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it("X keeps the deadline, the options and the text", async () => {
		const { user, onAssign, pick, settings, post } = await renderFlow();

		await pick("Capitais");
		await user.click(
			within(await settings()).getByRole("switch", { name: "Personagens" }),
		);
		await user.click(
			within(await settings()).getByRole("button", {
				name: "Adicionar mensagem",
			}),
		);
		await user.type(
			within(await post()).getByPlaceholderText("Digite seu texto"),
			"Revisem",
		);
		await user.click(
			within(await post()).getByRole("button", { name: "Trocar o quiz" }),
		);
		await pick("Geografia");
		const dialog = await post();
		expect(within(dialog).getByText("Geografia")).toBeVisible();
		expect(within(dialog).getByPlaceholderText("Digite seu texto")).toHaveValue(
			"Revisem",
		);
		await user.click(within(dialog).getByRole("button", { name: "Publicar" }));

		expect(onAssign).toHaveBeenCalledWith({
			quizId: "quiz-2",
			deadline,
			options: { ...setup.options, gameCharacters: true },
			message: "Revisem",
		});
	});
});
