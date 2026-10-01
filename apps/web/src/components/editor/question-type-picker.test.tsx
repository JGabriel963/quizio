import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuestionTypePicker } from "./question-type-picker";

function renderPicker(unavailableReason: string | null = null) {
	const onPick = vi.fn();
	render(
		<QuestionTypePicker
			unavailableReason={unavailableReason}
			onPick={onPick}
		/>,
	);
	return { onPick, user: userEvent.setup() };
}

const addButton = () => screen.getByRole("button", { name: "Adicionar" });

describe("QuestionTypePicker", () => {
	it("lists Quiz and Verdadeiro ou falso under Testar conhecimento", async () => {
		const { onPick, user } = renderPicker();
		expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();

		await user.click(addButton());

		expect(
			(await screen.findAllByRole("menuitem")).map((item) =>
				item.textContent?.trim(),
			),
		).toEqual(["Quiz", "Verdadeiro ou falso"]);
		expect(
			screen.getByRole("group", { name: "Testar conhecimento" }),
		).toBeInTheDocument();
		expect(onPick).not.toHaveBeenCalled();
	});

	it.each([
		["Quiz", "quiz"],
		["Verdadeiro ou falso", "trueFalse"],
	])("choosing %s calls back with its type and closes", async (name, type) => {
		const { onPick, user } = renderPicker();
		await user.click(addButton());

		await user.click(await screen.findByRole("menuitem", { name }));

		expect(onPick).toHaveBeenCalledExactlyOnceWith(type);
		await vi.waitFor(() =>
			expect(screen.queryByRole("menuitem")).not.toBeInTheDocument(),
		);
	});

	it("Escape closes without adding", async () => {
		const { onPick, user } = renderPicker();
		await user.click(addButton());
		await screen.findAllByRole("menuitem");

		await user.keyboard("{Escape}");

		await vi.waitFor(() =>
			expect(screen.queryByRole("menuitem")).not.toBeInTheDocument(),
		);
		expect(onPick).not.toHaveBeenCalled();
	});

	it("when unavailable it explains why and opens nothing", async () => {
		const { onPick, user } = renderPicker("Limite de 200 perguntas atingido");

		expect(addButton()).toHaveAttribute("aria-disabled", "true");
		expect(addButton()).toHaveAccessibleDescription(
			"Limite de 200 perguntas atingido",
		);
		await user.click(addButton());

		expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
		expect(onPick).not.toHaveBeenCalled();
	});
});
