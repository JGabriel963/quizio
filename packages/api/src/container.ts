import {
	type AdmitAgentRequest,
	createAdmitAgentRequest,
} from "@quizio/core/agents/application/admit-agent-request";
import {
	type CreateAccessKey,
	createCreateAccessKey,
} from "@quizio/core/agents/application/create-access-key";
import {
	createDisconnectAgent,
	type DisconnectAgent,
} from "@quizio/core/agents/application/disconnect-agent";
import {
	createListAgentAccess,
	type ListAgentAccess,
} from "@quizio/core/agents/application/list-agent-access";
import type { AccessKeyRepository } from "@quizio/core/agents/application/ports/access-key-repository";
import type { AccessKeySecrets } from "@quizio/core/agents/application/ports/access-key-secrets";
import type { AgentConnectionStore } from "@quizio/core/agents/application/ports/agent-connection-store";
import type { AgentTokenVerifier } from "@quizio/core/agents/application/ports/agent-token-verifier";
import {
	createRevokeAccessKey,
	type RevokeAccessKey,
} from "@quizio/core/agents/application/revoke-access-key";
import {
	createRevokeAllAgentAccess,
	type RevokeAllAgentAccess,
} from "@quizio/core/agents/application/revoke-all-agent-access";
import type { AgentSettings } from "@quizio/core/agents/domain/agent-settings";
import {
	type AdvanceAssignmentPlay,
	createAdvanceAssignmentPlay,
} from "@quizio/core/game/application/advance-assignment-play";
import {
	type AdvanceGame,
	createAdvanceGame,
} from "@quizio/core/game/application/advance-game";
import {
	type AnswerAssignmentQuestion,
	createAnswerAssignmentQuestion,
} from "@quizio/core/game/application/answer-assignment-question";
import {
	type CloseAnswerReview,
	createCloseAnswerReview,
	createGetTypedAnswers,
	createOpenAnswerReview,
	type GetTypedAnswers,
	type OpenAnswerReview,
} from "@quizio/core/game/application/answer-review";
import {
	type ChangeAssignmentAvatar,
	createChangeAssignmentAvatar,
} from "@quizio/core/game/application/change-assignment-avatar";
import {
	type ChangeAssignmentDeadline,
	createChangeAssignmentDeadline,
} from "@quizio/core/game/application/change-assignment-deadline";
import {
	type ChangeAvatar,
	createChangeAvatar,
} from "@quizio/core/game/application/change-avatar";
import {
	type CreateAssignment,
	createCreateAssignment,
} from "@quizio/core/game/application/create-assignment";
import {
	createEndAssignment,
	type EndAssignment,
} from "@quizio/core/game/application/end-assignment";
import {
	createEndGame,
	type EndGame,
} from "@quizio/core/game/application/end-game";
import { createEndGamesOfQuiz } from "@quizio/core/game/application/end-games-of-quiz";
import {
	createFindGameByPin,
	type FindGameByPin,
} from "@quizio/core/game/application/find-game-by-pin";
import {
	createGetAssignmentCover,
	type GetAssignmentCover,
} from "@quizio/core/game/application/get-assignment-cover";
import {
	createGetAssignmentPlay,
	type GetAssignmentPlay,
} from "@quizio/core/game/application/get-assignment-play";
import {
	createGetAssignmentSetup,
	type GetAssignmentSetup,
} from "@quizio/core/game/application/get-assignment-setup";
import {
	createGetHostGame,
	type GetHostGame,
} from "@quizio/core/game/application/get-host-game";
import {
	createGetPlayerSession,
	type GetPlayerSession,
} from "@quizio/core/game/application/get-player-session";
import {
	createHostGame,
	type HostGame,
} from "@quizio/core/game/application/host-game";
import {
	createJoinAssignment,
	type JoinAssignment,
} from "@quizio/core/game/application/join-assignment";
import {
	createJoinGame,
	type JoinGame,
} from "@quizio/core/game/application/join-game";
import {
	createListOpenAssignments,
	type ListOpenAssignments,
} from "@quizio/core/game/application/list-open-assignments";
import type { AnswerRepository } from "@quizio/core/game/application/ports/answer-repository";
import type { AssignmentLandingQuery } from "@quizio/core/game/application/ports/assignment-landing-query";
import type { AssignmentPinGenerator } from "@quizio/core/game/application/ports/assignment-pin-generator";
import type { AssignmentPreferencesRepository } from "@quizio/core/game/application/ports/assignment-preferences-repository";
import type { GamePinGenerator } from "@quizio/core/game/application/ports/game-pin-generator";
import type { GameQuestionRepository } from "@quizio/core/game/application/ports/game-question-repository";
import type { GameRepository } from "@quizio/core/game/application/ports/game-repository";
import type { HostPreferencesRepository } from "@quizio/core/game/application/ports/host-preferences-repository";
import type { PlayableQuizQuery } from "@quizio/core/game/application/ports/playable-quiz-query";
import type { PlayerRepository } from "@quizio/core/game/application/ports/player-repository";
import type { ReviewResultsWriter } from "@quizio/core/game/application/ports/review-results-writer";
import {
	createRemovePlayer,
	type RemovePlayer,
} from "@quizio/core/game/application/remove-player";
import {
	createReviewTypedAnswers,
	type ReviewTypedAnswers,
} from "@quizio/core/game/application/review-typed-answers";
import {
	createSetGameLocked,
	type SetGameLocked,
} from "@quizio/core/game/application/set-game-locked";
import {
	createSetGameOptions,
	type SetGameOptions,
} from "@quizio/core/game/application/set-game-options";
import {
	createSignalHost,
	type SignalHost,
} from "@quizio/core/game/application/signal-host";
import {
	createStartAssignmentPlay,
	type StartAssignmentPlay,
} from "@quizio/core/game/application/start-assignment-play";
import {
	createStartGame,
	type StartGame,
} from "@quizio/core/game/application/start-game";
import {
	createSubmitAnswer,
	type SubmitAnswer,
} from "@quizio/core/game/application/submit-answer";
import {
	type AcceptGroupInvite,
	createAcceptGroupInvite,
} from "@quizio/core/groups/application/accept-group-invite";
import {
	type AssignInGroup,
	createAssignInGroup,
} from "@quizio/core/groups/application/assign-in-group";
import {
	type AssignToGroups,
	createAssignToGroups,
} from "@quizio/core/groups/application/assign-to-groups";
import {
	type CreateGroup,
	createCreateGroup,
} from "@quizio/core/groups/application/create-group";
import {
	type CreateGroupPost,
	createCreateGroupPost,
} from "@quizio/core/groups/application/create-group-post";
import {
	createDeleteGroup,
	type DeleteGroup,
} from "@quizio/core/groups/application/delete-group";
import {
	createDeleteGroupPost,
	type DeleteGroupPost,
} from "@quizio/core/groups/application/delete-group-post";
import {
	createDiscardGroupUpload,
	type DiscardGroupUpload,
} from "@quizio/core/groups/application/discard-group-upload";
import {
	createDismissGroupSetup,
	type DismissGroupSetup,
} from "@quizio/core/groups/application/dismiss-group-setup";
import {
	createGetGroup,
	type GetGroup,
} from "@quizio/core/groups/application/get-group";
import {
	createGetGroupInvitation,
	type GetGroupInvitation,
} from "@quizio/core/groups/application/get-group-invitation";
import {
	createGetGroupInvite,
	type GetGroupInvite,
} from "@quizio/core/groups/application/get-group-invite";
import {
	createGetGroupPost,
	type GetGroupPost,
} from "@quizio/core/groups/application/get-group-post";
import {
	createGetGroupSettings,
	type GetGroupSettings,
} from "@quizio/core/groups/application/get-group-settings";
import {
	createGetSharedQuiz,
	type GetSharedQuiz,
} from "@quizio/core/groups/application/get-shared-quiz";
import {
	createLeaveGroup,
	type LeaveGroup,
} from "@quizio/core/groups/application/leave-group";
import {
	createListAssignableGroups,
	type ListAssignableGroups,
} from "@quizio/core/groups/application/list-assignable-groups";
import {
	createListGroupAssignments,
	type ListGroupAssignments,
} from "@quizio/core/groups/application/list-group-assignments";
import {
	createListGroupFeed,
	type ListGroupFeed,
} from "@quizio/core/groups/application/list-group-feed";
import {
	createListGroupMembers,
	type ListGroupMembers,
} from "@quizio/core/groups/application/list-group-members";
import {
	createListGroups,
	type ListGroups,
} from "@quizio/core/groups/application/list-groups";
import {
	createListRecentGroups,
	type ListRecentGroups,
} from "@quizio/core/groups/application/list-recent-groups";
import {
	createListSharedQuizIds,
	type ListSharedQuizIds,
} from "@quizio/core/groups/application/list-shared-quiz-ids";
import {
	createListSharedQuizzes,
	type ListSharedQuizzes,
} from "@quizio/core/groups/application/list-shared-quizzes";
import { requireMembership } from "@quizio/core/groups/application/load-group";
import type { GroupAssignmentQuery } from "@quizio/core/groups/application/ports/group-assignments";
import type { GroupFeedQuery } from "@quizio/core/groups/application/ports/group-feed-query";
import type { GroupInbox } from "@quizio/core/groups/application/ports/group-inbox";
import type { GroupMemberRepository } from "@quizio/core/groups/application/ports/group-member-repository";
import type { GroupPostRepository } from "@quizio/core/groups/application/ports/group-post-repository";
import type { GroupReads } from "@quizio/core/groups/application/ports/group-reads";
import type { GroupRepository } from "@quizio/core/groups/application/ports/group-repository";
import type { GroupSharedQuizRepository } from "@quizio/core/groups/application/ports/group-shared-quiz-repository";
import type { GroupUploadRepository } from "@quizio/core/groups/application/ports/group-upload-repository";
import type { GroupVisitRepository } from "@quizio/core/groups/application/ports/group-visit-repository";
import type { InviteCodeGenerator } from "@quizio/core/groups/application/ports/invite-code-generator";
import type { SharedQuizReads } from "@quizio/core/groups/application/ports/shared-quiz-reads";
import {
	createRemoveGroupMember,
	type RemoveGroupMember,
} from "@quizio/core/groups/application/remove-group-member";
import {
	createRequestGroupUpload,
	type RequestGroupUpload,
} from "@quizio/core/groups/application/request-group-upload";
import {
	createResetGroupInvite,
	type ResetGroupInvite,
} from "@quizio/core/groups/application/reset-group-invite";
import {
	createSetGroupPermission,
	type SetGroupPermission,
} from "@quizio/core/groups/application/set-group-permission";
import {
	createSetPostLike,
	type SetPostLike,
} from "@quizio/core/groups/application/set-post-like";
import {
	createShareQuizzesInGroup,
	type ShareQuizzesInGroup,
} from "@quizio/core/groups/application/share-quizzes-in-group";
import {
	createUnshareQuiz,
	type UnshareQuiz,
} from "@quizio/core/groups/application/unshare-quiz";
import {
	createUpdateGroupDetails,
	type UpdateGroupDetails,
} from "@quizio/core/groups/application/update-group-details";
import {
	createVisitGroup,
	type VisitGroup,
} from "@quizio/core/groups/application/visit-group";
import { GROUP_PDF_MAX_BYTES } from "@quizio/core/groups/domain/group-file";
import {
	createDeleteAccount,
	type DeleteAccount,
} from "@quizio/core/identity/application/delete-account";
import {
	createGetAccount,
	type GetAccount,
} from "@quizio/core/identity/application/get-account";
import type { AccountClosure } from "@quizio/core/identity/application/ports/account-closure";
import type { AccountCredentials } from "@quizio/core/identity/application/ports/account-credentials";
import type { AccountDeletionFeedbackRepository } from "@quizio/core/identity/application/ports/account-deletion-feedback-repository";
import type { AccountRepository } from "@quizio/core/identity/application/ports/account-repository";
import type { ProfilePhotoRepository } from "@quizio/core/identity/application/ports/profile-photo-repository";
import {
	createRemoveProfilePhoto,
	type RemoveProfilePhoto,
} from "@quizio/core/identity/application/remove-profile-photo";
import {
	createRenameCreator,
	type RenameCreator,
} from "@quizio/core/identity/application/rename-creator";
import {
	createRequestProfilePhotoUpload,
	type RequestProfilePhotoUpload,
} from "@quizio/core/identity/application/request-profile-photo-upload";
import {
	createSetProfilePhoto,
	type SetProfilePhoto,
} from "@quizio/core/identity/application/set-profile-photo";
import {
	createGetCreatorProfile,
	type GetCreatorProfile,
} from "@quizio/core/library/application/get-creator-profile";
import {
	createGetHomeOverview,
	type GetHomeOverview,
} from "@quizio/core/library/application/get-home-overview";
import {
	createGetPublicQuiz,
	type GetPublicQuiz,
} from "@quizio/core/library/application/get-public-quiz";
import {
	createListLibrary,
	type ListLibrary,
} from "@quizio/core/library/application/list-library";
import type { CreatorProfileQuery } from "@quizio/core/library/application/ports/creator-profile-query";
import type { LibraryQuizQuery } from "@quizio/core/library/application/ports/library-quiz-query";
import {
	createDiscardSource,
	type DiscardSource,
} from "@quizio/core/media/application/discard-source";
import {
	createImportRemoteFile,
	type ImportRemoteFile,
} from "@quizio/core/media/application/import-remote-file";
import type {
	MediaUploadRepository,
	MediaUsage,
} from "@quizio/core/media/application/ports/media-upload-repository";
import type { RemoteFileUploads } from "@quizio/core/media/application/ports/remote-file-uploads";
import type { RemoteFiles } from "@quizio/core/media/application/ports/remote-files";
import type { SourceUploadRepository } from "@quizio/core/media/application/ports/source-upload-repository";
import {
	createRequestMediaUpload,
	type RequestMediaUpload,
} from "@quizio/core/media/application/request-media-upload";
import {
	createRequestSourceUpload,
	type RequestSourceUpload,
} from "@quizio/core/media/application/request-source-upload";
import { MAX_MEDIA_BYTES } from "@quizio/core/media/domain/media-policy";
import {
	createGetInboxSummary,
	type GetInboxSummary,
} from "@quizio/core/notifications/application/get-inbox-summary";
import {
	createListNotifications,
	type ListNotifications,
	type NotificationSettings,
} from "@quizio/core/notifications/application/list-notifications";
import {
	createMarkAllNotificationsRead,
	type MarkAllNotificationsRead,
} from "@quizio/core/notifications/application/mark-all-notifications-read";
import {
	createMarkInboxSeen,
	type MarkInboxSeen,
} from "@quizio/core/notifications/application/mark-inbox-seen";
import {
	createMarkNotificationRead,
	type MarkNotificationRead,
} from "@quizio/core/notifications/application/mark-notification-read";
import type { GroupNoticeRepository } from "@quizio/core/notifications/application/ports/group-notice-repository";
import {
	INBOX_CHANGED_EVENT,
	type InboxChannels,
} from "@quizio/core/notifications/application/ports/inbox-channels";
import type { NotificationInboxRepository } from "@quizio/core/notifications/application/ports/notification-inbox-repository";
import type { NotificationQuery } from "@quizio/core/notifications/application/ports/notification-query";
import {
	type AddGeneratedQuestions,
	createAddGeneratedQuestions,
} from "@quizio/core/quiz/application/add-generated-questions";
import {
	type AddQuestion,
	createAddQuestion,
} from "@quizio/core/quiz/application/add-question";
import {
	type AddQuestions,
	createAddQuestions,
} from "@quizio/core/quiz/application/add-questions";
import {
	type ApplyTimeLimitToAll,
	createApplyTimeLimitToAll,
} from "@quizio/core/quiz/application/apply-time-limit-to-all";
import {
	type CreateQuiz,
	createCreateQuiz,
} from "@quizio/core/quiz/application/create-quiz";
import {
	createDeleteQuestion,
	type DeleteQuestion,
} from "@quizio/core/quiz/application/delete-question";
import {
	createDeleteQuizPermanently,
	type DeleteQuizPermanently,
} from "@quizio/core/quiz/application/delete-quiz-permanently";
import {
	createDiscardQuizChanges,
	type DiscardQuizChanges,
} from "@quizio/core/quiz/application/discard-quiz-changes";
import {
	createDuplicateQuestion,
	type DuplicateQuestion,
} from "@quizio/core/quiz/application/duplicate-question";
import {
	createDuplicateQuiz,
	type DuplicateQuiz,
} from "@quizio/core/quiz/application/duplicate-quiz";
import {
	createDuplicateSharedQuiz,
	type DuplicateSharedQuiz,
} from "@quizio/core/quiz/application/duplicate-shared-quiz";
import {
	createEditQuestion,
	type EditQuestion,
} from "@quizio/core/quiz/application/edit-question";
import {
	createGenerateQuestions,
	type GenerateQuestions,
} from "@quizio/core/quiz/application/generate-questions";
import {
	type AssistantSettings,
	createGetAssistantStatus,
	type GetAssistantStatus,
} from "@quizio/core/quiz/application/get-assistant-status";
import {
	createGetQuizDetails,
	type GetQuizDetails,
} from "@quizio/core/quiz/application/get-quiz-details";
import {
	createGetQuizEditor,
	type GetQuizEditor,
} from "@quizio/core/quiz/application/get-quiz-editor";
import {
	createGetQuizPreview,
	type GetQuizPreview,
} from "@quizio/core/quiz/application/get-quiz-preview";
import {
	createMoveQuestion,
	type MoveQuestion,
} from "@quizio/core/quiz/application/move-question";
import {
	createMoveQuizToTrash,
	type MoveQuizToTrash,
} from "@quizio/core/quiz/application/move-quiz-to-trash";
import type { AssistantPreferencesRepository } from "@quizio/core/quiz/application/ports/assistant-preferences-repository";
import type { CustomThemeReads } from "@quizio/core/quiz/application/ports/custom-theme-reads";
import type { GenerationQuota } from "@quizio/core/quiz/application/ports/generation-quota";
import type { PdfPages } from "@quizio/core/quiz/application/ports/pdf-pages";
import type { QuestionGenerator } from "@quizio/core/quiz/application/ports/question-generator";
import type { QuestionRepository } from "@quizio/core/quiz/application/ports/question-repository";
import type { QuizRepository } from "@quizio/core/quiz/application/ports/quiz-repository";
import type { QuizVersionRepository } from "@quizio/core/quiz/application/ports/quiz-version-repository";
import {
	createPublishQuiz,
	type PublishQuiz,
} from "@quizio/core/quiz/application/publish-quiz";
import {
	createRenameQuiz,
	type RenameQuiz,
} from "@quizio/core/quiz/application/rename-quiz";
import {
	createRestoreQuiz,
	type RestoreQuiz,
} from "@quizio/core/quiz/application/restore-quiz";
import {
	createSetQuizTheme,
	type SetQuizTheme,
} from "@quizio/core/quiz/application/set-quiz-theme";
import {
	createSetQuizVisibility,
	type SetQuizVisibility,
} from "@quizio/core/quiz/application/set-quiz-visibility";
import {
	createUpdateQuestion,
	type UpdateQuestion,
} from "@quizio/core/quiz/application/update-question";
import {
	createUpdateQuizDetails,
	type UpdateQuizDetails,
} from "@quizio/core/quiz/application/update-quiz-details";
import {
	createDeleteReportsPermanently,
	type DeleteReportsPermanently,
} from "@quizio/core/reports/application/delete-reports-permanently";
import {
	createGetReport,
	type GetReport,
} from "@quizio/core/reports/application/get-report";
import {
	createGetReportParticipant,
	type GetReportParticipant,
} from "@quizio/core/reports/application/get-report-participant";
import {
	createGetReportQuestion,
	type GetReportQuestion,
} from "@quizio/core/reports/application/get-report-question";
import {
	createListReports,
	type ListReports,
} from "@quizio/core/reports/application/list-reports";
import {
	createMoveReportsToTrash,
	type MoveReportsToTrash,
} from "@quizio/core/reports/application/move-reports-to-trash";
import type { ReportGameQuery } from "@quizio/core/reports/application/ports/report-game-query";
import type { ReportReadGrants } from "@quizio/core/reports/application/ports/report-read-grants";
import type { ReportRepository } from "@quizio/core/reports/application/ports/report-repository";
import {
	createRenameReport,
	type RenameReport,
} from "@quizio/core/reports/application/rename-report";
import {
	createRestoreReports,
	type RestoreReports,
} from "@quizio/core/reports/application/restore-reports";
import type { AttemptLimiter } from "@quizio/core/shared/application/ports/attempt-limiter";
import type { Clock } from "@quizio/core/shared/application/ports/clock";
import type { IdGenerator } from "@quizio/core/shared/application/ports/id-generator";
import type { ObjectStorage } from "@quizio/core/shared/application/ports/object-storage";
import type { QuizShareGrants } from "@quizio/core/shared/application/ports/quiz-share-grants";
import type { RealtimePublisher } from "@quizio/core/shared/application/ports/realtime-publisher";
import type { Shuffler } from "@quizio/core/shared/application/ports/shuffler";
import {
	type CreateCustomTheme,
	createCreateCustomTheme,
} from "@quizio/core/themes/application/create-custom-theme";
import {
	createDeleteCustomTheme,
	type DeleteCustomTheme,
} from "@quizio/core/themes/application/delete-custom-theme";
import {
	createDiscardThemeUpload,
	type DiscardThemeUpload,
} from "@quizio/core/themes/application/discard-theme-upload";
import {
	createListCustomThemes,
	type ListCustomThemes,
} from "@quizio/core/themes/application/list-custom-themes";
import type { CustomThemeRepository } from "@quizio/core/themes/application/ports/custom-theme-repository";
import type { ThemeFileUsage } from "@quizio/core/themes/application/ports/theme-file-usage";
import type { ThemeUploadRepository } from "@quizio/core/themes/application/ports/theme-upload-repository";
import {
	createRequestThemeUpload,
	type RequestThemeUpload,
} from "@quizio/core/themes/application/request-theme-upload";
import {
	createUpdateCustomTheme,
	type UpdateCustomTheme,
} from "@quizio/core/themes/application/update-custom-theme";

