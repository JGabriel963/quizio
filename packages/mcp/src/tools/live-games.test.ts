import { GAME_EVENTS, gameChannel } from "@quizio/core/game/domain/game-events";
import { describe, expect, it } from "vitest";

import { connectTestClient } from "../testing/connect-test-client";
import { publishedQuiz } from "../testing/fixtures";

describe("live game tools (spec 044, RN-26)", () => {
	it("host_live_game gives the PIN, the join and host screen links and the reminder to open the host screen", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const quizId = await publishedQuiz(ana);

		const hosted = await ana.ok("host_live_game", { quizId });

		const game = hosted.game as { gameId: string; pin: string };
		expect(game).toMatchObject({
			quizId,
			title: "Capitais",
			status: "lobby",
			locked: false,
			players: [],
		});
		expect(game.pin).toMatch(/^\d{6}$/);
		expect(hosted.links).toEqual({
			hostScreen: `https://quizio.test/host/${game.gameId}`,
			join: `https://quizio.test/join/${game.pin}`,
		});
		expect(String(hosted.reminder)).toContain("host screen");
	});

	it("a quiz never published cannot be hosted", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const { quiz } = (await ana.ok("create_quiz", { title: "Rascunho" })) as {
			quiz: { id: string };
		};

		const refused = await ana.call("host_live_game", { quizId: quiz.id });

		expect(refused.isError).toBe(true);
		expect(refused.data.error).toMatchObject({
			code: "GAME.QUIZ_NOT_PLAYABLE",
		});
	});

	it("update_live_game turns autoplay on and locks, publishing the events; remove_player removes in the lobby", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const quizId = await publishedQuiz(ana);
		const { gameId } = (await ana.ok("host_live_game", { quizId })).game as {
			gameId: string;
		};
		const { joinGame } = ana.api.container.useCases;
		const bia = await joinGame({ gameId, nickname: "Bia" });
		await joinGame({ gameId, nickname: "Caio" });
		ana.api.realtime.messages.length = 0;

		const updated = await ana.ok("update_live_game", {
			gameId,
			locked: true,
			options: { autoplay: true },
		});

		expect(updated.game).toMatchObject({
			locked: true,
			options: { autoplay: true },
		});
		expect(
			ana.api.realtime
				.messagesOn(gameChannel(gameId))
				.map((message) => message.event),
		).toEqual([GAME_EVENTS.lockChanged, GAME_EVENTS.optionsChanged]);

		const removed = await ana.ok("remove_player", {
			gameId,
			playerId: bia.playerId,
		});

		expect(
			(removed.game as { players: { nickname: string }[] }).players.map(
				(player) => player.nickname,
			),
		).toEqual(["Caio"]);
	});

	it("end_live_game publishes game-ended", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const quizId = await publishedQuiz(ana);
		const { gameId } = (await ana.ok("host_live_game", { quizId })).game as {
			gameId: string;
		};

		const ended = await ana.ok("end_live_game", { gameId });

		expect(ended.game).toMatchObject({ status: "ended" });
		expect(
			ana.api.realtime
				.messagesOn(gameChannel(gameId))
				.map((message) => message.event),
		).toContain(GAME_EVENTS.gameEnded);
		expect(
			(await ana.call("get_live_game", { gameId })).data.game,
		).toMatchObject({ status: "ended" });
	});

	it("hosting a shared or public quiz works", async () => {
		const bruno = await connectTestClient({ userId: "bruno" });
		const ana = await connectTestClient({ api: bruno.api, userId: "ana" });
		const quizId = await publishedQuiz(bruno);
		await bruno.ok("update_quiz", { quizId, visibility: "public" });

		const hosted = await ana.ok("host_live_game", { quizId });

		expect(hosted.game).toMatchObject({ quizId, status: "lobby" });
		// Someone else's game is not found, as a missing one (CA-15).
		const { gameId } = hosted.game as { gameId: string };
		expect(
			(await bruno.call("get_live_game", { gameId })).data.error,
		).toMatchObject({ code: "GAME.NOT_FOUND" });
	});
});
