import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "./alert-dialog";

describe("AlertDialog", () => {
	it("calls the confirm action only after confirmation", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		render(
			<AlertDialog>
				<AlertDialogTrigger>Excluir definitivamente</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir o quiz?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta ação não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={onConfirm}>Excluir</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>,
		);

		await user.click(
			screen.getByRole("button", { name: "Excluir definitivamente" }),
		);
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(onConfirm).not.toHaveBeenCalled();

		await user.click(
			screen.getByRole("button", { name: "Excluir definitivamente" }),
		);
		await user.click(screen.getByRole("button", { name: "Excluir" }));

		expect(onConfirm).toHaveBeenCalledOnce();
	});
});
