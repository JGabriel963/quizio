import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { CountedField } from "./counted-field";

function Harness({ multiline = false }: { multiline?: boolean }) {
	const [value, setValue] = useState("");
	return (
		<CountedField
			label="Descrição"
			value={value}
			onChange={setValue}
			max={5}
			multiline={multiline}
		/>
	);
}

describe("CountedField (spec 035)", () => {
	it("counts down by characters and stops at the limit", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		const field = screen.getByLabelText("Descrição");

		expect(screen.getByText("5")).toBeVisible();
		await user.type(field, "ab👩‍🏫");
		expect(screen.getByText("2")).toBeVisible();
		await user.type(field, "cdef");
		expect(field).toHaveValue("ab👩‍🏫cd");
		expect(screen.getByText("0")).toBeVisible();
	});

	it("is a text area when multiline, keeping line breaks", async () => {
		const user = userEvent.setup();
		render(<Harness multiline />);
		const field = screen.getByLabelText("Descrição");

		await user.type(field, "a{Enter}b");

		expect(field.tagName).toBe("TEXTAREA");
		expect(field).toHaveValue("a\nb");
	});

	it("shows an error tied to the field", () => {
		render(
			<CountedField
				label="Nome"
				value=""
				onChange={() => {}}
				max={20}
				error="O nome deve ter de 1 a 20 caracteres."
			/>,
		);

		const field = screen.getByLabelText("Nome");
		expect(field).toHaveAttribute("aria-invalid", "true");
		expect(field).toHaveAccessibleDescription(
			/O nome deve ter de 1 a 20 caracteres\./,
		);
	});
});
