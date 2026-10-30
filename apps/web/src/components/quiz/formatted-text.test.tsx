import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormattedText } from "./formatted-text";

describe("FormattedText (spec 047, RN-24 to RN-26)", () => {
	it("draws strong, em, sub and sup for the marked pieces", () => {
		const { container } = render(
			<FormattedText
				text="Quanto é 22? H2O"
				formatting={{
					bold: [[0, 6]],
					italic: [[3, 8]],
					superscript: [[10, 11]],
					subscript: [[14, 15]],
				}}
			/>,
		);

		expect(container.querySelector("strong")?.textContent).toBe("Quanto");
		expect(
			[...container.querySelectorAll("em")].map((node) => node.textContent),
		).toEqual(["nto", " é"]);
		expect(container.querySelector("sup")?.textContent).toBe("2");
		expect(container.querySelector("sub")?.textContent).toBe("2");
		expect(container.textContent).toBe("Quanto é 22? H2O");
	});

	it("plain text in normal weight", () => {
		render(<FormattedText text="Capital do Brasil?" formatting={{}} />);

		expect(screen.getByText("Capital do Brasil?")).toHaveClass("font-normal");
	});

	it("a text with markup-like characters is drawn as text", () => {
		const { container } = render(
			<FormattedText text="<b>x</b> < 3" formatting={{}} />,
		);

		expect(container.querySelector("b")).toBeNull();
		expect(container.textContent).toBe("<b>x</b> < 3");
	});

	it("data shaped before spec 047, without formatting, draws plain text", () => {
		const { container } = render(
			<FormattedText text="Evento antigo" formatting={undefined} />,
		);

		expect(container.textContent).toBe("Evento antigo");
	});

	it("no formatting draws the text as it is", () => {
		const { container } = render(
			<FormattedText text="Sem marcas" formatting={{}} />,
		);

		expect(container.querySelectorAll("strong, em, sub, sup")).toHaveLength(0);
		expect(container.textContent).toBe("Sem marcas");
	});
});