/** Instance settings of the assignments (spec 029, RN-08). */
export interface AssignmentSettings {
	/** How far ahead a deadline may be. */
	maxDeadlineDays: number;
}

/** Public sign-in options the login screen needs to know about. */
export interface AuthSettings {
	signUpEnabled: boolean;
	googleEnabled: boolean;
}

/** Driven adapters and settings the application needs. Production wiring lives in composition-root.ts. */
export interface Adapters {
	storage: ObjectStorage;
	realtime: RealtimePublisher;
	ids: IdGenerator;
	clock: Clock;
	quizzes: QuizRepository;
	questions: QuestionRepository;
	versions: QuizVersionRepository;
	libraryQuizzes: LibraryQuizQuery;
	games: GameRepository;
	players: PlayerRepository;
	gameQuestions: GameQuestionRepository;
	answers: AnswerRepository;
	/** The review's stage write and regrades, together (spec 031). */
	reviewResults: ReviewResultsWriter;
	playableQuizzes: PlayableQuizQuery;
	preferences: HostPreferencesRepository;
	/** The live games as the reports read them (spec 015). */
	reportGames: ReportGameQuery;
	reports: ReportRepository;
	pins: GamePinGenerator;
	/** Eight-digit PINs of the assignments (spec 029). */
	assignmentPins: AssignmentPinGenerator;
	assignmentPreferences: AssignmentPreferencesRepository;
	assignmentLanding: AssignmentLandingQuery;
	assignmentSettings: AssignmentSettings;
	shuffler: Shuffler;
	attempts: AttemptLimiter;
	authSettings: AuthSettings;
	/** Null when the instance has no AI provider: the assistant is off (spec 027, RN-01). */
	questionGenerator: QuestionGenerator | null;
	pdfPages: PdfPages;
	generationQuota: GenerationQuota;
	assistantPreferences: AssistantPreferencesRepository;
	sourceUploads: SourceUploadRepository;
	/** Images and photos sent, swept when nothing used them (audit L4). */
	mediaUploads: MediaUploadRepository;
	mediaUsage: MediaUsage;
	assistantSettings: AssistantSettings;
	/** Groups and their members (spec 034). */
	groups: GroupRepository;
	groupMembers: GroupMemberRepository;
	groupVisits: GroupVisitRepository;
	/** The groups with the accounts' names and emails. */
	groupReads: GroupReads;
	inviteCodes: InviteCodeGenerator;
	/** The group's feed and the assignments it shows (spec 038). */
	groupPosts: GroupPostRepository;
	groupFeed: GroupFeedQuery;
	groupAssignmentQuery: GroupAssignmentQuery;
	/** The groups' files nobody posted yet (spec 036; ADR 0017). */
	groupUploads: GroupUploadRepository;
	/** Who else may read a report: a group's admin (spec 038, RN-20a). */
	reportReadGrants: ReportReadGrants;
	/** Quizzes shared with groups (spec 037; ADR 0018). */
	groupSharedQuizzes: GroupSharedQuizRepository;
	sharedQuizReads: SharedQuizReads;
	/** Who may use a quiz they do not own: a member of a group it is in, or anybody when it is public. */
	quizShareGrants: QuizShareGrants;
	/** The creator's account, password and photo (spec 039; ADR 0019). */
	accounts: AccountRepository;
	accountCredentials: AccountCredentials;
	profilePhotos: ProfilePhotoRepository;
	deletionFeedback: AccountDeletionFeedbackRepository;
	/** The profile and its public quizzes (spec 039). */
	creatorProfiles: CreatorProfileQuery;
	/** The bell (spec 040; ADR 0020): a reading of the groups, marks and notices. */
	notificationQuery: NotificationQuery;
	notificationInbox: NotificationInboxRepository;
	groupNotices: GroupNoticeRepository;
	inboxChannels: InboxChannels;
	notificationSettings: NotificationSettings;
	/** The creators' custom themes (spec 043; ADR 0022), also read by the quiz. */
	customThemes: CustomThemeRepository & CustomThemeReads;
	themeUploads: ThemeUploadRepository;
	/** Which theme files the games copied (RN-28). */
	themeFileUsage: ThemeFileUsage;
	/** AI agents (spec 044; ADR 0023): access keys, OAuth connections, limits. */
	accessKeys: AccessKeyRepository;
	accessKeySecrets: AccessKeySecrets;
	agentTokens: AgentTokenVerifier;
	agentConnections: AgentConnectionStore;
	agentSettings: AgentSettings;
	/** Where agents connect, `{public origin}/mcp`, shown in Agentes de IA (RN-13). */
	mcpServerUrl: string;
	/** Files an agent gives by link (spec 044, RN-24). */
	remoteFiles: RemoteFiles;
}

