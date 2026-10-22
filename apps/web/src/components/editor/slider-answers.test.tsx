import { blankQuestion } from "@quizio/core/quiz/domain/question";
import { aSliderQuestion } from "@quizio/core/quiz/testing/a-question";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SliderAnswers } from "./slider-answers";

type Slider = ReturnType<typeof aSliderQuestion>;

function renderSlider(question: Slider) {
	const onChange = vi.fn();
	const view = render(
		<SliderAnswers question={question} onChange={onChange} />,
	);
	return { onChange, user: userEvent.setup(), ...view };
}

const field = (name: string) => screen.getByRole("textbox", { name });

describe("SliderAnswers (spec 032)", () => {
	it("a new slider shows 0 and 50 disabled and Adicionar resposta", () => {
		renderSlider(blankQuestion("q1", "slider"));

		expect(field("Mínimo")).toHaveValue("0");
		expect(field("Mínimo")).toBeDisabled();
		expect(field("Máximo")).toHaveValue("50");
		expect(field("Máximo")).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Adicionar resposta" }),
		).toBeInTheDocument();
		expect(screen.queryByText(/Valor da etapa/)).toBeNull();
	});

	it("Adicionar resposta opens the balloon to type the answer", async () => {
		const { onChange, user } = renderSlider(blankQuestion("q1", "slider"));

		await user.click(
			screen.getByRole("button", { name: "Adicionar resposta" }),
		);
		expect(field("Resposta")).toHaveFocus();
		await user.type(field("Resposta"), "600{Enter}");

		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			kind: "sliderNumber",
			field: "answer",
			value: "600",
		});
	});

	it("leaving the balloon empty gives Adicionar resposta back", async () => {
		const { onChange, user } = renderSlider(blankQuestion("q1", "slider"));

		await user.click(
			screen.getByRole("button", { name: "Adicionar resposta" }),
		);
		await user.tab();

		expect(onChange).not.toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: "Adicionar resposta" }),
		).toBeInTheDocument();
	});

	it("with the answer, the fields, the margin and the step show", () => {
		renderSlider(aSliderQuestion({ min: 0, max: 50, answer: 25, unit: null }));

		expect(field("Resposta")).toHaveValue("25");
		expect(field("Mínimo")).toBeEnabled();
		expect(screen.getByText("Margem de resposta: 20 a 30")).toBeInTheDocument();
		expect(screen.getByText("Valor da etapa: 1")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Adicionar unidade" }),
		).toBeInTheDocument();
	});

	it("shows step 30 and 390 to 810 for −100,3 to 2.000,03", () => {
		renderSlider(aSliderQuestion({ min: -100.3, max: 2000.03 }));

		expect(field("Mínimo")).toHaveValue("-100,3");
		expect(field("Máximo")).toHaveValue("2000,03");
		expect(
			screen.getByText("Margem de resposta: 390 a 810"),
		).toBeInTheDocument();
		expect(screen.getByText("Valor da etapa: 30")).toBeInTheDocument();
	});

	it("hides the margin with no margin", () => {
		renderSlider(aSliderQuestion({ answerMargin: "none" }));

		expect(screen.queryByText(/Margem de resposta/)).toBeNull();
		expect(screen.getByText("Valor da etapa: 8")).toBeInTheDocument();
	});

	it("the fields refuse letters, a third decimal and an 11th character", async () => {
		const { onChange, user } = renderSlider(aSliderQuestion());

		await user.clear(field("Máximo"));
		await user.type(field("Máximo"), "2000.031a");
		expect(field("Máximo")).toHaveValue("2000.03");
		await user.tab();
		expect(onChange).toHaveBeenCalledWith({
			kind: "sliderNumber",
			field: "max",
			value: "2000.03",
		});

		await user.clear(field("Mínimo"));
		await user.type(field("Mínimo"), "12345678901");
		expect(field("Mínimo")).toHaveValue("1234567890");
	});

	it("an emptied min is saved as empty", async () => {
		const { onChange, user } = renderSlider(aSliderQuestion());

		await user.clear(field("Mínimo"));
		await user.tab();

		expect(onChange).toHaveBeenCalledWith({
			kind: "sliderNumber",
			field: "min",
			value: null,
		});
	});

	it("an answer above the max marks the max with its message", () => {
		renderSlider(aSliderQuestion({ max: 200 }));

		expect(field("Máximo")).toHaveAttribute("aria-invalid", "true");
		expect(field("Mínimo")).not.toHaveAttribute("aria-invalid");
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Insira um valor máximo maior.",
		);
		expect(field("Resposta")).toHaveValue("600");
	});

	it("an answer below the min marks the min with its message", () => {
		renderSlider(aSliderQuestion({ min: 700 }));

		expect(field("Mínimo")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Insira um valor mínimo menor.",
		);
	});

	it("a new question with no answer has no range error", () => {
		renderSlider(blankQuestion("q1", "slider"));

		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("each tick tells its number, and the scale is not dragged", () => {
		const { container } = renderSlider(
			aSliderQuestion({ min: 0, max: 50, answer: 25 }),
		);

		const values = [
			...container.querySelectorAll("[data-slot=slider-tick-value]"),
		].map((value) => value.textContent);
		expect(values).toHaveLength(51);
		expect(values[32]).toBe("32");
		expect(container.querySelector("[data-slot=slider-track]")).not.toHaveClass(
			"cursor-pointer",
		);
	});

	it("typing in the balloon writes the answer", async () => {
		const { onChange, user } = renderSlider(aSliderQuestion());

		await user.clear(field("Resposta"));
		await user.type(field("Resposta"), "601,5{Enter}");

		expect(onChange).toHaveBeenCalledWith({
			kind: "sliderNumber",
			field: "answer",
			value: "601,5",
		});
	});

	it("the unit shows under the number", async () => {
		const { onChange, user } = renderSlider(aSliderQuestion({ unit: null }));

		await user.click(screen.getByRole("button", { name: "Adicionar unidade" }));
		await user.type(field("Unidade"), " anos ");
		expect(field("Unidade")).toHaveAttribute("maxLength", "20");
		await user.tab();

		expect(onChange).toHaveBeenCalledWith({ kind: "sliderUnit", text: "anos" });
	});

	it("marks the ticks inside the margin", () => {
		const { container } = renderSlider(
			aSliderQuestion({ min: 0, max: 50, answer: 25 }),
		);

		expect(container.querySelectorAll("[data-in-margin]")).toHaveLength(11);
	});
});

describe("SliderAnswers: the unit before its save (spec 032)", () => {
	it("keeps the typed unit while its save is on its way", async () => {
		const { user } = renderSlider(aSliderQuestion({ unit: null }));

		await user.click(screen.getByRole("button", { name: "Adicionar unidade" }));
		await user.type(field("Unidade"), "anos");
		await user.tab();

		// The question still has no unit: the field stays with what was typed.
		expect(field("Unidade")).toHaveValue("anos");
		expect(
			screen.queryByRole("button", { name: "Adicionar unidade" }),
		).toBeNull();
	});
});
