import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DeleteCustomThemeDialog } from "./delete-custom-theme-dialog";

describe("DeleteCustomThemeDialog (spec 043, RN-19, CA-15)", () => {
	it("says how many quizzes go back to standard", async () => {
		const onConfirm = vi.fn();
		render(
			<DeleteCustomThemeDialog
				theme={{ name: "Escola Azul", quizCount: 2 }}
				onCancel={() => {}}
				onConfirm={onConfirm}
			/>,
		);

		expect(
			screen.getByRole("alertdialog", { name: "Excluir o tema Escola Azul?" }),
		).toBeVisible();
		expect(
			screen.getByText(
				"2 quizzes usam este tema e voltarão para o tema Padrão.",
			),
		).toBeVisible();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Excluir" }));

		expect(onConfirm).toHaveBeenCalledOnce();
	});

	it("one quiz is said in the singular, and none says nothing about quizzes", () => {
		const { rerender } = render(
			<DeleteCustomThemeDialog
				theme={{ name: "Escola Azul", quizCount: 1 }}
				onCancel={() => {}}
				onConfirm={() => {}}
			/>,
		);
		expect(
			screen.getByText("1 quiz usa este tema e voltará para o tema Padrão."),
		).toBeVisible();

		rerender(
			<DeleteCustomThemeDialog
				theme={{ name: "Escola Azul", quizCount: 0 }}
				onCancel={() => {}}
				onConfirm={() => {}}
			/>,
		);
		expect(screen.queryByText(/usa(m)? este tema/)).toBeNull();
	});
});
