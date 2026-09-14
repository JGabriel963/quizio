import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DeletePermanentlyDialog } from "./delete-permanently-dialog";

function renderDialog() {
	const props = {
		quizTitle: "Bom de Bíblia",
		open: true,
		onOpenChange: vi.fn(),
		onConfirm: vi.fn(),
	};
	render(<DeletePermanentlyDialog {...props} />);
	return props;
}

describe("DeletePermanentlyDialog", () => {
	it("keeps the quiz when cancelled", async () => {
		const props = renderDialog();

		expect(
			screen.getByText("Excluir “Bom de Bíblia” definitivamente?"),
		).toBeInTheDocument();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(props.onOpenChange).toHaveBeenCalledWith(false);
		expect(props.onConfirm).not.toHaveBeenCalled();
	});

	it("deletes the quiz when confirmed", async () => {
		const props = renderDialog();

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Excluir definitivamente" }));

		expect(props.onConfirm).toHaveBeenCalledOnce();
	});
});
