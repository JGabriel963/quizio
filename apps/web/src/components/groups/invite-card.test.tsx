import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { InviteCard } from "./invite-card";

describe("InviteCard (spec 034, RN-25, RN-28)", () => {
	it("a pending invitation shows the group's name with Cancelar and Aceitar convite", async () => {
		const user = userEvent.setup();
		const onAccept = vi.fn();
		renderWithRouter(
			<InviteCard
				invitation={{ status: "pending", groupId: "g1", name: "Turma 7A" }}
				accepting={false}
				onAccept={onAccept}
			/>,
		);

		expect(
			await screen.findByRole("heading", {
				name: "O convite para entrar no grupo aguarda sua resposta",
			}),
		).toBeVisible();
		expect(screen.getByText("Turma 7A")).toBeVisible();
		expect(
			screen.getByText("Aceite o convite e faça parte do grupo agora."),
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Aceitar convite" }));
		expect(onAccept).toHaveBeenCalled();
	});

	it("Aceitar convite is busy while joining", async () => {
		renderWithRouter(
			<InviteCard
				invitation={{ status: "pending", groupId: "g1", name: "Turma 7A" }}
				accepting
				onAccept={() => {}}
			/>,
		);

		expect(
			await screen.findByRole("button", { name: "Aceitar convite" }),
		).toBeDisabled();
	});

	it("Cancelar goes home without joining", async () => {
		const onAccept = vi.fn();
		renderWithRouter(
			<InviteCard
				invitation={{ status: "pending", groupId: "g1", name: "Turma 7A" }}
				accepting={false}
				onAccept={onAccept}
			/>,
		);

		// A link styled as a button (the design system's pattern).
		const cancel = (await screen.findByText("Cancelar")).closest("a");
		expect(cancel).toHaveAttribute("href", "/");
		expect(onAccept).not.toHaveBeenCalled();
	});

	it("an invalid invitation shows Este convite não é mais válido with Ir para o início", async () => {
		renderWithRouter(
			<InviteCard
				invitation={{ status: "invalid" }}
				accepting={false}
				onAccept={() => {}}
			/>,
		);

		expect(
			await screen.findByRole("heading", {
				name: "Este convite não é mais válido",
			}),
		).toBeVisible();
		expect(
			screen.getByText("Peça um novo link a quem administra o grupo."),
		).toBeVisible();
		expect(screen.getByText("Ir para o início").closest("a")).toHaveAttribute(
			"href",
			"/",
		);
		expect(
			screen.queryByRole("button", { name: "Aceitar convite" }),
		).toBeNull();
	});
});
