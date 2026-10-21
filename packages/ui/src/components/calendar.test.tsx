import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Calendar } from "./calendar";

const october = new Date(2026, 9, 1);

describe("Calendar", () => {
	it("weeks start on Monday, in Portuguese", () => {
		render(<Calendar month={october} onMonthChange={() => {}} />);

		expect(screen.getByText("outubro 2026")).toBeInTheDocument();
		const grid = screen.getByRole("table");
		expect(
			within(grid)
				.getAllByRole("columnheader")
				.map((header) => header.textContent),
		).toEqual(["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]);
		// 1 October 2026 is a Thursday: three empty cells come before it.
		const firstWeek = within(grid).getAllByRole("row")[1];
		expect(
			within(firstWeek as HTMLElement)
				.getAllByRole("cell")
				.map((cell) => cell.textContent),
		).toEqual(["", "", "", "1", "2", "3", "4"]);
	});

	it("disabled days cannot be picked", async () => {
		const onSelect = vi.fn();
		render(
			<Calendar
				month={october}
				onMonthChange={() => {}}
				onSelect={onSelect}
				isDisabled={(day) => day.getDate() < 19}
			/>,
		);

		const past = screen.getByRole("button", { name: "18 de outubro de 2026" });
		expect(past).toBeDisabled();
		await userEvent.click(past);

		expect(onSelect).not.toHaveBeenCalled();
	});

	it("picking a day calls onSelect and marks it", async () => {
		const onSelect = vi.fn();
		const { rerender } = render(
			<Calendar month={october} onMonthChange={() => {}} onSelect={onSelect} />,
		);

		await userEvent.click(
			screen.getByRole("button", { name: "22 de outubro de 2026" }),
		);
		rerender(
			<Calendar
				month={october}
				onMonthChange={() => {}}
				onSelect={onSelect}
				selected={new Date(2026, 9, 22)}
			/>,
		);

		expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 22));
		expect(
			screen.getByRole("button", { name: "22 de outubro de 2026" }),
		).toHaveAttribute("aria-pressed", "true");
	});

	it("moves between months, within the bounds it is given", async () => {
		const onMonthChange = vi.fn();
		render(
			<Calendar
				month={october}
				onMonthChange={onMonthChange}
				canGoBack={false}
			/>,
		);

		expect(screen.getByRole("button", { name: "Mês anterior" })).toBeDisabled();
		await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));

		expect(onMonthChange).toHaveBeenCalledWith(new Date(2026, 10, 1));
	});
});
