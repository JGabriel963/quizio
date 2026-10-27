import type { ThemeId } from "@quizio/core/shared/domain/theme";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ThemesPanel } from "./themes-panel";

function renderPanel(props: Partial<Parameters<typeof ThemesPanel>[0]> = {}) {
	const onSelect = vi.fn();
	const onClose = vi.fn();
	render(
		<ThemesPanel
			themeId="standard"
			savingId={null}
			onSelect={onSelect}
			onClose={onClose}
			{...props}
		/>,
	);
	return { onSelect, onClose, user: userEvent.setup() };
}

const group = (name: string) => screen.getByRole("group", { name });

describe("ThemesPanel (spec 042)", () => {
	it("shows Seus temas as coming soon and the three groups with their themes", () => {
		renderPanel();

		expect(screen.getByRole("heading", { name: "Temas" })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Criar tema (em breve)" }),
		).toBeDisabled();
		expect(within(group("Padrão")).getAllByRole("radio")).toHaveLength(1);
		expect(within(group("Cores")).getAllByRole("radio")).toHaveLength(6);
		expect(within(group("Claros")).getAllByRole("radio")).toHaveLength(7);
		expect(screen.getByRole("radio", { name: "Azul claro" })).toHaveTextContent(
			"Azul claro",
		);
	});

	it("marks the quiz's theme as checked", () => {
		renderPanel({ themeId: "teal" });

		expect(
			screen.getByRole("radio", { name: "Verde-azulado" }),
		).toHaveAttribute("aria-checked", "true");
		expect(screen.getByRole("radio", { name: "Padrão" })).toHaveAttribute(
			"aria-checked",
			"false",
		);
	});

	it("choosing a theme calls onSelect with its id", async () => {
		const { onSelect, user } = renderPanel();

		await user.click(screen.getByRole("radio", { name: "Azul claro" }));

		expect(onSelect).toHaveBeenCalledWith("light-blue");
	});

	it("the arrow collapses and expands a group", async () => {
		const { user } = renderPanel();
		const toggle = screen.getByRole("button", { name: "Cores" });

		expect(toggle).toHaveAttribute("aria-expanded", "true");
		await user.click(toggle);
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByRole("radio", { name: "Grafite" })).toBeNull();
		await user.click(toggle);
		expect(screen.getByRole("radio", { name: "Grafite" })).toBeInTheDocument();
	});

	it("arrow keys choose Grafite and it is announced as checked", async () => {
		const onSelect = vi.fn();
		function Editor() {
			const [themeId, setThemeId] = useState<ThemeId>("orange");
			return (
				<ThemesPanel
					themeId={themeId}
					savingId={null}
					onSelect={(id) => {
						onSelect(id);
						setThemeId(id);
					}}
				/>
			);
		}
		render(<Editor />);
		const user = userEvent.setup();

		screen.getByRole("radio", { name: "Laranja" }).focus();
		await user.keyboard("{ArrowDown}");

		expect(onSelect).toHaveBeenLastCalledWith("graphite");
		expect(screen.getByRole("radio", { name: "Grafite" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
	});

	it("shows the loading state on the theme being saved", () => {
		renderPanel({ themeId: "red", savingId: "red" });

		expect(
			within(screen.getByRole("radio", { name: "Vermelho" })).getByRole(
				"status",
				{ name: "Salvando tema" },
			),
		).toBeInTheDocument();
	});

	it("the X calls onClose", async () => {
		const { onClose, user } = renderPanel();

		await user.click(screen.getByRole("button", { name: "Fechar temas" }));

		expect(onClose).toHaveBeenCalled();
	});
});
