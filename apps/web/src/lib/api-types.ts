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

/** The host's lobby (spec 008). */
export type HostLobbyData = RouterOutputs["game"]["lobby"];
export type LobbyPlayerData = HostLobbyData["players"][number];

/** What a player's device should be showing (spec 008). */
export type PlayerSessionData = RouterOutputs["game"]["join"]["session"];
