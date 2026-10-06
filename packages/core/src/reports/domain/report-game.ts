import type { Correctness } from "../../game/domain/answer";
import type { GameChoice } from "../../game/domain/game-question";
import type { QuestionType } from "../../quiz/domain/question";
import type { ReportHeader } from "./report";

/** A player who was in the game when it started, or joined later (spec 015, RN-08). */
export interface ReportParticipant {
	id: string;
	nickname: string;
	/** The first question they could answer (spec 012, RN-13). */
	firstQuestionIndex: number;
	joinedAt: Date;
}

/** A question as the game showed it: its order and its answers (RN-04). */
export interface ReportQuestion {
	/** 0-based position in the game. */
	index: number;
	type: QuestionType;
	text: string;
	imageKey: string | null;
	choices: GameChoice[];
}

export interface ReportAnswer {
	questionIndex: number;
	playerId: string;
	choiceIds: string[];
	correctness: Correctness;
	points: number;
	responseTimeMs: number;
}

/** A whole game as its report reads it. */
export interface ReportGame {
	header: ReportHeader;
	/** In order of arrival; players removed in the lobby are not here. */
	participants: ReportParticipant[];
	/** Only the played ones, in the order they were played (RN-09). */
	questions: ReportQuestion[];
	/** Only of played questions. */
	answers: ReportAnswer[];
}
