import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createSaveTracker, SaveTrackerProvider } from "@/lib/save-tracker";
import { renderWithRouter } from "@/testing/render-with-router";

import { EditorHeader } from "./editor-header";

async function renderHeader() {
	const tracker = createSaveTracker();
	const props = {
		title: "Geografia",
		onSaveTitle: vi.fn(async (_title: string | null): Promise<void> => {}),
		onOpenSettings: vi.fn(),
		onExit: vi.fn(),
	};
	renderWithRouter(
		<SaveTrackerProvider tracker={tracker}>
			<EditorHeader {...props} />
		</SaveTrackerProvider>,
	);
	await screen.findByRole("banner");
	return { props, tracker, user: userEvent.setup() };
}

describe("EditorHeader", () => {
	it("shows the brand, the title, Configurações, the save status and Sair", async () => {
		await renderHeader();

		expect(screen.getByRole("link", { name: "Quizio" })).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "Título do quiz" })).toHaveValue(
			"Geografia",
		);
		expect(screen.getByRole("status")).toHaveTextContent("Salvo");
		expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
	});

	it("Configurações opens the quiz details only after the typed title is saved", async () => {
		const { props, user } = await renderHeader();
		let finishSave!: () => void;
		props.onSaveTitle.mockImplementation(
			() => new Promise<void>((resolve) => (finishSave = resolve)),
		);

		await user.type(
			screen.getByRole("textbox", { name: "Título do quiz" }),
			" do Brasil",
		);
		await user.click(screen.getByRole("button", { name: "Configurações" }));
		expect(props.onSaveTitle).toHaveBeenCalledWith("Geografia do Brasil");
		expect(props.onOpenSettings).not.toHaveBeenCalled();
		finishSave();

		await vi.waitFor(() => expect(props.onOpenSettings).toHaveBeenCalledOnce());
	});

	it("Sair waits for pending saves before leaving", async () => {
		const { props, tracker, user } = await renderHeader();
		let finish!: () => void;
		void tracker.track(
			"question:a:text",
			() => new Promise<void>((resolve) => (finish = resolve)),
		);

		await user.click(screen.getByRole("button", { name: "Sair" }));
		expect(props.onExit).not.toHaveBeenCalled();
		finish();

		await vi.waitFor(() => expect(props.onExit).toHaveBeenCalledOnce());
	});

	it("Sair stays when a save failed", async () => {
		const { props, tracker, user } = await renderHeader();
		await tracker.track("question:a:text", async () => {
			throw new Error("offline");
		});

		await user.click(screen.getByRole("button", { name: "Sair" }));

		expect(props.onExit).not.toHaveBeenCalled();
		expect(screen.getByRole("status")).toHaveTextContent(
			"Não foi possível salvar",
		);
	});
});
