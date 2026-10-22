import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SliderAnswerInput } from "./slider-answer-input";

/** 100 to 900, answer 600: positions 104 to 896 by 8. */
const scale = {
	min: 100,
	max: 900,
	first: 104,
	last: 896,
	step: 8,
	start: 496,
	unit: "anos",
};

function renderInput() {
	const onSubmit = vi.fn();
	render(<SliderAnswerInput scale={scale} onSubmit={onSubmit} />);
	return { onSubmit, user: userEvent.setup() };
}

const slider = () => screen.getByRole("slider", { name: "Sua resposta" });

describe("SliderAnswerInput (spec 032)", () => {
	it("starts at the position closest to the middle", () => {
		renderInput();

		expect(slider()).toHaveAttribute("aria-valuenow", "496");
		expect(slider()).toHaveAttribute("aria-valuemin", "104");
		expect(slider()).toHaveAttribute("aria-valuemax", "896");
		expect(screen.getByText("496")).toBeInTheDocument();
	});

	it("announces the value with its unit", () => {
		renderInput();

		expect(slider()).toHaveAttribute("aria-valuetext", "496 anos");
	});

	it("the limit buttons move one position", async () => {
		const { user } = renderInput();

		await user.click(screen.getByRole("button", { name: /Aumentar, até 900/ }));
		expect(slider()).toHaveAttribute("aria-valuenow", "504");
		await user.click(screen.getByRole("button", { name: /Diminuir, até 100/ }));
		await user.click(screen.getByRole("button", { name: /Diminuir, até 100/ }));
		expect(slider()).toHaveAttribute("aria-valuenow", "488");
		expect(screen.getByRole("button", { name: /Diminuir/ })).toHaveTextContent(
			"100",
		);
	});

	it("arrows move one position and Page keys ten", async () => {
		const { user } = renderInput();
		slider().focus();

		await user.keyboard("{ArrowRight}");
		expect(slider()).toHaveAttribute("aria-valuenow", "504");
		await user.keyboard("{PageUp}");
		expect(slider()).toHaveAttribute("aria-valuenow", "584");
		await user.keyboard("{PageDown}{ArrowLeft}");
		expect(slider()).toHaveAttribute("aria-valuenow", "496");
		await user.keyboard("{End}");
		expect(slider()).toHaveAttribute("aria-valuenow", "896");
		await user.keyboard("{ArrowRight}");
		expect(slider()).toHaveAttribute("aria-valuenow", "896");
	});

	it("dragging runs the scale under the marker", () => {
		renderInput();

		fireEvent.pointerDown(slider(), { clientX: 200, pointerId: 1 });
		fireEvent.pointerMove(slider(), { clientX: 200 - 22 * 3, pointerId: 1 });
		fireEvent.pointerUp(slider(), { pointerId: 1 });

		expect(slider()).toHaveAttribute("aria-valuenow", "520");
	});

	it("the hand goes once the scale is touched", () => {
		const { container } = render(
			<SliderAnswerInput scale={scale} onSubmit={vi.fn()} />,
		);
		expect(container.querySelector("[data-slot=slider-hint]")).not.toBeNull();

		fireEvent.pointerDown(
			container.querySelector('[role="slider"]') as HTMLElement,
			{ clientX: 0, pointerId: 1 },
		);

		expect(container.querySelector("[data-slot=slider-hint]")).toBeNull();
	});

	it("Enviar sends the value once", async () => {
		const { onSubmit, user } = renderInput();
		slider().focus();
		await user.keyboard("{ArrowRight}");

		await user.click(screen.getByRole("button", { name: "Enviar" }));

		expect(onSubmit).toHaveBeenCalledExactlyOnceWith(504);
	});
});
