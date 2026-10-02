import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./sheet";

function renderSheet() {
	return render(
		<Sheet>
			<SheetTrigger>Configurações</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Configurações</SheetTitle>
					<SheetDescription>Ajuste a partida.</SheetDescription>
				</SheetHeader>
				<p>Corpo do painel</p>
				<SheetFooter>Rodapé</SheetFooter>
			</SheetContent>
		</Sheet>,
	);
}

describe("Sheet", () => {
	it("opens with its title", async () => {
		renderSheet();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

		await userEvent.click(
			screen.getByRole("button", { name: "Configurações" }),
		);

		const panel = screen.getByRole("dialog", { name: "Configurações" });
		expect(panel).toHaveAttribute("data-slot", "sheet-content");
		expect(panel).toHaveAttribute("data-side", "right");
		expect(panel).toHaveTextContent("Corpo do painel");
	});

	it("closes with the button and with Escape", async () => {
		renderSheet();
		const trigger = screen.getByRole("button", { name: "Configurações" });

		await userEvent.click(trigger);
		await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);

		await userEvent.click(trigger);
		await userEvent.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});

	it("opens on the side it is told", async () => {
		render(
			<Sheet defaultOpen>
				<SheetContent side="left">
					<SheetTitle>Menu</SheetTitle>
				</SheetContent>
			</Sheet>,
		);

		expect(screen.getByRole("dialog", { name: "Menu" })).toHaveAttribute(
			"data-side",
			"left",
		);
	});
});
