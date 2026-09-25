import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SaveTrackerProvider } from "@/lib/save-tracker";

import { QuestionCanvas } from "./question-canvas";

describe("QuestionCanvas", () => {
	it("shows the media area and four answer slots marked Em breve", () => {
		render(
			<SaveTrackerProvider>
				<QuestionCanvas
					question={{ id: "a", type: "quiz", text: "Capital?" }}
					onSaveText={vi.fn()}
				/>
			</SaveTrackerProvider>,
		);

		expect(screen.getByRole("textbox", { name: "Pergunta" })).toHaveValue(
			"Capital?",
		);
		const media = screen.getByRole("region", { name: "Mídia" });
		expect(within(media).getByText("Em breve")).toBeInTheDocument();
		const answers = screen.getByRole("list", { name: "Respostas" });
		expect(
			within(answers)
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual([
			"Adicionar resposta 1",
			"Adicionar resposta 2",
			"Adicionar resposta 3 (opcional)",
			"Adicionar resposta 4 (opcional)",
		]);
		expect(screen.getAllByText("Em breve")).toHaveLength(2);
	});
});
