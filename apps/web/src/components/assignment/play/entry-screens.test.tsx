import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
	AssignmentCover,
	ConfirmParticipant,
	NicknameStep,
	ReadyScreen,
} from "./entry-screens";

const DAY_MS = 24 * 60 * 60 * 1000;
const cover = {
	status: "open" as const,
	name: "Capitais",
	creatorName: "Ana",
	remainingMs: 2 * DAY_MS,
	participantCount: 1,
	participants: ["John"],
	coverUrl: "https://media.test/cover.png",
	questionCount: 5,
	themeId: "standard" as const,
};

describe("AssignmentCover (spec 030, RN-01)", () => {
	it("shows the cover, the question count, the name and Iniciar", async () => {
		const onStart = vi.fn();
		render(<AssignmentCover cover={cover} onStart={onStart} />);

		expect(screen.getByText("5 perguntas")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Capitais" }),
		).toBeInTheDocument();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Iniciar" }));

		expect(onStart).toHaveBeenCalledOnce();
	});
});

describe("NicknameStep (spec 030, RN-02 to RN-04)", () => {
	function renderStep(notice: string | null = null) {
		const onSubmit = vi.fn();
		const onPick = vi.fn();
		render(
			<NicknameStep
				cover={cover}
				busy={false}
				notice={notice}
				onSubmit={onSubmit}
				onPick={onPick}
			/>,
		);
		return { onSubmit, onPick, user: userEvent.setup() };
	}

	it("lists who joined, and a tap on one asks Você é…? (RN-03)", async () => {
		const { onPick, user } = renderStep();

		await user.click(
			within(screen.getByRole("list", { name: "Quem já entrou" })).getByRole(
				"button",
				{ name: "John" },
			),
		);

		expect(onPick).toHaveBeenCalledWith("John");
	});

	it("Ok, vamos lá! sends the nickname", async () => {
		const { onSubmit, user } = renderStep();

		expect(screen.getByText("Aberto por 2 dias")).toBeInTheDocument();
		expect(screen.getByText("1 participante")).toBeInTheDocument();
		expect(screen.queryByText("Em breve")).toBeNull();
		await user.type(
			screen.getByRole("textbox", { name: "Insira um apelido" }),
			"John",
		);
		await user.click(screen.getByRole("button", { name: "Ok, vamos lá!" }));

		expect(onSubmit).toHaveBeenCalledWith("John");
	});

	it("does not send an empty nickname", async () => {
		const { onSubmit, user } = renderStep();

		await user.click(screen.getByRole("button", { name: "Ok, vamos lá!" }));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("a refusal shows on the red strip", () => {
		renderStep("Esse apelido já está em uso. Escolha outro.");

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Esse apelido já está em uso. Escolha outro.",
		);
	});
});

describe("ReadyScreen (spec 030, RN-06)", () => {
	it("shows the character, the editor and Começar", async () => {
		const onStart = vi.fn();
		const onChange = vi.fn(async () => {});
		render(
			<ReadyScreen
				nickname="John"
				avatar={{ character: "fox", accessory: null }}
				busy={false}
				onChange={onChange}
				onStart={onStart}
			/>,
		);
		const user = userEvent.setup();

		expect(screen.getByText("John")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Trocar personagem" }));
		expect(await screen.findByRole("dialog")).toBeInTheDocument();
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "Começar" }));

		expect(onStart).toHaveBeenCalledOnce();
	});
});

describe("ConfirmParticipant (spec 030, RN-03, RN-20)", () => {
	it("asks Você é John? with Sim and Não", async () => {
		const onYes = vi.fn();
		const onNo = vi.fn();
		render(
			<ConfirmParticipant
				nickname="John"
				busy={false}
				notice={null}
				onYes={onYes}
				onNo={onNo}
			/>,
		);
		const user = userEvent.setup();

		expect(
			screen.getByRole("heading", { name: "Você é John?" }),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Sim" }));
		await user.click(screen.getByRole("button", { name: "Não" }));

		expect(onYes).toHaveBeenCalledOnce();
		expect(onNo).toHaveBeenCalledOnce();
	});
});
