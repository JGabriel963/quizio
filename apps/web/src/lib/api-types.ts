import type { AppRouter } from "@quizio/api/routers/index";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

/** A quiz as listed in the library (dates arrive as ISO strings over HTTP). */
export type LibraryItemView = RouterOutputs["library"]["list"][number];

/** A quiz as shown on its details page. */
export type QuizDetailsData = RouterOutputs["quiz"]["get"];

/** The dashboard overview: newest quizzes plus the total outside the trash. */
export type HomeOverviewView = RouterOutputs["library"]["home"];
export type HomeQuizView = HomeOverviewView["quizzes"][number];

/** Everything the editor opens with (spec 003). */
export type QuizEditorData = RouterOutputs["quiz"]["editor"];
export type QuestionData = QuizEditorData["questions"][number];

/** The host's screen: the lobby and the game in progress (specs 008, 009). */
export type HostGameData = RouterOutputs["game"]["view"];
export type LobbyPlayerData = HostGameData["players"][number];
/** What the settings panel shows and changes (spec 012). */
export type GameOptionsData = HostGameData["options"];
export type HostStageData = NonNullable<HostGameData["stage"]>;
export type HostQuestionData = NonNullable<HostStageData["question"]>;
export type ScoreboardEntryData = NonNullable<
	HostStageData["scoreboard"]
>[number];
/** The end of a finished game: the final standings and the podium's reveal (spec 011). */
export type HostFinalData = NonNullable<HostGameData["final"]>;
export type FinalStandingData = HostFinalData["standings"][number];

/** What a player's device should be showing (specs 008, 009). */
export type PlayerSessionData = RouterOutputs["game"]["join"]["session"];
export type PlayerStageData = NonNullable<PlayerSessionData["stage"]>;
export type PlayerQuestionData = NonNullable<PlayerStageData["question"]>;
/** What a question left the player with: result, points, streak and place (spec 010). */
export type PlayerOutcomeData = NonNullable<PlayerStageData["outcome"]>;
export type PlayerResultData = PlayerOutcomeData["result"];
/** How the game ended for this player (spec 011). */
export type PlayerFinalData = NonNullable<PlayerSessionData["final"]>;
