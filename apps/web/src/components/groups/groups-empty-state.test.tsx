import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GroupsEmptyState } from "./groups-empty-state";

describe("GroupsEmptyState (spec 034, RN-09)", () => {
	it("shows Colaborar, Atribuir and Competir with Criar grupo when managing none", async () => {
		const user = userEvent.setup();
		const onCreate = vi.fn();
		render(<GroupsEmptyState kind="managed" onCreate={onCreate} />);

		for (const label of ["Colaborar", "Atribuir", "Competir"]) {
			expect(screen.getByText(label)).toBeVisible();
		}
		expect(
			screen.getByText(/Os grupos são o ponto de encontro e comunicação/),
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Criar grupo" }));
		expect(onCreate).toHaveBeenCalled();
	});

	it("explains how to join when in no group", () => {
		render(<GroupsEmptyState kind="joined" onCreate={() => {}} />);

		expect(
			screen.getByText(
				"Você ainda não participa de nenhum grupo. Peça o link de convite a quem administra o grupo.",
			),
		).toBeVisible();
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("says Nenhum grupo encontrado. for a search", () => {
		render(<GroupsEmptyState kind="search" onCreate={() => {}} />);

		expect(screen.getByText("Nenhum grupo encontrado.")).toBeVisible();
		expect(screen.queryByText("Colaborar")).toBeNull();
	});
});
