import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PlayArrows } from "./play-arrows";
import { PlayFinal } from "./play-final";
import { PlayScoreboard } from "./play-scoreboard";

const entry = (
	playerId: string,
	nickname: string,
	rank: number,
	total: number,
) => ({
	playerId,
	nickname,
	avatar: null,
	total,
	rank,
	climbed: false,
	previous: null,
});

const scoreboard = {
	top: [
		entry("p1", "Ana", 1, 4000),
		entry("p2", "Bia", 2, 3500),
		entry("p3", "Caio", 3, 3000),
		entry("p4", "Duda", 4, 2500),
		entry("p5", "Edu", 5, 2000),
	],
	viewer: entry("me", "John", 7, 900),
};

const activity = {
	name: "Capitais",
	creatorName: "Ana",
	remainingMs: 2 * 86_400_000,
};

const resultOf = (index: number, text: string) => ({
	question: {
		index,
		type: "quiz" as const,
		selection: "single" as const,
		slider: null,
		text,
		textFormatting: {},
		image: null,
		choices: [
			{ id: `q${index}-a`, shapeIndex: 0, text: "Sim" },
			{ id: `q${index}-b`, shapeIndex: 1, text: "Não" },
		],
	},
	chosenIds: [`q${index}-a`],
	rightIds: [`q${index}-a`],
	typedText: null,
	sliderValue: null,
	sliderAnswer: null,
	rightOrder: [],
	acceptedAnswers: [],
	result: "correct" as const,
	points: 900,
});

describe("PlayScoreboard (spec 030, RN-14, RN-15)", () => {
	it("lists the first five and the viewer's row, highlighted", () => {
		render(<PlayScoreboard scoreboard={scoreboard} viewerId="me" />);

		const rows = within(
			screen.getByRole("list", { name: "Pontuações" }),
		).getAllByRole("listitem");
		expect(rows).toHaveLength(6);
		expect(rows[0]).toHaveTextContent("Ana");
		expect(rows[5]).toHaveTextContent("7");
		expect(rows[5]).toHaveTextContent("John");
		expect(rows[5]).toHaveAttribute("data-viewer", "true");
		expect(rows[0]).toHaveAttribute("data-viewer", "false");
	});
});

describe("PlayFinal (spec 030, RN-16, RN-18, RN-23)", () => {
	it("shows the activity, the medal with the place, the standings and Entrar em outro jogo", async () => {
		const onLeave = vi.fn();
		render(
			<PlayFinal
				activity={activity}
				place={2}
				total={3500}
				scoreboard={{ top: scoreboard.top, viewer: null }}
				viewerId="p2"
				endedEarly={false}
				onLeave={onLeave}
			/>,
		);

		expect(screen.getByText(/por Ana/)).toBeInTheDocument();
		expect(screen.getByText("Aberto por 2 dias")).toBeInTheDocument();
		expect(screen.getByText("2º lugar")).toBeInTheDocument();
		expect(
			screen.getByRole("list", { name: "Pontuações" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Esta atividade foi encerrada")).toBeNull();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Entrar em outro jogo" }));

		expect(onLeave).toHaveBeenCalledOnce();
	});

	it("an ended activity says Esta atividade foi encerrada", () => {
		render(
			<PlayFinal
				activity={{ ...activity, remainingMs: null }}
				place={7}
				total={900}
				scoreboard={scoreboard}
				viewerId="me"
				endedEarly
				onLeave={vi.fn()}
			/>,
		);

		expect(
			screen.getByText("Esta atividade foi encerrada"),
		).toBeInTheDocument();
		expect(screen.getByText("7º lugar")).toBeInTheDocument();
	});
});

describe("PlayArrows (spec 030, RN-12, RN-17)", () => {
	const history = [resultOf(0, "Primeira"), resultOf(1, "Segunda")];

	it("→ asks to advance", async () => {
		const onAdvance = vi.fn();
		render(
			<PlayArrows
				screen={{ phase: "results", questionIndex: 1 }}
				history={history}
				questionCount={3}
				busy={false}
				onAdvance={onAdvance}
			>
				<p>Atual</p>
			</PlayArrows>,
		);

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Próximo" }));

		expect(onAdvance).toHaveBeenCalledOnce();
	});

	it("← walks back through the answered questions' results without answering", async () => {
		const onAdvance = vi.fn();
		render(
			<PlayArrows
				screen={{ phase: "scoreboard", questionIndex: 1 }}
				history={history}
				questionCount={3}
				busy={false}
				onAdvance={onAdvance}
			>
				<p>Atual</p>
			</PlayArrows>,
		);
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Anterior" }));
		expect(
			screen.getByRole("heading", { name: "Segunda" }),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Anterior" }));
		expect(
			screen.getByRole("heading", { name: "Primeira" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Anterior" })).toBeNull();
		await user.click(screen.getByRole("button", { name: "Próximo" }));
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		expect(screen.getByText("Atual")).toBeInTheDocument();
		expect(onAdvance).not.toHaveBeenCalled();
	});

	it("the first question's result has no ←", () => {
		render(
			<PlayArrows
				screen={{ phase: "results", questionIndex: 0 }}
				history={[history[0]]}
				questionCount={3}
				busy={false}
				onAdvance={vi.fn()}
			>
				<p>Atual</p>
			</PlayArrows>,
		);

		expect(screen.queryByRole("button", { name: "Anterior" })).toBeNull();
		expect(screen.getByRole("button", { name: "Próximo" })).toBeInTheDocument();
	});

	it("from a result, ← goes to the results before it", async () => {
		render(
			<PlayArrows
				screen={{ phase: "results", questionIndex: 1 }}
				history={history}
				questionCount={3}
				busy={false}
				onAdvance={vi.fn()}
			>
				<p>Atual</p>
			</PlayArrows>,
		);

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Anterior" }));

		expect(
			screen.getByRole("heading", { name: "Primeira" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Anterior" })).toBeNull();
	});

	it("at the end ← reviews every question from the last", async () => {
		render(
			<PlayArrows
				screen={{ phase: "finished", questionIndex: 1 }}
				history={history}
				questionCount={2}
				busy={false}
				onAdvance={vi.fn()}
			>
				<p>Fim</p>
			</PlayArrows>,
		);
		const user = userEvent.setup();

		expect(screen.queryByRole("button", { name: "Próximo" })).toBeNull();
		await user.click(screen.getByRole("button", { name: "Anterior" }));
		expect(
			screen.getByRole("heading", { name: "Segunda" }),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Anterior" }));
		expect(
			screen.getByRole("heading", { name: "Primeira" }),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Próximo" }));
		await user.click(screen.getByRole("button", { name: "Próximo" }));

		expect(screen.getByText("Fim")).toBeInTheDocument();
	});
});
