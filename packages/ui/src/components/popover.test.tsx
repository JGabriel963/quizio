import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "./popover";

function Example() {
	return (
		<div>
			<Popover>
				<PopoverTrigger>Notificações</PopoverTrigger>
				<PopoverContent>
					<PopoverTitle>Painel</PopoverTitle>
					<p>Conteúdo</p>
				</PopoverContent>
			</Popover>
			<p>Fora</p>
		</div>
	);
}

describe("Popover", () => {
	it("opens from its trigger, closes with Escape and outside clicks", async () => {
		const user = userEvent.setup();
		render(<Example />);

		await user.click(screen.getByRole("button", { name: "Notificações" }));
		const popup = await screen.findByRole("dialog", { name: "Painel" });
		expect(popup).toHaveAttribute("data-slot", "popover-content");
		expect(screen.getByText("Conteúdo")).toBeVisible();

		await user.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByText("Conteúdo")).toBeNull());

		await user.click(screen.getByRole("button", { name: "Notificações" }));
		await screen.findByText("Conteúdo");
		await user.click(screen.getByText("Fora"));
		await waitFor(() => expect(screen.queryByText("Conteúdo")).toBeNull());
	});
});
