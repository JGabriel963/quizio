import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { AssignmentSummary } from "./assignment-summary";

const DAY_MS = 24 * 60 * 60 * 1000;
const assignment = {
	open: true,
	deadline: "2026-10-22T15:00:00.000Z",
	remainingMs: 3 * DAY_MS,
	pin: "04352236",
};

function renderSummary(participantCount = 1) {
	const actions = {
		onShare: vi.fn(),
		onChangeDeadline: vi.fn(),
		onEnd: vi.fn(),
	};
	renderWithRouter(
		<AssignmentSummary
			gameId="game-1"
			name="Capitais"
			participantCount={participantCount}
			assignment={assignment}
			origin="https://quizio.app"
			{...actions}
		/>,
	);
	return { actions, user: userEvent.setup() };
}

describe("AssignmentSummary (spec 029, RN-32, RN-33)", () => {
	it("shows the participants ring, Convide mais participantes and Compartilhar atividade atribuída", async () => {
		const { actions, user } = renderSummary(1);

		const invite = await screen.findByRole("region", {
			name: "Convidar participantes",
		});
		expect(within(invite).getByText("1")).toBeInTheDocument();
		expect(within(invite).getByText("participante")).toBeInTheDocument();
		expect(
			within(invite).getByRole("heading", {
				name: "Convide mais participantes!",
			}),
		).toBeInTheDocument();
		expect(
			within(invite).getByText(
				"Convide participantes compartilhando a URL ou o PIN. Eles podem participar deste quiz até o prazo estipulado.",
			),
		).toBeInTheDocument();
		await user.click(
			within(invite).getByRole("button", {
				name: "Compartilhar atividade atribuída",
			}),
		);

		expect(actions.onShare).toHaveBeenCalledOnce();
	});

	it("says participantes in the plural", async () => {
		renderSummary(0);

		expect(await screen.findByText("participantes")).toBeInTheDocument();
	});

	it("shows the QR, the PIN and the URL with Copiar", async () => {
		const { user } = renderSummary();

		expect(
			await screen.findByRole("img", { name: "Código QR da atividade" }),
		).toBeInTheDocument();
		expect(screen.getByText("0435 2236")).toBeInTheDocument();
		expect(
			screen.getByText("https://quizio.app/assignment/game-1"),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Copiar PIN do jogo" }),
		);
		expect(await navigator.clipboard.readText()).toBe("04352236");
		await user.click(screen.getByRole("button", { name: "Copiar URL" }));
		expect(await navigator.clipboard.readText()).toBe(
			"https://quizio.app/assignment/game-1",
		);
	});

	it("Baixar downloads a PNG of the QR", async () => {
		const { user } = renderSummary();
		const toDataURL = vi
			.spyOn(HTMLCanvasElement.prototype, "toDataURL")
			.mockReturnValue("data:image/png;base64,QR");
		const clicked: HTMLAnchorElement[] = [];
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(function (this: HTMLAnchorElement) {
				clicked.push(this);
			});

		await user.click(await screen.findByRole("button", { name: "Baixar" }));

		expect(clicked[0]?.href).toBe("data:image/png;base64,QR");
		expect(clicked[0]?.download).toBe("qr-capitais.png");
		toDataURL.mockRestore();
		click.mockRestore();
	});

	it("Alterar prazo and Encerrar agora call their actions", async () => {
		const { actions, user } = renderSummary();

		await user.click(
			await screen.findByRole("button", { name: "Alterar prazo" }),
		);
		await user.click(screen.getByRole("button", { name: "Encerrar agora" }));

		expect(actions.onChangeDeadline).toHaveBeenCalledOnce();
		expect(actions.onEnd).toHaveBeenCalledOnce();
	});

	it("Jogue este quiz is a link to the activity in a new tab", async () => {
		renderSummary();

		const play = await screen.findByRole("region", { name: "Jogue este quiz" });
		const link = within(play).getByRole("link", { name: /Jogue este quiz/ });
		expect(link).toHaveAttribute(
			"href",
			"https://quizio.app/assignment/game-1",
		);
		expect(link).toHaveAttribute("target", "_blank");
		expect(within(play).queryByText("Em breve")).toBeNull();
	});
});
