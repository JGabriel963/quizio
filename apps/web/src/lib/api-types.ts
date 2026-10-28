import type { AppRouter } from "@quizio/api/routers/index";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

/** A quiz as listed in the library (dates arrive as ISO strings over HTTP). */
export type LibraryItemView = RouterOutputs["library"]["list"][number];

/**
 * A quiz's details, as every quiz procedure returns them; the page's own
 * query also brings the custom theme's look (spec 043).
 */
export type QuizDetailsData = Omit<RouterOutputs["quiz"]["get"], "customTheme">;

/** The dashboard overview: newest quizzes plus the total outside the trash. */
export type HomeOverviewView = RouterOutputs["library"]["home"];
export type HomeQuizView = HomeOverviewView["quizzes"][number];

/** A theme of "Seus temas" (spec 043). */
export type CustomThemeData = RouterOutputs["theme"]["list"][number];

/** Everything the editor opens with (spec 003). */
export type QuizEditorData = RouterOutputs["quiz"]["editor"];
export type QuestionData = QuizEditorData["questions"][number];

/** The creation assistant (spec 027): its status and what a creation returns. */
export type AssistantStatusData = RouterOutputs["quiz"]["assistant"]["status"];
export type GenerationResultData =
	RouterOutputs["quiz"]["assistant"]["generate"];
export type GeneratedQuestionData = GenerationResultData["questions"][number];

/** The host's screen: the lobby and the game in progress (specs 008, 009). */
export type HostGameData = RouterOutputs["game"]["view"];
export type LobbyPlayerData = HostGameData["players"][number];
/** What the settings panel shows and changes (spec 012). */
export type GameOptionsData = HostGameData["options"];
export type HostStageData = NonNullable<HostGameData["stage"]>;
export type HostQuestionData = NonNullable<HostStageData["question"]>;
export type HostImageData = NonNullable<HostQuestionData["image"]>;
/** A tag of the results of a type answer (spec 031, RN-23). */
export type TypedAnswerTagData = NonNullable<
	HostStageData["typedAnswers"]
>["tags"][number];
/** Every typed answer of a question, for the host's review (spec 031, RN-27). */
export type TypedAnswerGroupData =
	RouterOutputs["game"]["review"]["answers"]["groups"][number];
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

/** The reports' list and one of its lines (spec 015). */
export type ReportListData = RouterOutputs["report"]["list"];
export type ReportListItemData = ReportListData["items"][number];
/** A report open: header, summary, participants and questions. */
export type ReportData = RouterOutputs["report"]["get"];
export type ReportHeaderData = ReportData["header"];
export type ReportSummaryData = ReportData["summary"];
export type ReportParticipantData = ReportData["participants"][number];
export type ReportQuestionData = ReportData["questions"][number];
/** What a participant did, question by question. */
export type ParticipantDetailData = RouterOutputs["report"]["participant"];
export type AnswerResultData =
	ParticipantDetailData["answers"][number]["result"];
/** How the group answered one question. */
export type QuestionDetailData = RouterOutputs["report"]["question"];

/** The first screens of an assignment's link (spec 030, RN-01). */
export type AssignmentCoverData = RouterOutputs["game"]["assignment"]["cover"];
export type OpenAssignmentCoverData = Extract<
	AssignmentCoverData,
	{ status: "open" }
>;
/** Everything a participant's device draws (spec 030). */
export type AssignmentPlayData = RouterOutputs["game"]["assignment"]["play"];
export type AssignmentPlayScreenData = AssignmentPlayData["screen"];
export type PlayQuestionData = Extract<
	AssignmentPlayScreenData,
	{ phase: "answering" }
>["question"];
export type QuestionResultData = AssignmentPlayData["history"][number];
export type AssignmentScoreboardData = Extract<
	AssignmentPlayScreenData,
	{ phase: "scoreboard" }
>["scoreboard"];

/** Groups (spec 034): the lists, a group's page, its members and the invite screen. */
export type GroupListItemData = RouterOutputs["group"]["list"]["items"][number];
export type RecentGroupData = RouterOutputs["group"]["recent"]["items"][number];
export type GroupViewData = RouterOutputs["group"]["get"];
export type GroupMemberData =
	RouterOutputs["group"]["members"]["items"][number];
export type GroupInvitationData = RouterOutputs["group"]["invite"]["find"];
/** "Configurações do grupo" (spec 035). */
export type GroupSettingsData = RouterOutputs["group"]["settings"]["get"];
/** The group's feed and Atribuições tab (spec 038). */
export type GroupPostData = RouterOutputs["group"]["feed"]["posts"][number];
export type GroupAssignmentData =
	RouterOutputs["group"]["assignments"]["items"][number];
export type AssignableGroupData =
	RouterOutputs["group"]["assignableGroups"]["groups"][number];
/** A shared quiz's card, row and page (spec 037). */
export type SharedQuizCardData =
	RouterOutputs["group"]["shared"]["list"]["items"][number];
export type SharedQuizPageData = RouterOutputs["group"]["shared"]["get"];

/** A creator's profile and a public quiz seen from it (spec 039). */
export type CreatorProfileData = RouterOutputs["account"]["profile"];
export type PublicQuizPageData = RouterOutputs["account"]["publicQuiz"];

/** The bell and its panel (spec 040). */
export type InboxSummaryData = RouterOutputs["notification"]["summary"];
export type NotificationData =
	RouterOutputs["notification"]["list"]["items"][number];
/** A post on its own page (spec 040, RN-19). */
export type GroupPostPageData = RouterOutputs["group"]["posts"]["get"];

/** Agentes de IA (spec 044): the server's address, the connections and the keys. */
export type AgentAccessData = RouterOutputs["agent"]["access"];
export type AgentConnectionData = AgentAccessData["connections"][number];
export type AccessKeyData = AgentAccessData["keys"][number];
