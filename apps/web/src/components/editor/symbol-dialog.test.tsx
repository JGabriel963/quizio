import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SymbolDialog } from "./symbol-dialog";

function Opened({ onPick }: { onPick: (symbol: string) => void }) {
	const [open, setOpen] = useState(true);
	return (
		<>
			<button type="button">Fora</button>
			<SymbolDialog open={open} onOpenChange={setOpen} onPick={onPick} />
		</>
	);
}

const dialog = () => screen.getByRole("dialog", { name: "Insira um símbolo" });

describe("SymbolDialog (spec 047, RN-11 to RN-13, RN-17)", () => {
	it("opens on Caracteres especiais with five tabs and Cancelar", () => {
		render(<Opened onPick={() => {}} />);

		expect(
			within(dialog())
				.getAllByRole("tab")
				.map((tab) => tab.textContent),
		).toEqual([
			"Caracteres especiais",
			"Moeda",
			"Matemática",
			"Grego",
			"Outro",
		]);
		expect(
			within(dialog()).getByRole("tab", { name: "Caracteres especiais" }),
		).toHaveAttribute("aria-selected", "true");
		expect(within(dialog()).getByRole("button", { name: "À" })).toBeVisible();
		expect(
			within(dialog()).getByRole("button", { name: "Cancelar" }),
		).toBeInTheDocument();
	});

	it("picking a symbol calls onPick and closes", async () => {
		const user = userEvent.setup();
		const onPick = vi.fn();
		render(<Opened onPick={onPick} />);

		await user.click(within(dialog()).getByRole("tab", { name: "Matemática" }));
		await user.click(within(dialog()).getByRole("button", { name: "π" }));

		expect(onPick).toHaveBeenCalledWith("π");
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("Cancelar, Esc and outside close without picking", async () => {
		const user = userEvent.setup();
		const onPick = vi.fn();
		const first = render(<Opened onPick={onPick} />);
		await user.click(
			within(dialog()).getByRole("button", { name: "Cancelar" }),
		);
		expect(screen.queryByRole("dialog")).toBeNull();
		first.unmount();

		const second = render(<Opened onPick={onPick} />);
		await user.keyboard("{Escape}");
		expect(screen.queryByRole("dialog")).toBeNull();
		second.unmount();

		render(<Opened onPick={onPick} />);
		await user.click(document.body);
		expect(screen.queryByRole("dialog")).toBeNull();

		expect(onPick).not.toHaveBeenCalled();
	});

	it("arrows move in the grid and Enter picks", async () => {
		const user = userEvent.setup();
		const onPick = vi.fn();
		render(<Opened onPick={onPick} />);
		await user.click(within(dialog()).getByRole("tab", { name: "Grego" }));
		within(dialog()).getByRole("button", { name: "Α" }).focus();

		await user.keyboard("{ArrowRight}{ArrowRight}");
		expect(within(dialog()).getByRole("button", { name: "Γ" })).toHaveFocus();
		await user.keyboard("{Enter}");

		expect(onPick).toHaveBeenCalledWith("Γ");
	});

	it("the scroll button shows while there is more below", async () => {
		render(<Opened onPick={() => {}} />);
		const grid = within(dialog()).getByRole("group", {
			name: "Caracteres especiais",
		});
		expect(
			within(dialog()).queryByRole("button", { name: "Ver mais símbolos" }),
		).toBeNull();

		Object.defineProperty(grid, "scrollHeight", { value: 900 });
		Object.defineProperty(grid, "clientHeight", { value: 300 });
		fireEvent.scroll(grid);

		expect(
			await within(dialog()).findByRole("button", {
				name: "Ver mais símbolos",
			}),
		).toBeInTheDocument();
	});
});
