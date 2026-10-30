import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { AnswerTextInput, oneLine } from "./answer-text-input";

function Field({ initial = "" }: { initial?: string }) {
	const [value, setValue] = useState(initial);
	return (
		<AnswerTextInput
			aria-label="Resposta 1"
			placeholder="Adicionar resposta 1"
			value={value}
			onValueChange={setValue}
		/>
	);
}

const field = () => screen.getByRole("textbox", { name: "Resposta 1" });

describe("oneLine", () => {
	it("turns line breaks and the spaces around them into one space", () => {
		expect(oneLine("Rio\nde Janeiro")).toBe("Rio de Janeiro");
		expect(oneLine("Rio  \r\n\n  de Janeiro")).toBe("Rio de Janeiro");
		expect(oneLine("Rio de Janeiro")).toBe("Rio de Janeiro");
	});
});

describe("AnswerTextInput", () => {
	it("Enter does not break the line", async () => {
		const user = userEvent.setup();
		render(<Field />);

		await user.type(field(), "Rio{Enter}de Janeiro");

		expect(field()).toHaveValue("Riode Janeiro");
	});

	it("a paste with several lines comes in one line", async () => {
		const user = userEvent.setup();
		render(<Field />);

		await user.click(field());
		await user.paste("Deus Pai,\nJesus\r\ne o anjo");

		expect(field()).toHaveValue("Deus Pai, Jesus e o anjo");
	});

	it("the copy that gives the height follows the text, or the placeholder while empty", async () => {
		const user = userEvent.setup();
		render(<Field />);
		const copy = () => field().previousElementSibling;

		expect(copy()).toHaveTextContent("Adicionar resposta 1");
		expect(copy()).toHaveAttribute("aria-hidden", "true");
		await user.type(field(), "Brasília");

		expect(copy()).toHaveTextContent("Brasília");
	});
});
