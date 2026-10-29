import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SourceBar, type SourceBarProps } from "./source-bar";

function renderBar(overrides: Partial<SourceBarProps> = {}) {
	const props: SourceBarProps = {
		source: "topic",
		topic: "",
		pdfName: null,
		createDisabledReason: null,
		creditsNote: null,
		busy: false,
		layout: "grid",
		onSourceChange: vi.fn(),
		onTopicChange: vi.fn(),
		onUpload: vi.fn(),
		onRemovePdf: vi.fn(),
		onCreate: vi.fn(),
		onLayoutChange: vi.fn(),
		...overrides,
	};
	render(<SourceBar {...props} />);
	return { props, user: userEvent.setup() };
}

describe("SourceBar (spec 027)", () => {
	it("Crie is disabled with a blank topic", async () => {
		const { props, user } = renderBar({ topic: "  " });

		const create = screen.getByRole("button", { name: "Crie" });
		expect(create).toHaveAttribute("aria-disabled", "true");
		await user.click(create);
		expect(props.onCreate).not.toHaveBeenCalled();
	});

	it("creates from a written topic", async () => {
		const { props, user } = renderBar({ topic: "Sistema solar" });

		await user.click(screen.getByRole("button", { name: "Crie" }));

		expect(props.onCreate).toHaveBeenCalledOnce();
	});

	it("tells why Crie is not available", () => {
		renderBar({
			topic: "Sistema solar",
			createDisabledReason: "Você usou os 20 créditos das últimas 24 horas.",
		});

		expect(
			screen.getByRole("button", { name: "Crie" }),
		).toHaveAccessibleDescription(
			"Você usou os 20 créditos das últimas 24 horas.",
		);
	});

	it("the PDF source shows Carregar", async () => {
		const { props, user } = renderBar({ source: "pdf" });

		expect(
			screen.queryByRole("textbox", { name: "Assunto" }),
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Carregar" }));

		expect(props.onUpload).toHaveBeenCalledOnce();
	});

	it("shows the chosen file with a way to remove it", async () => {
		const { props, user } = renderBar({ source: "pdf", pdfName: "lista.pdf" });

		expect(screen.getByText("lista.pdf")).toBeInTheDocument();
		expect(
			screen.getByText("Os uploads não podem conter dados pessoais"),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Remover lista.pdf" }));

		expect(props.onRemovePdf).toHaveBeenCalledOnce();
	});

	it("switches the layout", async () => {
		const { props, user } = renderBar();

		expect(screen.getByRole("button", { name: "Grade" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await user.click(screen.getByRole("button", { name: "Lista" }));

		expect(props.onLayoutChange).toHaveBeenCalledWith("list");
	});
});
