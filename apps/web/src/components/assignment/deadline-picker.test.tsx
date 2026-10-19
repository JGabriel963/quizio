import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { deadlineBounds } from "@/lib/assignment-deadline";

import { DeadlinePicker } from "./deadline-picker";

const now = new Date(2026, 9, 19, 14, 11);
const bounds = deadlineBounds(now, 28);

function renderPicker(value = new Date(2026, 9, 22, 12, 0)) {
	const onApply = vi.fn();
	const onCancel = vi.fn();
	render(
		<DeadlinePicker
			value={value}
			bounds={bounds}
			onApply={onApply}
			onCancel={onCancel}
		/>,
	);
	return { onApply, onCancel, user: userEvent.setup() };
}

const day = (label: string) => screen.getByRole("button", { name: label });

describe("DeadlinePicker (spec 029, RN-09)", () => {
	it("shows the month with days out of bounds disabled", () => {
		renderPicker();

		expect(screen.getByText("outubro 2026")).toBeInTheDocument();
		expect(day("18 de outubro de 2026")).toBeDisabled();
		expect(day("19 de outubro de 2026")).toBeEnabled();
		expect(day("22 de outubro de 2026")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByRole("button", { name: "Mês anterior" })).toBeDisabled();
	});

	it("today lists only the hours ahead", async () => {
		const { user } = renderPicker();

		await user.click(day("19 de outubro de 2026"));
		await user.click(screen.getByRole("combobox", { name: "Tempo" }));
		const hours = (await screen.findAllByRole("option")).map((option) =>
			option.textContent?.trim(),
		);

		expect(hours[0]).toBe("15:00");
		expect(hours.at(-1)).toBe("23:00");
	});

	it("Definir applies the day and the hour", async () => {
		const { user, onApply } = renderPicker();

		await user.click(day("30 de outubro de 2026"));
		await user.click(screen.getByRole("combobox", { name: "Tempo" }));
		await user.click(await screen.findByRole("option", { name: "18:00" }));
		await user.click(screen.getByRole("button", { name: "Definir" }));

		expect(onApply).toHaveBeenCalledWith(new Date(2026, 9, 30, 18, 0));
	});

	it("Cancelar keeps the deadline", async () => {
		const { user, onApply, onCancel } = renderPicker();

		await user.click(day("30 de outubro de 2026"));
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(onCancel).toHaveBeenCalled();
		expect(onApply).not.toHaveBeenCalled();
	});
});
