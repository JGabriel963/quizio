import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { AssignmentPostDialog } from "./assignment-post-dialog";

const quiz = {
	id: "quiz-1",
	title: "Capitais",
	questionCount: 5,
	ownerName: "Ana",
};

function Harness({
	onPublish = async () => {},
	onCancel = () => {},
	onRemoveQuiz = () => {},
}: {
	onPublish?: () => Promise<unknown>;
	onCancel?: () => void;
	onRemoveQuiz?: () => void;
}) {
	const [message, setMessage] = useState("");
	return (
		<AssignmentPostDialog
			open
			quiz={quiz}
			message={message}
			onMessageChange={setMessage}
			onRemoveQuiz={onRemoveQuiz}
			onCancel={onCancel}
			onPublish={onPublish}
		/>
	);
}

describe("AssignmentPostDialog (spec 038, RN-11, RN-12)", () => {
	it("Publicar is enabled with the quiz and no text (spec 036, RN-15); counts down from 500", async () => {
		const user = userEvent.setup();
		const onPublish = vi.fn(async () => {});
		render(<Harness onPublish={onPublish} />);
		const dialog = await screen.findByRole("dialog", {
			name: "Criar publicação",
		});
		const publish = within(dialog).getByRole("button", { name: "Publicar" });

		expect(within(dialog).getByText("500")).toBeVisible();
		expect(publish).toBeEnabled();
		await user.type(
			within(dialog).getByPlaceholderText("Digite seu texto"),
			"Oi",
		);
		expect(within(dialog).getByText("498")).toBeVisible();
		await user.click(publish);

		expect(onPublish).toHaveBeenCalled();
		expect(within(dialog).getByText("Capitais")).toBeVisible();
	});

	it("X goes back; Cancelar closes everything", async () => {
		const user = userEvent.setup();
		const onRemoveQuiz = vi.fn();
		const onCancel = vi.fn();
		render(<Harness onRemoveQuiz={onRemoveQuiz} onCancel={onCancel} />);
		const dialog = await screen.findByRole("dialog", {
			name: "Criar publicação",
		});

		await user.click(
			within(dialog).getByRole("button", { name: "Trocar o quiz" }),
		);
		await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

		expect(onRemoveQuiz).toHaveBeenCalled();
		expect(onCancel).toHaveBeenCalled();
	});

	it("shows a refusal", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				onPublish={async () => {
					throw { data: { domainCode: "GROUP.INVALID_MESSAGE" } };
				}}
			/>,
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Criar publicação",
		});

		await user.type(
			within(dialog).getByPlaceholderText("Digite seu texto"),
			"Oi",
		);
		await user.click(within(dialog).getByRole("button", { name: "Publicar" }));

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"A mensagem deve ter até 500 caracteres.",
		);
	});
});
