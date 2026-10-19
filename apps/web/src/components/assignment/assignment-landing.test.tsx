import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { AssignmentLanding } from "./assignment-landing";

const DAY_MS = 24 * 60 * 60 * 1000;
const open = {
	status: "open" as const,
	name: "Capitais",
	creatorName: "Ana",
	remainingMs: 2 * DAY_MS,
	participantCount: 0,
};

describe("AssignmentLanding (spec 029, RN-46, RN-47)", () => {
	it("an open activity shows Atividade por, Aberto por, its name and its participants", async () => {
		renderWithRouter(
			<AssignmentLanding state={{ kind: "ready", view: open }} />,
		);

		expect(
			await screen.findByText(
				(_, element) =>
					element?.tagName === "P" &&
					element.textContent === "Atividade por Ana",
			),
		).toBeInTheDocument();
		expect(screen.getByText("Aberto por 2 dias")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Capitais" }),
		).toBeInTheDocument();
		expect(screen.getByText("0 participantes")).toBeInTheDocument();
		expect(screen.getByText("Não use seu nome verdadeiro")).toBeInTheDocument();
	});

	it("the nickname and Ok, vamos lá! are disabled and marked Em breve", async () => {
		renderWithRouter(
			<AssignmentLanding
				state={{ kind: "ready", view: { ...open, participantCount: 1 } }}
			/>,
		);

		expect(await screen.findByText("1 participante")).toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Insira um apelido" }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Ok, vamos lá!" }),
		).toBeDisabled();
		expect(screen.getByText("Em breve")).toBeInTheDocument();
		expect(
			screen.getByText("Esta atividade estará disponível para jogar em breve."),
		).toBeInTheDocument();
	});

	it("an ended activity says Esta atividade foi encerrada with the way to the PIN", async () => {
		renderWithRouter(
			<AssignmentLanding
				state={{ kind: "ready", view: { status: "ended", name: "Capitais" } }}
			/>,
		);

		expect(
			await screen.findByRole("heading", {
				name: "Esta atividade foi encerrada",
			}),
		).toBeInTheDocument();
		expect(screen.getByText("Capitais")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Entrar com um PIN" }),
		).toHaveAttribute("href", "/join");
	});

	it("a missing activity says so, with the way to the PIN", async () => {
		renderWithRouter(<AssignmentLanding state={{ kind: "missing" }} />);

		expect(
			await screen.findByRole("heading", { name: "Atividade não encontrada" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Entrar com um PIN" }),
		).toHaveAttribute("href", "/join");
	});

	it("a failure to load offers Tentar novamente", async () => {
		const onRetry = vi.fn();
		renderWithRouter(<AssignmentLanding state={{ kind: "error", onRetry }} />);

		await userEvent
			.setup()
			.click(await screen.findByRole("button", { name: "Tentar novamente" }));

		expect(onRetry).toHaveBeenCalledOnce();
	});
});
