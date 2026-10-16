import { DEFAULT_GENERATION_OPTIONS } from "@quizio/core/quiz/domain/generation";
import { render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OptionsPanel, type OptionsPanelProps } from "./options-panel";

function renderPanel(overrides: Partial<OptionsPanelProps> = {}) {
	const props: OptionsPanelProps = {
		source: "topic",
		options: DEFAULT_GENERATION_OPTIONS,
		remaining: 20,
		checkedCount: 0,
		totalCount: 0,
		questionCount: 1,
		busy: false,
		onChange: vi.fn(),
		onAdd: vi.fn(),
		onAddAll: vi.fn(),
		...overrides,
	};
	render(<OptionsPanel {...props} />);
	return { props, user: userEvent.setup() };
}

const select = (name: string) => screen.getByRole("combobox", { name });

async function optionLabels(user: UserEvent, name: string) {
	await user.click(select(name));
	const labels = (await screen.findAllByRole("option")).map((option) =>
		option.textContent?.trim(),
	);
	await user.keyboard("{Escape}");
	await vi.waitFor(() => expect(screen.queryByRole("option")).toBeNull());
	return labels;
}

describe("OptionsPanel (spec 027)", () => {
	it("shows the remembered options", () => {
		renderPanel({
			options: {
				format: "mixed",
				language: "en",
				level: "advanced",
				count: 10,
			},
		});

		expect(select("Formato")).toHaveTextContent("Misto");
		expect(select("Idioma")).toHaveTextContent("Inglês");
		expect(select("Nível de habilidade")).toHaveTextContent("Avançado");
		expect(select("Duração do quiz")).toHaveTextContent(
			"Cerca de 10 perguntas",
		);
	});

	it("offers extract only for a PDF", async () => {
		const topic = renderPanel();
		expect(await optionLabels(topic.user, "Formato")).toEqual([
			"Quiz",
			"Verdadeiro ou falso",
			"Misto",
		]);
	});

	it("changes an option", async () => {
		const { props, user } = renderPanel({ source: "pdf" });

		await user.click(select("Formato"));
		await user.click(
			await screen.findByRole("option", { name: "Extrair perguntas" }),
		);

		expect(props.onChange).toHaveBeenCalledWith({ format: "extract" });
	});

	it("extract shows auto language and disables level and count", () => {
		renderPanel({
			source: "pdf",
			options: {
				format: "extract",
				language: "auto",
				level: "intermediate",
				count: 30,
			},
		});

		expect(select("Idioma")).toHaveTextContent("Detecção automática");
		expect(select("Idioma")).toHaveAttribute("aria-disabled", "true");
		expect(select("Nível de habilidade")).toHaveAttribute(
			"aria-disabled",
			"true",
		);
		expect(select("Duração do quiz")).toHaveTextContent("Auto");
	});

	it("shows the remaining uses", () => {
		renderPanel({ remaining: 7 });

		expect(screen.getByText("Restam 7 criações")).toBeInTheDocument();
	});

	it("add is disabled with nothing checked; add all adds every card", async () => {
		const { props, user } = renderPanel({ totalCount: 6, checkedCount: 0 });

		const add = screen.getByRole("button", { name: "Adicionar (0)" });
		expect(add).toHaveAttribute("aria-disabled", "true");
		await user.click(add);
		await user.click(screen.getByRole("button", { name: "Adicionar tudo" }));

		expect(props.onAdd).not.toHaveBeenCalled();
		expect(props.onAddAll).toHaveBeenCalledOnce();
	});

	it("adds the checked questions", async () => {
		const { props, user } = renderPanel({ totalCount: 6, checkedCount: 5 });

		await user.click(screen.getByRole("button", { name: "Adicionar (5)" }));

		expect(props.onAdd).toHaveBeenCalledOnce();
	});

	it("explains how many questions still fit", () => {
		renderPanel({ questionCount: 195, totalCount: 10, checkedCount: 10 });

		const reason = "O quiz tem 195 perguntas; dá para adicionar até 5.";
		expect(
			screen.getByRole("button", { name: "Adicionar (10)" }),
		).toHaveAccessibleDescription(reason);
		expect(
			screen.getByRole("button", { name: "Adicionar tudo" }),
		).toHaveAttribute("aria-disabled", "true");
	});

	it("nothing is added while creating", () => {
		renderPanel({ totalCount: 0, busy: true });

		expect(
			screen.getByRole("button", { name: "Adicionar tudo" }),
		).toHaveAttribute("aria-disabled", "true");
	});
});