export interface Container extends Adapters {
	useCases: {
		requestMediaUpload: RequestMediaUpload;
		requestSourceUpload: RequestSourceUpload;
		discardSource: DiscardSource;
		getAssistantStatus: GetAssistantStatus;
		generateQuestions: GenerateQuestions;
		addGeneratedQuestions: AddGeneratedQuestions;
		createQuiz: CreateQuiz;
		getQuizDetails: GetQuizDetails;
		getQuizPreview: GetQuizPreview;
		updateQuizDetails: UpdateQuizDetails;
		duplicateQuiz: DuplicateQuiz;
		duplicateSharedQuiz: DuplicateSharedQuiz;
		moveQuizToTrash: MoveQuizToTrash;
		restoreQuiz: RestoreQuiz;
		deleteQuizPermanently: DeleteQuizPermanently;
		getQuizEditor: GetQuizEditor;
		renameQuiz: RenameQuiz;
		publishQuiz: PublishQuiz;
		discardQuizChanges: DiscardQuizChanges;
		addQuestion: AddQuestion;
		duplicateQuestion: DuplicateQuestion;
		moveQuestion: MoveQuestion;
		deleteQuestion: DeleteQuestion;
		updateQuestion: UpdateQuestion;
		applyTimeLimitToAll: ApplyTimeLimitToAll;
		listLibrary: ListLibrary;
		getHomeOverview: GetHomeOverview;
		hostGame: HostGame;
		getHostGame: GetHostGame;
		startGame: StartGame;
		advanceGame: AdvanceGame;
		signalHost: SignalHost;
		setGameLocked: SetGameLocked;
		setGameOptions: SetGameOptions;
		removePlayer: RemovePlayer;
		endGame: EndGame;
		findGameByPin: FindGameByPin;
		joinGame: JoinGame;
		changeAvatar: ChangeAvatar;
		getPlayerSession: GetPlayerSession;
		submitAnswer: SubmitAnswer;
		openAnswerReview: OpenAnswerReview;
		closeAnswerReview: CloseAnswerReview;
		getTypedAnswers: GetTypedAnswers;
		reviewTypedAnswers: ReviewTypedAnswers;
		getAssignmentSetup: GetAssignmentSetup;
		createAssignment: CreateAssignment;
		changeAssignmentDeadline: ChangeAssignmentDeadline;
		endAssignment: EndAssignment;
		getAssignmentCover: GetAssignmentCover;
		listOpenAssignments: ListOpenAssignments;
		joinAssignment: JoinAssignment;
		getAssignmentPlay: GetAssignmentPlay;
		startAssignmentPlay: StartAssignmentPlay;
		answerAssignmentQuestion: AnswerAssignmentQuestion;
		advanceAssignmentPlay: AdvanceAssignmentPlay;
		changeAssignmentAvatar: ChangeAssignmentAvatar;
		deleteReportsPermanently: DeleteReportsPermanently;
		getReport: GetReport;
		getReportParticipant: GetReportParticipant;
		getReportQuestion: GetReportQuestion;
		listReports: ListReports;
		moveReportsToTrash: MoveReportsToTrash;
		renameReport: RenameReport;
		restoreReports: RestoreReports;
		acceptGroupInvite: AcceptGroupInvite;
		createGroup: CreateGroup;
		deleteGroup: DeleteGroup;
		dismissGroupSetup: DismissGroupSetup;
		getGroup: GetGroup;
		getGroupInvitation: GetGroupInvitation;
		getGroupInvite: GetGroupInvite;
		leaveGroup: LeaveGroup;
		listGroupMembers: ListGroupMembers;
		listGroups: ListGroups;
		listRecentGroups: ListRecentGroups;
		removeGroupMember: RemoveGroupMember;
		resetGroupInvite: ResetGroupInvite;
		visitGroup: VisitGroup;
		assignInGroup: AssignInGroup;
		assignToGroups: AssignToGroups;
		deleteGroupPost: DeleteGroupPost;
		listAssignableGroups: ListAssignableGroups;
		listGroupAssignments: ListGroupAssignments;
		listGroupFeed: ListGroupFeed;
		setPostLike: SetPostLike;
		createGroupPost: CreateGroupPost;
		shareQuizzesInGroup: ShareQuizzesInGroup;
		unshareQuiz: UnshareQuiz;
		listSharedQuizzes: ListSharedQuizzes;
		listSharedQuizIds: ListSharedQuizIds;
		getSharedQuiz: GetSharedQuiz;
		requestGroupUpload: RequestGroupUpload;
		discardGroupUpload: DiscardGroupUpload;
		getGroupSettings: GetGroupSettings;
		setGroupPermission: SetGroupPermission;
		updateGroupDetails: UpdateGroupDetails;
		getAccount: GetAccount;
		requestProfilePhotoUpload: RequestProfilePhotoUpload;
		setProfilePhoto: SetProfilePhoto;
		removeProfilePhoto: RemoveProfilePhoto;
		deleteAccount: DeleteAccount;
		getCreatorProfile: GetCreatorProfile;
		getPublicQuiz: GetPublicQuiz;
		setQuizVisibility: SetQuizVisibility;
		setQuizTheme: SetQuizTheme;
		listCustomThemes: ListCustomThemes;
		createCustomTheme: CreateCustomTheme;
		updateCustomTheme: UpdateCustomTheme;
		deleteCustomTheme: DeleteCustomTheme;
		requestThemeUpload: RequestThemeUpload;
		discardThemeUpload: DiscardThemeUpload;
		getGroupPost: GetGroupPost;
		getInboxSummary: GetInboxSummary;
		listNotifications: ListNotifications;
		markInboxSeen: MarkInboxSeen;
		markNotificationRead: MarkNotificationRead;
		markAllNotificationsRead: MarkAllNotificationsRead;
		admitAgentRequest: AdmitAgentRequest;
		listAgentAccess: ListAgentAccess;
		createAccessKey: CreateAccessKey;
		revokeAccessKey: RevokeAccessKey;
		disconnectAgent: DisconnectAgent;
		revokeAllAgentAccess: RevokeAllAgentAccess;
		addQuestions: AddQuestions;
		editQuestion: EditQuestion;
		importRemoteFile: ImportRemoteFile;
		renameCreator: RenameCreator;
	};
}

