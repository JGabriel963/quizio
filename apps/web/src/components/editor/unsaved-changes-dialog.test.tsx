import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UnsavedChangesDialog } from "./unsaved-changes-dialog";

function renderDialog({ open = true, busy = false } = {}) {
	const props = { onDiscard: vi.fn(), onLeave: vi.fn(), onBack: vi.fn() };
	render(<UnsavedChangesDialog open={open} busy={busy} {...props} />);
	return { props, user: userEvent.setup() };
}

describe("UnsavedChangesDialog", () => {
	it("asks what to do with the changes", () => {
		renderDialog();

		expect(
			screen.getByRole("heading", {
				name: "Algumas alterações não foram salvas",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText("Se você descartar as alterações, elas serão perdidas."),
		).toBeInTheDocument();
		expect(
			screen.getAllByRole("button").map((button) => button.textContent),
		).toEqual(["Descartar", "Deixar sem salvar", "Voltar para edição"]);
	});

	it("Descartar and Deixar sem salvar call their actions", async () => {
		const { props, user } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Descartar" }));
		expect(props.onDiscard).toHaveBeenCalledOnce();
		expect(props.onLeave).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "Deixar sem salvar" }));
		expect(props.onLeave).toHaveBeenCalledOnce();
	});

	it("Voltar para edição closes the dialog", async () => {
		const { props, user } = renderDialog();

		await user.click(
			screen.getByRole("button", { name: "Voltar para edição" }),
		);
		await user.keyboard("{Escape}");

		expect(props.onBack).toHaveBeenCalledTimes(2);
		expect(props.onDiscard).not.toHaveBeenCalled();
		expect(props.onLeave).not.toHaveBeenCalled();
	});

	it("waits while busy", async () => {
		const { props, user } = renderDialog({ busy: true });

		for (const button of screen.getAllByRole("button")) {
			expect(button).toBeDisabled();
		}
		await user.keyboard("{Escape}");

		expect(props.onBack).not.toHaveBeenCalled();
	});

	it("is closed otherwise", () => {
		renderDialog({ open: false });

		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
