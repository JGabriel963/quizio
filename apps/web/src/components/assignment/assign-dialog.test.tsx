import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AssignDialog } from "./assign-dialog";

const now = new Date(2026, 9, 19, 14, 11);
const setup = {
	options: {
		gameCharacters: false,
		questionTimer: true,
		randomizeAnswers: false,
	},
	maxDeadlineDays: 28,
};

const refusal = (domainCode: string) =>
	Object.assign(new Error(domainCode), { data: { domainCode } });

function renderDialog(
	overrides: Partial<React.ComponentProps<typeof AssignDialog>> = {},
) {
	const props = {
		open: true,
		onOpenChange: vi.fn(),
		setup,
		now,
		onCreate: vi.fn(async () => {}),
		...overrides,
	};
	render(<AssignDialog {...props} />);
	return { props, user: userEvent.setup() };
}

const dialog = () =>
	screen.getByRole("dialog", { name: "Configurar atividade" });
const toggle = (name: string) => screen.getByRole("switch", { name });

describe("AssignDialog (spec 029)", () => {
	it("opens with the default deadline, Em 3 dias, and Mais opções closed", () => {
		renderDialog();

		expect(
			within(dialog()).getByText(
				"Crie uma atividade e a compartilhe com os participantes na próxima etapa.",
			),
		).toBeInTheDocument();
		expect(within(dialog()).getByText("Em 3 dias")).toBeInTheDocument();
		expect(
			within(dialog()).getByText(
				"quinta-feira, 22 de outubro de 2026 às 12:00",
			),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Mais opções" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		expect(screen.queryByRole("switch")).toBeNull();
	});

	it("Mais opções shows the four switches with their descriptions and the setup's options", async () => {
		const { user } = renderDialog({
			setup: {
				...setup,
				options: {
					gameCharacters: true,
					questionTimer: false,
					randomizeAnswers: true,
				},
			},
		});

		await user.click(screen.getByRole("button", { name: "Mais opções" }));

		expect(toggle("Personagens")).toHaveAttribute("aria-checked", "true");
		expect(toggle("Timer da pergunta")).toHaveAttribute(
			"aria-checked",
			"false",
		);
		expect(toggle("Ordem aleatória de respostas")).toHaveAttribute(
			"aria-checked",
			"true",
		);
		expect(
			screen.getByText(
				"Permita que os participantes escolham um personagem e personalizem sua aparência.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText("Conceda mais pontos para respostas mais rápidas."),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Exiba a ordem aleatória de respostas para cada participante.",
			),
		).toBeInTheDocument();
	});

	it("the nickname generator is off, disabled and marked Em breve", async () => {
		const { user } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Mais opções" }));

		const generator = toggle("Gerador de apelido");
		expect(generator).toHaveAttribute("aria-checked", "false");
		expect(generator).toHaveAttribute("aria-disabled", "true");
		expect(
			screen.getByText("Evite apelidos inadequados e informações pessoais."),
		).toBeInTheDocument();
		expect(within(dialog()).getByText("Em breve")).toBeInTheDocument();
	});

	it("there is no participant limit, upgrade, question order, autoplay or lock", async () => {
		const { user } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Mais opções" }));

		expect(
			within(dialog()).queryByText(/participantes\. Faça upgrade/),
		).toBeNull();
		expect(within(dialog()).queryByText(/upgrade/i)).toBeNull();
		expect(screen.getAllByRole("switch")).toHaveLength(4);
		expect(screen.queryByRole("switch", { name: /perguntas/i })).toBeNull();
	});

	it("Cancelar and the X close without creating", async () => {
		const { user, props } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Cancelar" }));
		await user.click(screen.getByRole("button", { name: "Fechar" }));

		expect(props.onOpenChange).toHaveBeenCalledWith(false);
		expect(props.onCreate).not.toHaveBeenCalled();
	});

	it("Criar uma tarefa sends the deadline and the options", async () => {
		const { user, props } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Mais opções" }));
		await user.click(toggle("Personagens"));
		await user.click(screen.getByRole("button", { name: "Criar uma tarefa" }));

		expect(props.onCreate).toHaveBeenCalledWith({
			deadline: new Date(2026, 9, 22, 12, 0),
			options: {
				gameCharacters: true,
				questionTimer: true,
				randomizeAnswers: false,
			},
		});
	});

	it("Editar opens the picker and Definir changes the deadline", async () => {
		const { user } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Editar" }));
		await user.click(
			screen.getByRole("button", { name: "30 de outubro de 2026" }),
		);
		await user.click(screen.getByRole("button", { name: "Definir" }));

		expect(
			within(dialog()).getByText("sexta-feira, 30 de outubro de 2026 às 12:00"),
		).toBeInTheDocument();
		expect(within(dialog()).getByText("Em 11 dias")).toBeInTheDocument();
	});

	it("a passed deadline keeps the dialog open with the reason on the card", async () => {
		const { user, props } = renderDialog({
			onCreate: vi.fn(async () => {
				throw refusal("ASSIGNMENT.DEADLINE_PASSED");
			}),
		});

		await user.click(screen.getByRole("button", { name: "Criar uma tarefa" }));

		expect(
			await within(dialog()).findByText("Esse prazo já passou. Escolha outro."),
		).toBeInTheDocument();
		expect(props.onOpenChange).not.toHaveBeenCalled();
	});

	it("another failure says the activity was not created", async () => {
		const { user } = renderDialog({
			onCreate: vi.fn(async () => {
				throw new TypeError("Failed to fetch");
			}),
		});

		await user.click(screen.getByRole("button", { name: "Criar uma tarefa" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível criar a atividade. Tente novamente.",
		);
	});

	it("while creating, the button is busy and cannot be pressed again", async () => {
		let finish: () => void = () => {};
		const onCreate = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		);
		const { user } = renderDialog({ onCreate });

		await user.click(screen.getByRole("button", { name: "Criar uma tarefa" }));
		const busy = screen.getByRole("button", { name: "Criando…" });
		await user.click(busy);

		expect(busy).toBeDisabled();
		expect(onCreate).toHaveBeenCalledTimes(1);
		finish();
	});
});