/**
 * Wires use cases to adapters. Pure function with no env access, so tests
 * build a container from in-memory fakes and exercise real routers.
 */
export function createContainer(baseAdapters: Adapters): Container {
	// The groups tell people they have news through their own port (spec 040;
	// ADR 0020): a hint on each one's inbox channel, and a notice when the
	// group's rows are about to go.
	const groupInbox: GroupInbox = {
		signal: (userIds) =>
			baseAdapters.realtime.publishMany(
				userIds.map((userId) => ({
					channel: baseAdapters.inboxChannels.channelOf(userId),
					event: INBOX_CHANGED_EVENT,
					payload: {},
				})),
			),
		noticeRemoved: async (userId, groupName, at) => {
			await baseAdapters.groupNotices.add([
				{
					id: baseAdapters.ids.generate(),
					userId,
					kind: "removed",
					groupName,
					at,
				},
			]);
			await groupInbox.signal([userId]);
		},
		noticeDeleted: async (userIds, groupId, groupName, at) => {
			await baseAdapters.groupNotices.add(
				userIds.map((userId) => ({
					// Deleting twice adds nothing (plan 040, risks).
					id: `deleted:${groupId}:${userId}`,
					userId,
					kind: "groupDeleted" as const,
					groupName,
					at,
				})),
			);
			await groupInbox.signal(userIds);
		},
	};
	const adapters = { ...baseAdapters, groupInbox };
	// The quiz context reaches the live games through its own port (spec 008, RN-34).
	const endGamesOfQuiz = createEndGamesOfQuiz(adapters);
	const assignmentDeps = {
		...adapters,
		maxDeadlineDays: adapters.assignmentSettings.maxDeadlineDays,
	};
	const createAssignment = createCreateAssignment(assignmentDeps);
	// The themes context names its ports for itself (spec 043).
	const themeDeps = {
		...adapters,
		themes: adapters.customThemes,
		fileUsage: adapters.themeFileUsage,
	};
	// The groups reach "Criar uma tarefa" through their own port (spec 038).
	const groupDeps = {
		...adapters,
		groupAssignments: {
			create: async (input: Parameters<typeof createAssignment>[0]) => {
				const { gameId } = await createAssignment(input);
				return { gameId };
			},
		},
	};
	const quizGames = {
		// The open ones end, assignments too (spec 029, RN-42); the ones that
		// never started go with the quiz, and the ones that started stay, as
		// reports (spec 015, RN-05).
		endGamesOfDeletedQuiz: async (quizId: string) => {
			await endGamesOfQuiz({ quizId, reason: "quizDeleted" });
			await adapters.games.deleteUnstartedByQuiz(quizId);
		},
	};

	const deleteGroup = createDeleteGroup(adapters);
	// Deleting an account reaches the games and the groups through its port
	// (spec 039, RN-39; ADR 0019).
	const accountClosure: AccountClosure = {
		endGames: async (userId) => {
			for (const quizId of await adapters.quizzes.listIdsByOwner(userId)) {
				await quizGames.endGamesOfDeletedQuiz(quizId);
			}
			for (const game of await adapters.games.listUnendedByOwner(userId)) {
				await endGamesOfQuiz({
					quizId: game.quizId,
					reason: "host",
					ownerId: userId,
				});
			}
		},
		deleteManagedGroups: async (userId) => {
			for (const group of await adapters.groupReads.listForUser(userId)) {
				if (group.role === "admin") {
					await deleteGroup({ userId, groupId: group.id });
				}
			}
		},
		groupFileKeys: async (userId) => [
			...(await adapters.groupPosts.fileKeysByAuthor(userId)),
			...(await adapters.groupUploads.uploadKeysOfUser(userId)),
		],
	};

	const requestMediaUpload = createRequestMediaUpload(adapters);
	const requestGroupUpload = createRequestGroupUpload(adapters);
	const requestThemeUpload = createRequestThemeUpload(themeDeps);
	// A file an agent gives by link goes through the upload its target already
	// has, with that upload's policy and pending row (spec 044, RN-24).
	const remoteFileUploads: RemoteFileUploads = {
		// Only a group's file needs a check of its own: the person's media and
		// themes are theirs (audit L4).
		authorize: async ({ ownerId, target }) => {
			if (target.kind === "groupFile") {
				await requireMembership(groupDeps, {
					userId: ownerId,
					groupId: target.groupId,
				});
			}
		},
		maxBytesFor: (target) =>
			target.kind === "groupFile" ? GROUP_PDF_MAX_BYTES : MAX_MEDIA_BYTES,
		keyFor: async ({ ownerId, target, contentType, sizeBytes, fileName }) => {
			switch (target.kind) {
				case "media":
					return requestMediaUpload({ ownerId, contentType, sizeBytes });
				case "groupFile": {
					const upload = await requestGroupUpload({
						userId: ownerId,
						groupId: target.groupId,
						type: contentType === "application/pdf" ? "pdf" : "image",
						contentType,
						sizeBytes,
						fileName,
					});
					return {
						key: upload.key,
						contentDisposition: upload.headers["content-disposition"],
					};
				}
				case "themeFile":
					return requestThemeUpload({ ownerId, contentType, sizeBytes });
			}
		},
	};

	return {
		...adapters,
		useCases: {
			requestMediaUpload,
			requestSourceUpload: createRequestSourceUpload(adapters),
			discardSource: createDiscardSource(adapters),
			getAssistantStatus: createGetAssistantStatus(adapters),
			generateQuestions: createGenerateQuestions(adapters),
			addGeneratedQuestions: createAddGeneratedQuestions(adapters),
			createQuiz: createCreateQuiz(adapters),
			getQuizDetails: createGetQuizDetails(adapters),
			getQuizPreview: createGetQuizPreview(adapters),
			updateQuizDetails: createUpdateQuizDetails(adapters),
			duplicateQuiz: createDuplicateQuiz(adapters),
			duplicateSharedQuiz: createDuplicateSharedQuiz({
				...adapters,
				quizVersions: adapters.versions,
			}),
			moveQuizToTrash: createMoveQuizToTrash(adapters),
			restoreQuiz: createRestoreQuiz(adapters),
			deleteQuizPermanently: createDeleteQuizPermanently({
				...adapters,
				quizGames,
			}),
			getQuizEditor: createGetQuizEditor(adapters),
			renameQuiz: createRenameQuiz(adapters),
			publishQuiz: createPublishQuiz(adapters),
			discardQuizChanges: createDiscardQuizChanges(adapters),
			addQuestion: createAddQuestion(adapters),
			duplicateQuestion: createDuplicateQuestion(adapters),
			moveQuestion: createMoveQuestion(adapters),
			deleteQuestion: createDeleteQuestion(adapters),
			updateQuestion: createUpdateQuestion(adapters),
			applyTimeLimitToAll: createApplyTimeLimitToAll(adapters),
			listLibrary: createListLibrary(adapters),
			getHomeOverview: createGetHomeOverview(adapters),
			hostGame: createHostGame(adapters),
			getHostGame: createGetHostGame(adapters),
			startGame: createStartGame(adapters),
			advanceGame: createAdvanceGame(adapters),
			signalHost: createSignalHost(adapters),
			setGameLocked: createSetGameLocked(adapters),
			setGameOptions: createSetGameOptions(adapters),
			removePlayer: createRemovePlayer(adapters),
			endGame: createEndGame(adapters),
			findGameByPin: createFindGameByPin(adapters),
			joinGame: createJoinGame(adapters),
			changeAvatar: createChangeAvatar(adapters),
			getPlayerSession: createGetPlayerSession(adapters),
			submitAnswer: createSubmitAnswer(adapters),
			openAnswerReview: createOpenAnswerReview(adapters),
			closeAnswerReview: createCloseAnswerReview(adapters),
			getTypedAnswers: createGetTypedAnswers(adapters),
			reviewTypedAnswers: createReviewTypedAnswers(adapters),
			getAssignmentSetup: createGetAssignmentSetup(assignmentDeps),
			createAssignment,
			changeAssignmentDeadline: createChangeAssignmentDeadline(assignmentDeps),
			endAssignment: createEndAssignment(adapters),
			getAssignmentCover: createGetAssignmentCover(adapters),
			listOpenAssignments: createListOpenAssignments(adapters),
			joinAssignment: createJoinAssignment(adapters),
			getAssignmentPlay: createGetAssignmentPlay(adapters),
			startAssignmentPlay: createStartAssignmentPlay(adapters),
			answerAssignmentQuestion: createAnswerAssignmentQuestion(adapters),
			advanceAssignmentPlay: createAdvanceAssignmentPlay(adapters),
			changeAssignmentAvatar: createChangeAssignmentAvatar(adapters),
			deleteReportsPermanently: createDeleteReportsPermanently(adapters),
			getReport: createGetReport(adapters),
			getReportParticipant: createGetReportParticipant(adapters),
			getReportQuestion: createGetReportQuestion(adapters),
			listReports: createListReports(adapters),
			moveReportsToTrash: createMoveReportsToTrash(adapters),
			renameReport: createRenameReport(adapters),
			restoreReports: createRestoreReports(adapters),
			acceptGroupInvite: createAcceptGroupInvite(adapters),
			createGroup: createCreateGroup(adapters),
			deleteGroup,
			dismissGroupSetup: createDismissGroupSetup(adapters),
			getGroup: createGetGroup(adapters),
			getGroupInvitation: createGetGroupInvitation(adapters),
			getGroupInvite: createGetGroupInvite(adapters),
			leaveGroup: createLeaveGroup(adapters),
			listGroupMembers: createListGroupMembers(adapters),
			listGroups: createListGroups(adapters),
			listRecentGroups: createListRecentGroups(adapters),
			removeGroupMember: createRemoveGroupMember(adapters),
			resetGroupInvite: createResetGroupInvite(adapters),
			visitGroup: createVisitGroup(adapters),
			assignInGroup: createAssignInGroup(groupDeps),
			assignToGroups: createAssignToGroups(groupDeps),
			deleteGroupPost: createDeleteGroupPost(groupDeps),
			listAssignableGroups: createListAssignableGroups(groupDeps),
			listGroupAssignments: createListGroupAssignments(groupDeps),
			listGroupFeed: createListGroupFeed(groupDeps),
			setPostLike: createSetPostLike(groupDeps),
			createGroupPost: createCreateGroupPost(adapters),
			shareQuizzesInGroup: createShareQuizzesInGroup(adapters),
			unshareQuiz: createUnshareQuiz(adapters),
			listSharedQuizzes: createListSharedQuizzes(adapters),
			listSharedQuizIds: createListSharedQuizIds(adapters),
			getSharedQuiz: createGetSharedQuiz(adapters),
			requestGroupUpload,
			discardGroupUpload: createDiscardGroupUpload(adapters),
			getGroupSettings: createGetGroupSettings(adapters),
			setGroupPermission: createSetGroupPermission(adapters),
			updateGroupDetails: createUpdateGroupDetails(adapters),
			getAccount: createGetAccount({
				...adapters,
				credentials: adapters.accountCredentials,
			}),
			requestProfilePhotoUpload: createRequestProfilePhotoUpload(adapters),
			setProfilePhoto: createSetProfilePhoto(adapters),
			removeProfilePhoto: createRemoveProfilePhoto(adapters),
			deleteAccount: createDeleteAccount({
				...adapters,
				credentials: adapters.accountCredentials,
				accountClosure,
			}),
			getCreatorProfile: createGetCreatorProfile(adapters),
			getPublicQuiz: createGetPublicQuiz(adapters),
			setQuizVisibility: createSetQuizVisibility(adapters),
			setQuizTheme: createSetQuizTheme(adapters),
			listCustomThemes: createListCustomThemes(themeDeps),
			createCustomTheme: createCreateCustomTheme(themeDeps),
			updateCustomTheme: createUpdateCustomTheme(themeDeps),
			deleteCustomTheme: createDeleteCustomTheme(themeDeps),
			requestThemeUpload,
			discardThemeUpload: createDiscardThemeUpload(themeDeps),
			getGroupPost: createGetGroupPost(groupDeps),
			getInboxSummary: createGetInboxSummary(adapters),
			listNotifications: createListNotifications(adapters),
			markInboxSeen: createMarkInboxSeen(adapters),
			markNotificationRead: createMarkNotificationRead(adapters),
			markAllNotificationsRead: createMarkAllNotificationsRead(adapters),
			admitAgentRequest: createAdmitAgentRequest(adapters),
			listAgentAccess: createListAgentAccess(adapters),
			createAccessKey: createCreateAccessKey(adapters),
			revokeAccessKey: createRevokeAccessKey(adapters),
			disconnectAgent: createDisconnectAgent(adapters),
			revokeAllAgentAccess: createRevokeAllAgentAccess(adapters),
			addQuestions: createAddQuestions(adapters),
			editQuestion: createEditQuestion(adapters),
			importRemoteFile: createImportRemoteFile({
				...adapters,
				uploads: remoteFileUploads,
			}),
			renameCreator: createRenameCreator(adapters),
		},
	};
}
